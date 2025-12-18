import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/guards'
import { getOnboardingStatus } from '@/lib/onboarding/handlers'
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard'

export const metadata: Metadata = {
  title: 'Get Started',
  description: 'Complete your workspace setup',
}

export default async function OnboardingPage() {
  const user = await requireAuth()

  // Get org from user's membership
  const orgId = user.memberships?.[0]?.org_id
  if (!orgId) {
    redirect('/login')
  }

  const orgName = user.memberships?.[0]?.organizations?.name || 'Your Workspace'

  // Get onboarding status
  const status = await getOnboardingStatus(orgId)

  // If already complete, redirect to dashboard
  if (status.progress.isComplete) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 -mt-16">
      <OnboardingWizard
        orgId={orgId}
        orgName={orgName}
        userId={user.id}
        userName={user.profile?.full_name || user.email || 'there'}
        steps={status.steps}
        progress={status.progress}
      />
    </div>
  )
}
