/**
 * Onboarding Event System
 *
 * Event-driven onboarding that adapts based on:
 * - Enabled modules for the organization
 * - Template configuration
 * - User role
 */

export type OnboardingEventType =
  // Account setup
  | 'profile_completed'
  | 'avatar_uploaded'
  | 'notification_preferences_set'
  // Workspace setup
  | 'first_project_created'
  | 'first_task_created'
  | 'first_document_uploaded'
  // Team setup
  | 'team_member_invited'
  | 'team_member_joined'
  // Integrations
  | 'integration_connected'
  // Module-specific
  | 'workflows_explored'
  | 'outreach_campaign_created'
  | 'analytics_dashboard_viewed'
  // Completion
  | 'onboarding_skipped'
  | 'onboarding_completed'

export interface OnboardingEvent {
  type: OnboardingEventType
  userId: string
  orgId: string
  metadata?: Record<string, unknown>
  timestamp: Date
}

export interface OnboardingStep {
  id: string
  key: string
  title: string
  description: string
  module?: string // Required module for this step
  requiredEvents: OnboardingEventType[]
  order: number
  isOptional: boolean
}

/**
 * All possible onboarding steps
 * Steps are filtered based on enabled modules
 */
export const ONBOARDING_STEPS: OnboardingStep[] = [
  // Account Setup
  {
    id: 'profile',
    key: 'profile',
    title: 'Complete Your Profile',
    description: 'Add your name and profile picture',
    requiredEvents: ['profile_completed'],
    order: 1,
    isOptional: false,
  },
  // Projects (if module enabled)
  {
    id: 'first_project',
    key: 'first_project',
    title: 'Create Your First Project',
    description: 'Set up a project to organize your work',
    module: 'projects',
    requiredEvents: ['first_project_created'],
    order: 2,
    isOptional: false,
  },
  // Tasks (if module enabled)
  {
    id: 'first_task',
    key: 'first_task',
    title: 'Add Your First Task',
    description: 'Break down work into manageable tasks',
    module: 'tasks',
    requiredEvents: ['first_task_created'],
    order: 3,
    isOptional: false,
  },
  // Documents (if module enabled)
  {
    id: 'first_document',
    key: 'first_document',
    title: 'Upload a Document',
    description: 'Store important files in your workspace',
    module: 'documents',
    requiredEvents: ['first_document_uploaded'],
    order: 4,
    isOptional: true,
  },
  // Team (org_admin only)
  {
    id: 'invite_team',
    key: 'invite_team',
    title: 'Invite Your Team',
    description: 'Add team members to collaborate',
    requiredEvents: ['team_member_invited'],
    order: 5,
    isOptional: true,
  },
  // Workflows (if module enabled)
  {
    id: 'explore_workflows',
    key: 'explore_workflows',
    title: 'Explore Workflows',
    description: 'Learn how to automate your processes',
    module: 'workflows',
    requiredEvents: ['workflows_explored'],
    order: 6,
    isOptional: true,
  },
  // Outreach (if module enabled)
  {
    id: 'first_campaign',
    key: 'first_campaign',
    title: 'Create an Outreach Campaign',
    description: 'Start your first outreach campaign',
    module: 'outreach',
    requiredEvents: ['outreach_campaign_created'],
    order: 7,
    isOptional: true,
  },
  // Analytics (if module enabled)
  {
    id: 'view_analytics',
    key: 'view_analytics',
    title: 'View Analytics',
    description: 'Explore your performance metrics',
    module: 'analytics',
    requiredEvents: ['analytics_dashboard_viewed'],
    order: 8,
    isOptional: true,
  },
]

/**
 * Get steps for a specific organization based on enabled modules
 */
export function getStepsForOrg(
  enabledModules: string[],
  isAdmin: boolean = false
): OnboardingStep[] {
  return ONBOARDING_STEPS.filter((step) => {
    // Filter out module-specific steps if module not enabled
    if (step.module && !enabledModules.includes(step.module)) {
      return false
    }

    // invite_team is only for admins
    if (step.key === 'invite_team' && !isAdmin) {
      return false
    }

    return true
  }).sort((a, b) => a.order - b.order)
}

/**
 * Calculate onboarding progress
 */
export function calculateProgress(
  steps: OnboardingStep[],
  completedEvents: OnboardingEventType[]
): {
  completedSteps: number
  totalSteps: number
  requiredCompleted: number
  requiredTotal: number
  percentComplete: number
  isComplete: boolean
  currentStep: OnboardingStep | null
  nextStep: OnboardingStep | null
} {
  let completedSteps = 0
  let requiredCompleted = 0
  let currentStep: OnboardingStep | null = null
  let nextStep: OnboardingStep | null = null

  const requiredSteps = steps.filter((s) => !s.isOptional)
  const requiredTotal = requiredSteps.length

  for (const step of steps) {
    const isStepComplete = step.requiredEvents.every((event) =>
      completedEvents.includes(event)
    )

    if (isStepComplete) {
      completedSteps++
      if (!step.isOptional) {
        requiredCompleted++
      }
    } else if (!currentStep) {
      currentStep = step
    } else if (!nextStep && step !== currentStep) {
      nextStep = step
    }
  }

  const isComplete = requiredCompleted >= requiredTotal
  const percentComplete = Math.round((requiredCompleted / requiredTotal) * 100)

  return {
    completedSteps,
    totalSteps: steps.length,
    requiredCompleted,
    requiredTotal,
    percentComplete,
    isComplete,
    currentStep,
    nextStep,
  }
}

/**
 * Get step completion status
 */
export function getStepStatus(
  step: OnboardingStep,
  completedEvents: OnboardingEventType[]
): 'completed' | 'current' | 'pending' | 'skipped' {
  const isComplete = step.requiredEvents.every((event) =>
    completedEvents.includes(event)
  )

  if (isComplete) {
    return 'completed'
  }

  // Check if any previous required steps are incomplete
  // If so, this step is pending
  // (This would need the full steps list to determine properly)

  return 'pending'
}
