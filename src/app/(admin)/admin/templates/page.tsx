import { Metadata } from 'next'
import { requireSuperAdmin } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  LayoutTemplate,
  Plus,
  Building2,
  Blocks,
  Edit,
  Copy,
  Trash2,
  Check,
  Eye,
  EyeOff,
  Lock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { MODULE_REGISTRY } from '@/lib/modules/registry'
import { getModuleIcon } from '@/lib/utils/icons'

export const metadata: Metadata = {
  title: 'Templates | Admin',
  description: 'Manage workspace templates',
}

type ModuleState = 'enabled' | 'locked' | 'hidden'

const stateIcons: Record<ModuleState, React.ElementType> = {
  enabled: Eye,
  locked: Lock,
  hidden: EyeOff,
}

const stateColors: Record<ModuleState, string> = {
  enabled: 'text-cyber-emerald',
  locked: 'text-cyber-amber',
  hidden: 'text-muted-foreground',
}

export default async function AdminTemplatesPage() {
  await requireSuperAdmin()
  const supabase = await createClient()

  // Fetch all templates with their modules and usage counts
  const { data: templates, error } = await supabase
    .from('workspace_templates')
    .select(`
      *,
      template_modules (
        module_key,
        default_state,
        default_config
      ),
      org_template_assignments (count)
    `)
    .order('name')

  if (error) {
    console.error('Error fetching templates:', error)
  }

  const templateList = templates || []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight">
            Workspace Templates
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure default module access for client workspaces
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Template
        </Button>
      </div>

      {/* Template explanation */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <LayoutTemplate className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">How Templates Work</p>
              <p className="text-sm text-muted-foreground">
                Templates define the default module states for client organizations.
                When a client is assigned a template, they inherit those defaults.
                You can then apply per-organization overrides as needed.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <div className="grid gap-6">
        {templateList.map((template) => {
          const moduleStates = template.template_modules || []
          const orgCount = template.org_template_assignments?.[0]?.count || 0

          // Build module state map
          const stateMap = new Map<string, ModuleState>()
          moduleStates.forEach((m: any) => {
            stateMap.set(m.module_key, m.default_state)
          })

          return (
            <Card
              key={template.id}
              className={cn(
                'hover:shadow-glow-sm transition-all',
                !template.is_active && 'opacity-60'
              )}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-gradient-to-br from-cyber-blue/20 to-cyber-cyan/20">
                      <LayoutTemplate className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl">{template.name}</CardTitle>
                        {!template.is_active && (
                          <Badge variant="outline" className="text-muted-foreground">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <CardDescription>{template.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <Building2 className="h-3 w-3" />
                      {orgCount} org{orgCount !== 1 ? 's' : ''}
                    </Badge>
                    <Button variant="ghost" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Copy className="h-4 w-4" />
                    </Button>
                    {orgCount === 0 && (
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Blocks className="h-4 w-4 text-primary" />
                    Module Defaults
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {MODULE_REGISTRY.map((mod) => {
                      const state = stateMap.get(mod.key) || 'hidden'
                      const StateIcon = stateIcons[state]
                      const ModIcon = getModuleIcon(mod.icon)

                      return (
                        <div
                          key={mod.key}
                          className={cn(
                            'flex items-center gap-2 p-2 rounded-lg border text-sm',
                            state === 'enabled'
                              ? 'border-cyber-emerald/20 bg-cyber-emerald/5'
                              : state === 'locked'
                              ? 'border-cyber-amber/20 bg-cyber-amber/5'
                              : 'border-border/30 bg-muted/20'
                          )}
                        >
                          <ModIcon
                            className={cn(
                              'h-4 w-4',
                              state === 'enabled'
                                ? 'text-cyber-emerald'
                                : state === 'locked'
                                ? 'text-cyber-amber'
                                : 'text-muted-foreground'
                            )}
                          />
                          <span
                            className={cn(
                              'flex-1 truncate',
                              state === 'hidden' && 'text-muted-foreground'
                            )}
                          >
                            {mod.displayName}
                          </span>
                          <StateIcon
                            className={cn('h-3.5 w-3.5', stateColors[state])}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Empty State */}
      {templateList.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <LayoutTemplate className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No templates yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first workspace template to define module defaults.
            </p>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Template
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Module State Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Module State Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg border border-cyber-emerald/20 bg-cyber-emerald/5">
                <Eye className="h-4 w-4 text-cyber-emerald" />
              </div>
              <div>
                <p className="font-medium text-sm">Enabled</p>
                <p className="text-xs text-muted-foreground">Full access to module</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg border border-cyber-amber/20 bg-cyber-amber/5">
                <Lock className="h-4 w-4 text-cyber-amber" />
              </div>
              <div>
                <p className="font-medium text-sm">Locked</p>
                <p className="text-xs text-muted-foreground">Visible with upgrade prompt</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg border border-border/30 bg-muted/20">
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-sm">Hidden</p>
                <p className="text-xs text-muted-foreground">Invisible to client</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
