'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Check,
  Circle,
  ChevronRight,
  Sparkles,
  User,
  FolderKanban,
  CheckSquare,
  FileText,
  Users,
  Workflow,
  Mail,
  BarChart3,
  ArrowRight,
  SkipForward,
} from 'lucide-react'

interface OnboardingStep {
  id: string
  key: string
  title: string
  description: string
  status: 'completed' | 'current' | 'pending'
  isOptional: boolean
}

interface OnboardingWizardProps {
  orgId: string
  orgName: string
  userId: string
  userName: string
  steps: OnboardingStep[]
  progress: {
    completedSteps: number
    totalSteps: number
    percentComplete: number
    isComplete: boolean
  }
}

const stepIcons: Record<string, React.ElementType> = {
  profile: User,
  first_project: FolderKanban,
  first_task: CheckSquare,
  first_document: FileText,
  invite_team: Users,
  explore_workflows: Workflow,
  first_campaign: Mail,
  view_analytics: BarChart3,
}

export function OnboardingWizard({
  orgId,
  orgName,
  userId,
  userName,
  steps,
  progress,
}: OnboardingWizardProps) {
  const router = useRouter()
  const [isSkipping, setIsSkipping] = useState(false)

  const currentStep = steps.find((s) => s.status === 'current')

  const handleStepClick = (step: OnboardingStep) => {
    if (step.status === 'completed') return

    // Navigate to appropriate page based on step
    const stepRoutes: Record<string, string> = {
      profile: '/settings',
      first_project: '/projects',
      first_task: '/tasks',
      first_document: '/documents',
      invite_team: '/settings/team',
      explore_workflows: '/workflows',
      first_campaign: '/outreach',
      view_analytics: '/analytics',
    }

    const route = stepRoutes[step.key]
    if (route) {
      router.push(route)
    }
  }

  const handleSkip = async () => {
    setIsSkipping(true)
    try {
      const response = await fetch('/api/onboarding/skip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId }),
      })

      if (response.ok) {
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Error skipping onboarding:', error)
    } finally {
      setIsSkipping(false)
    }
  }

  return (
    <div className="w-full max-w-2xl space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyber-blue to-cyber-cyan">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight">
            Welcome, {userName}!
          </h1>
          <p className="text-muted-foreground mt-2">
            Let's set up your {orgName} workspace
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Setup progress</span>
          <span className="font-medium">{progress.percentComplete}% complete</span>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyber-blue to-cyber-cyan transition-all duration-500"
            style={{ width: `${progress.percentComplete}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <Card>
        <CardContent className="p-0 divide-y divide-border">
          {steps.map((step, index) => {
            const Icon = stepIcons[step.key] || Circle
            const isCompleted = step.status === 'completed'
            const isCurrent = step.status === 'current'

            return (
              <button
                key={step.id}
                onClick={() => handleStepClick(step)}
                disabled={isCompleted}
                className={cn(
                  'w-full flex items-center gap-4 p-4 text-left transition-colors',
                  isCurrent && 'bg-primary/5',
                  !isCompleted && 'hover:bg-accent/50 cursor-pointer',
                  isCompleted && 'opacity-60 cursor-default'
                )}
              >
                {/* Step indicator */}
                <div
                  className={cn(
                    'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors',
                    isCompleted
                      ? 'bg-cyber-emerald/20 text-cyber-emerald'
                      : isCurrent
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className={cn(
                        'font-medium',
                        isCompleted && 'line-through'
                      )}
                    >
                      {step.title}
                    </p>
                    {step.isOptional && (
                      <Badge variant="outline" className="text-xs">
                        Optional
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {step.description}
                  </p>
                </div>

                {/* Action */}
                {!isCompleted && (
                  <ChevronRight
                    className={cn(
                      'flex-shrink-0 h-5 w-5',
                      isCurrent ? 'text-primary' : 'text-muted-foreground'
                    )}
                  />
                )}
              </button>
            )
          })}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {currentStep && (
          <Button
            size="lg"
            className="gap-2"
            onClick={() => handleStepClick(currentStep)}
          >
            Continue: {currentStep.title}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="lg"
          className="gap-2 text-muted-foreground"
          onClick={handleSkip}
          disabled={isSkipping}
        >
          <SkipForward className="h-4 w-4" />
          Skip for now
        </Button>
      </div>

      {/* Help text */}
      <p className="text-center text-sm text-muted-foreground">
        You can always complete these steps later from your dashboard.
      </p>
    </div>
  )
}
