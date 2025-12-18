import { NextRequest, NextResponse } from 'next/server'
import { createPandaDocClient, getTemplateForPackage } from '@/lib/integrations/pandadoc'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWelcomeEmail } from '@/lib/email/resend'

/**
 * PandaDoc Webhook Handler
 *
 * Processes webhook events from PandaDoc:
 * 1. Verifies webhook signature
 * 2. Handles document completion events
 * 3. Extracts package/tier from document fields
 * 4. Creates organization and user
 * 5. Assigns appropriate template
 * 6. Triggers onboarding flow
 * 7. Sends welcome email
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-pandadoc-signature') || ''

    // Initialize PandaDoc client
    const pandadoc = createPandaDocClient()

    // Verify signature
    if (!pandadoc.verifyWebhookSignature(rawBody, signature)) {
      console.error('Invalid PandaDoc webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Parse payload
    const payload = pandadoc.parseWebhookPayload(rawBody)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    console.log('PandaDoc webhook received:', payload.event, payload.data.id)

    // Only process completed documents
    if (!pandadoc.isDocumentCompleted(payload)) {
      return NextResponse.json({ status: 'ignored', reason: 'Not a completion event' })
    }

    const documentId = payload.data.id

    // Get document details and fields
    const [document, fields] = await Promise.all([
      pandadoc.getDocument(documentId),
      pandadoc.getDocumentFields(documentId),
    ])

    if (!document) {
      console.error('Could not fetch document:', documentId)
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Extract package info from fields
    const packageInfo = pandadoc.extractPackageInfo(fields)

    console.log('Extracted package info:', packageInfo)

    // Get recipient email (signer)
    const signer = document.recipients?.find((r) => r.role === 'signer' && r.has_completed)
    const clientEmail = packageInfo.clientEmail || signer?.email
    const clientName = packageInfo.clientName ||
      (signer ? `${signer.first_name || ''} ${signer.last_name || ''}`.trim() : null)

    if (!clientEmail) {
      console.error('No client email found in document')
      return NextResponse.json({ error: 'No client email found' }, { status: 400 })
    }

    // Get company name for org
    const companyName = packageInfo.companyName || clientName || clientEmail.split('@')[0]
    const slug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    // Get template based on package
    const templateName = packageInfo.packageName
      ? getTemplateForPackage(packageInfo.packageName)
      : 'standard-client-portal'

    // Initialize Supabase admin client
    const supabase = createAdminClient()

    // Check if org already exists
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existingOrg) {
      console.log('Organization already exists:', slug)
      return NextResponse.json({
        status: 'exists',
        orgId: existingOrg.id,
      })
    }

    // Get template ID
    const { data: template } = await supabase
      .from('workspace_templates')
      .select('id')
      .eq('name', templateName)
      .single()

    if (!template) {
      // Fall back to first active template
      const { data: defaultTemplate } = await supabase
        .from('workspace_templates')
        .select('id')
        .eq('is_active', true)
        .limit(1)
        .single()

      if (!defaultTemplate) {
        console.error('No active template found')
        return NextResponse.json({ error: 'No template available' }, { status: 500 })
      }
    }

    const templateId = template?.id

    // Create organization
    const { data: newOrg, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: companyName,
        slug,
        settings: {
          pandadoc_document_id: documentId,
          package: packageInfo.packageName,
          tier: packageInfo.tierLevel,
        },
        onboarding_status: 'pending',
      })
      .select()
      .single()

    if (orgError || !newOrg) {
      console.error('Error creating organization:', orgError)
      return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 })
    }

    console.log('Created organization:', newOrg.id)

    // Assign template to organization
    if (templateId) {
      await supabase
        .from('org_template_assignments')
        .insert({
          org_id: newOrg.id,
          template_id: templateId,
          assigned_by: null, // System assigned
        })
    }

    // Check if user already exists
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', clientEmail)
      .single()

    let userId: string

    if (existingProfile) {
      // User exists, add them to org
      userId = existingProfile.id
    } else {
      // Create new user via Supabase Auth
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: clientEmail,
        email_confirm: true,
        user_metadata: {
          full_name: clientName,
        },
      })

      if (authError || !authUser.user) {
        console.error('Error creating user:', authError)
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
      }

      userId = authUser.user.id

      // Create user profile
      await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          email: clientEmail,
          full_name: clientName,
        })

      console.log('Created user:', userId)
    }

    // Add user as org admin
    await supabase
      .from('org_memberships')
      .insert({
        user_id: userId,
        org_id: newOrg.id,
        role: 'org_admin',
      })

    // Create onboarding workflow
    await supabase
      .from('onboarding_workflows')
      .insert({
        org_id: newOrg.id,
        status: 'pending',
        started_at: null,
        completed_at: null,
      })

    // Log the event
    await supabase
      .from('audit_logs')
      .insert({
        action: 'org_created_from_contract',
        entity_type: 'organization',
        entity_id: newOrg.id,
        org_id: newOrg.id,
        metadata: {
          pandadoc_document_id: documentId,
          package: packageInfo.packageName,
          tier: packageInfo.tierLevel,
          client_email: clientEmail,
        },
      })

    // Send welcome email
    try {
      await sendWelcomeEmail({
        to: clientEmail,
        name: clientName || clientEmail,
        orgName: companyName,
        loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
      })
      console.log('Welcome email sent to:', clientEmail)
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError)
      // Don't fail the webhook for email errors
    }

    return NextResponse.json({
      status: 'success',
      orgId: newOrg.id,
      userId,
      template: templateName,
    })
  } catch (error) {
    console.error('PandaDoc webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Verify endpoint is active
export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'PandaDoc webhook' })
}
