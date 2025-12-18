'use client'

import { Lock, ArrowUpRight, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GlassCard, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getModuleDefinition } from '@/lib/modules/registry'

interface LockedModuleOverlayProps {
  moduleKey: string
  onRequestAccess?: () => void
}

const moduleFeatures: Record<string, string[]> = {
  workflows: [
    'Create automated workflows',
    'Connect with n8n and other automation tools',
    'Set up triggers and actions',
    'Monitor workflow runs',
  ],
  outreach: [
    'Manage email campaigns',
    'Track campaign performance',
    'A/B testing capabilities',
    'Contact list management',
  ],
  analytics: [
    'Custom dashboards',
    'Performance reports',
    'Export data',
    'Real-time insights',
  ],
}

export function LockedModuleOverlay({ moduleKey, onRequestAccess }: LockedModuleOverlayProps) {
  const module = getModuleDefinition(moduleKey)
  const features = moduleFeatures[moduleKey] || [
    'Enhanced functionality',
    'Premium features',
    'Priority support',
  ]

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8">
      <GlassCard className="max-w-lg text-center">
        <CardHeader className="pb-2">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-cyber-blue/20 to-cyber-cyan/20 border border-border/50">
            <Lock className="h-10 w-10 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl font-display">
            {module?.displayName || 'Module'} is Locked
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            {module?.description || 'This module is not available on your current plan.'}
          </p>

          {/* Feature list */}
          <div className="text-left space-y-3 bg-background/50 rounded-lg p-4 border border-border/50">
            <p className="text-sm font-medium text-foreground">
              Unlock these features:
            </p>
            <ul className="space-y-2">
              {features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-1.5 w-1.5 rounded-full bg-cyber-cyan" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="neon"
              className="gap-2"
              onClick={onRequestAccess}
            >
              <MessageSquare className="h-4 w-4" />
              Request Access
            </Button>
            <Button variant="outline" className="gap-2" asChild>
              <a href="mailto:support@btb.ai">
                <ArrowUpRight className="h-4 w-4" />
                Contact Us
              </a>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Your request will be reviewed by our team
          </p>
        </CardContent>
      </GlassCard>
    </div>
  )
}
