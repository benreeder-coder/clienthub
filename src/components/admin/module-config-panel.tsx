'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getModuleIcon } from '@/lib/utils/icons'
import { cn } from '@/lib/utils'
import {
  Eye,
  EyeOff,
  Lock,
  ChevronDown,
  RotateCcw,
  Check,
} from 'lucide-react'

type ModuleState = 'enabled' | 'locked' | 'hidden'

interface ModuleStateInfo {
  key: string
  name: string
  icon: string
  defaultState: ModuleState
  effectiveState: ModuleState
  hasOverride: boolean
  overrideId?: string
}

interface ModuleConfigPanelProps {
  orgId: string
  moduleStates: ModuleStateInfo[]
}

const stateConfig: Record<ModuleState, { label: string; icon: React.ElementType; color: string }> = {
  enabled: {
    label: 'Enabled',
    icon: Eye,
    color: 'text-cyber-emerald border-cyber-emerald/30 bg-cyber-emerald/10',
  },
  locked: {
    label: 'Locked',
    icon: Lock,
    color: 'text-cyber-amber border-cyber-amber/30 bg-cyber-amber/10',
  },
  hidden: {
    label: 'Hidden',
    icon: EyeOff,
    color: 'text-muted-foreground border-muted bg-muted/10',
  },
}

export function ModuleConfigPanel({ orgId, moduleStates }: ModuleConfigPanelProps) {
  const [states, setStates] = useState(moduleStates)
  const [saving, setSaving] = useState<string | null>(null)

  const handleStateChange = async (moduleKey: string, newState: ModuleState) => {
    setSaving(moduleKey)

    // Optimistic update
    setStates((prev) =>
      prev.map((m) =>
        m.key === moduleKey
          ? { ...m, effectiveState: newState, hasOverride: newState !== m.defaultState }
          : m
      )
    )

    // TODO: Call server action to save
    await new Promise((resolve) => setTimeout(resolve, 500))

    setSaving(null)
  }

  const handleResetToDefault = async (moduleKey: string, defaultState: ModuleState) => {
    setSaving(moduleKey)

    setStates((prev) =>
      prev.map((m) =>
        m.key === moduleKey
          ? { ...m, effectiveState: defaultState, hasOverride: false }
          : m
      )
    )

    // TODO: Call server action to remove override
    await new Promise((resolve) => setTimeout(resolve, 500))

    setSaving(null)
  }

  return (
    <div className="space-y-2">
      {states.map((module) => {
        const Icon = getModuleIcon(module.icon)
        const stateInfo = stateConfig[module.effectiveState]
        const StateIcon = stateInfo.icon
        const isSaving = saving === module.key

        return (
          <div
            key={module.key}
            className={cn(
              'flex items-center justify-between p-3 rounded-lg border transition-all',
              module.effectiveState === 'enabled'
                ? 'border-border/50 bg-card/50'
                : module.effectiveState === 'locked'
                ? 'border-cyber-amber/20 bg-cyber-amber/5'
                : 'border-border/30 bg-muted/20'
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'p-2 rounded-md',
                  module.effectiveState === 'enabled'
                    ? 'bg-primary/10 text-primary'
                    : module.effectiveState === 'locked'
                    ? 'bg-cyber-amber/10 text-cyber-amber'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className={cn(
                  'font-medium',
                  module.effectiveState === 'hidden' && 'text-muted-foreground'
                )}>
                  {module.name}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Default: {stateConfig[module.defaultState].label}</span>
                  {module.hasOverride && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
                      Override
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {module.hasOverride && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-muted-foreground hover:text-foreground"
                  onClick={() => handleResetToDefault(module.key, module.defaultState)}
                  disabled={isSaving}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      'h-8 gap-2 min-w-[120px] justify-between',
                      stateInfo.color
                    )}
                    disabled={isSaving}
                  >
                    <div className="flex items-center gap-1.5">
                      <StateIcon className="h-3.5 w-3.5" />
                      <span>{stateInfo.label}</span>
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[140px]">
                  {(Object.keys(stateConfig) as ModuleState[]).map((state) => {
                    const config = stateConfig[state]
                    const ConfigIcon = config.icon
                    const isSelected = module.effectiveState === state

                    return (
                      <DropdownMenuItem
                        key={state}
                        onClick={() => handleStateChange(module.key, state)}
                        className="gap-2"
                      >
                        <ConfigIcon className={cn('h-4 w-4', isSelected && 'text-primary')} />
                        <span>{config.label}</span>
                        {isSelected && <Check className="h-4 w-4 ml-auto text-primary" />}
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )
      })}

      <div className="pt-4 text-xs text-muted-foreground">
        <p><strong>Enabled:</strong> Module is fully accessible to the client</p>
        <p><strong>Locked:</strong> Visible in sidebar with lock icon, shows upgrade prompt</p>
        <p><strong>Hidden:</strong> Completely invisible to the client</p>
      </div>
    </div>
  )
}
