/**
 * Onboarding Event Handlers
 *
 * Processes onboarding events and updates workflow state.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { OnboardingEventType, OnboardingEvent } from './events'
import { getStepsForOrg, calculateProgress, ONBOARDING_STEPS } from './events'
import { sendOnboardingReminder, sendAdminNotification } from '@/lib/email/resend'

/**
 * Record an onboarding event
 */
export async function recordOnboardingEvent(
  event: Omit<OnboardingEvent, 'timestamp'>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  try {
    // Insert the event
    const { error: eventError } = await supabase
      .from('onboarding_events')
      .insert({
        event_type: event.type,
        user_id: event.userId,
        org_id: event.orgId,
        metadata: event.metadata || {},
      })

    if (eventError) {
      console.error('Error recording onboarding event:', eventError)
      return { success: false, error: eventError.message }
    }

    // Update onboarding workflow progress
    await updateOnboardingProgress(event.orgId)

    return { success: true }
  } catch (error) {
    console.error('Error in recordOnboardingEvent:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Update onboarding workflow progress based on completed events
 */
export async function updateOnboardingProgress(
  orgId: string
): Promise<void> {
  const supabase = createAdminClient()

  try {
    // Get the onboarding workflow
    const { data: workflow } = await supabase
      .from('onboarding_workflows')
      .select('*')
      .eq('org_id', orgId)
      .single()

    if (!workflow) {
      console.error('No onboarding workflow found for org:', orgId)
      return
    }

    // Get all completed events for this org
    const { data: events } = await supabase
      .from('onboarding_events')
      .select('event_type')
      .eq('org_id', orgId)

    const completedEvents = (events || []).map(
      (e) => e.event_type as OnboardingEventType
    )

    // Get enabled modules for this org
    const { data: modules } = await supabase.rpc('get_org_enabled_modules', {
      p_org_id: orgId,
    })

    const enabledModules = (modules || []).map((m: { module_key: string }) => m.module_key)

    // Calculate progress
    const steps = getStepsForOrg(enabledModules, true) // Assume admin for now
    const progress = calculateProgress(steps, completedEvents)

    // Update workflow
    const updates: Record<string, unknown> = {
      current_step: progress.currentStep?.key || null,
      completed_steps: completedEvents,
    }

    // Mark as started if this is the first event
    if (!workflow.started_at && completedEvents.length > 0) {
      updates.started_at = new Date().toISOString()
      updates.status = 'in_progress'
    }

    // Mark as completed if all required steps done
    if (progress.isComplete && workflow.status !== 'completed') {
      updates.status = 'completed'
      updates.completed_at = new Date().toISOString()

      // Notify admins
      await notifyOnboardingComplete(orgId)
    }

    await supabase
      .from('onboarding_workflows')
      .update(updates)
      .eq('id', workflow.id)

    // Update org status
    if (progress.isComplete) {
      await supabase
        .from('organizations')
        .update({ onboarding_status: 'completed' })
        .eq('id', orgId)
    } else if (workflow.status === 'pending') {
      await supabase
        .from('organizations')
        .update({ onboarding_status: 'in_progress' })
        .eq('id', orgId)
    }
  } catch (error) {
    console.error('Error updating onboarding progress:', error)
  }
}

/**
 * Get onboarding status for an organization
 */
export async function getOnboardingStatus(orgId: string): Promise<{
  workflow: {
    id: string
    status: string
    startedAt: string | null
    completedAt: string | null
  } | null
  steps: Array<{
    id: string
    key: string
    title: string
    description: string
    status: 'completed' | 'current' | 'pending'
    isOptional: boolean
  }>
  progress: {
    completedSteps: number
    totalSteps: number
    percentComplete: number
    isComplete: boolean
  }
}> {
  const supabase = await createClient()

  // Get workflow
  const { data: workflow } = await supabase
    .from('onboarding_workflows')
    .select('*')
    .eq('org_id', orgId)
    .single()

  // Get completed events
  const { data: events } = await supabase
    .from('onboarding_events')
    .select('event_type')
    .eq('org_id', orgId)

  const completedEvents = (events || []).map(
    (e) => e.event_type as OnboardingEventType
  )

  // Get enabled modules
  const { data: modules } = await supabase.rpc('get_org_enabled_modules', {
    p_org_id: orgId,
  })

  const enabledModules = (modules || []).map((m: { module_key: string }) => m.module_key)

  // Calculate steps and progress
  const steps = getStepsForOrg(enabledModules, true)
  const progress = calculateProgress(steps, completedEvents)

  // Build step statuses
  const stepsWithStatus = steps.map((step) => {
    const isComplete = step.requiredEvents.every((event) =>
      completedEvents.includes(event)
    )

    let status: 'completed' | 'current' | 'pending' = 'pending'
    if (isComplete) {
      status = 'completed'
    } else if (step === progress.currentStep) {
      status = 'current'
    }

    return {
      id: step.id,
      key: step.key,
      title: step.title,
      description: step.description,
      status,
      isOptional: step.isOptional,
    }
  })

  return {
    workflow: workflow
      ? {
          id: workflow.id,
          status: workflow.status,
          startedAt: workflow.started_at,
          completedAt: workflow.completed_at,
        }
      : null,
    steps: stepsWithStatus,
    progress: {
      completedSteps: progress.completedSteps,
      totalSteps: progress.totalSteps,
      percentComplete: progress.percentComplete,
      isComplete: progress.isComplete,
    },
  }
}

/**
 * Send onboarding reminder to user
 */
export async function sendOnboardingReminderEmail(
  orgId: string,
  userId: string
): Promise<void> {
  const supabase = createAdminClient()

  // Get user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('email, full_name')
    .eq('id', userId)
    .single()

  if (!profile) return

  // Get org
  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .single()

  if (!org) return

  // Get status
  const status = await getOnboardingStatus(orgId)

  if (status.progress.isComplete) return

  const currentStep = status.steps.find((s) => s.status === 'current')

  await sendOnboardingReminder({
    to: profile.email,
    name: profile.full_name || profile.email,
    orgName: org.name,
    currentStep: currentStep?.title || 'Continue setup',
    completedSteps: status.progress.completedSteps,
    totalSteps: status.progress.totalSteps,
    dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding`,
  })
}

/**
 * Notify admins when onboarding completes
 */
async function notifyOnboardingComplete(orgId: string): Promise<void> {
  const supabase = createAdminClient()

  // Get org details
  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .single()

  if (!org) return

  // Get super admin emails
  const { data: admins } = await supabase
    .from('user_profiles')
    .select('email')
    .eq('is_super_admin', true)

  if (!admins || admins.length === 0) return

  await sendAdminNotification({
    to: admins.map((a) => a.email),
    subject: `${org.name} completed onboarding`,
    message: `The organization "${org.name}" has completed their onboarding process and is now fully set up.`,
    actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/organizations/${orgId}`,
    actionLabel: 'View Organization',
  })
}

/**
 * Skip onboarding for an organization
 */
export async function skipOnboarding(orgId: string): Promise<void> {
  const supabase = await createClient()

  // Record skip event
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    await recordOnboardingEvent({
      type: 'onboarding_skipped',
      userId: user.id,
      orgId,
    })
  }

  // Update workflow
  await supabase
    .from('onboarding_workflows')
    .update({
      status: 'skipped',
      completed_at: new Date().toISOString(),
    })
    .eq('org_id', orgId)

  // Update org
  await supabase
    .from('organizations')
    .update({ onboarding_status: 'completed' })
    .eq('id', orgId)
}
