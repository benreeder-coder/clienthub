'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { recordOnboardingEvent, getOnboardingStatus } from '@/lib/onboarding/handlers'
import type { OnboardingEventType } from '@/lib/onboarding/events'

/**
 * Record an onboarding event from client actions
 */
export async function recordEvent(
  orgId: string,
  eventType: OnboardingEventType,
  metadata?: Record<string, unknown>
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  // Verify user belongs to org
  const { data: membership } = await supabase
    .from('org_memberships')
    .select('id')
    .eq('user_id', user.id)
    .eq('org_id', orgId)
    .single()

  if (!membership) {
    return { error: 'Forbidden', code: 'FORBIDDEN' }
  }

  const result = await recordOnboardingEvent({
    type: eventType,
    userId: user.id,
    orgId,
    metadata,
  })

  if (!result.success) {
    return { error: result.error, code: 'DATABASE_ERROR' }
  }

  revalidatePath('/onboarding')
  revalidatePath('/dashboard')

  return { success: true }
}

/**
 * Mark profile as completed
 */
export async function completeProfileStep(orgId: string) {
  return recordEvent(orgId, 'profile_completed')
}

/**
 * Mark avatar as uploaded
 */
export async function markAvatarUploaded(orgId: string) {
  return recordEvent(orgId, 'avatar_uploaded')
}

/**
 * Mark first project as created
 */
export async function markFirstProjectCreated(orgId: string, projectId: string) {
  return recordEvent(orgId, 'first_project_created', { projectId })
}

/**
 * Mark first task as created
 */
export async function markFirstTaskCreated(orgId: string, taskId: string) {
  return recordEvent(orgId, 'first_task_created', { taskId })
}

/**
 * Mark first document as uploaded
 */
export async function markFirstDocumentUploaded(orgId: string, documentId: string) {
  return recordEvent(orgId, 'first_document_uploaded', { documentId })
}

/**
 * Mark team member as invited
 */
export async function markTeamMemberInvited(orgId: string, invitedEmail: string) {
  return recordEvent(orgId, 'team_member_invited', { invitedEmail })
}

/**
 * Mark workflows as explored
 */
export async function markWorkflowsExplored(orgId: string) {
  return recordEvent(orgId, 'workflows_explored')
}

/**
 * Mark outreach campaign as created
 */
export async function markCampaignCreated(orgId: string, campaignId: string) {
  return recordEvent(orgId, 'outreach_campaign_created', { campaignId })
}

/**
 * Mark analytics as viewed
 */
export async function markAnalyticsViewed(orgId: string) {
  return recordEvent(orgId, 'analytics_dashboard_viewed')
}

/**
 * Get current onboarding status
 */
export async function fetchOnboardingStatus(orgId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED', data: null }
  }

  // Verify user belongs to org
  const { data: membership } = await supabase
    .from('org_memberships')
    .select('id')
    .eq('user_id', user.id)
    .eq('org_id', orgId)
    .single()

  if (!membership) {
    return { error: 'Forbidden', code: 'FORBIDDEN', data: null }
  }

  const status = await getOnboardingStatus(orgId)

  return { success: true, data: status }
}
