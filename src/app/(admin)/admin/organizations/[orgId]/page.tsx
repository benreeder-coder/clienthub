import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireSuperAdmin } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Building2,
  Users,
  FolderKanban,
  Settings,
  CheckSquare,
  Clock,
  LayoutTemplate,
  Blocks,
  Shield,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ModuleConfigPanel } from '@/components/admin/module-config-panel'
import { OrgMembersPanel } from '@/components/admin/org-members-panel'
import { MODULE_REGISTRY } from '@/lib/modules/registry'

export const metadata: Metadata = {
  title: 'Organization Details | Admin',
  description: 'Manage organization workspace',
}

const onboardingStatusColors: Record<string, string> = {
  pending: 'border-muted text-muted-foreground bg-muted/10',
  in_progress: 'border-cyber-amber/30 text-cyber-amber bg-cyber-amber/10',
  completed: 'border-cyber-emerald/30 text-cyber-emerald bg-cyber-emerald/10',
}

interface PageProps {
  params: Promise<{ orgId: string }>
}

export default async function AdminOrganizationDetailPage({ params }: PageProps) {
  const { orgId } = await params
  await requireSuperAdmin()
  const supabase = await createClient()

  // Fetch organization with related data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: org, error } = await (supabase as any)
    .from('organizations')
    .select(`
      *,
      org_memberships (
        id,
        role,
        user_profiles (
          id,
          email,
          full_name,
          avatar_url
        )
      ),
      projects (count),
      tasks (count),
      org_template_assignments (
        id,
        workspace_templates (
          id,
          name,
          description,
          template_modules (
            module_key,
            default_state,
            default_config
          )
        )
      ),
      org_modules (
        id,
        module_key,
        state_override,
        config_override
      )
    `)
    .eq('id', orgId)
    .single()

  if (error || !org) {
    notFound()
  }

  // Fetch all templates for dropdown
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: templates } = await (supabase as any)
    .from('workspace_templates')
    .select('id, name, description')
    .eq('is_active', true)
    .order('name')

  const typedOrg = org as any
  const assignment = typedOrg.org_template_assignments?.[0]
  const template = assignment?.workspace_templates
  const templateModules = template?.template_modules || []
  const orgOverrides = typedOrg.org_modules || []

  // Build effective module states
  const moduleStates = MODULE_REGISTRY.map((mod) => {
    const templateDefault = templateModules.find((tm: any) => tm.module_key === mod.key)
    const orgOverride = orgOverrides.find((om: any) => om.module_key === mod.key)

    return {
      key: mod.key,
      name: mod.displayName,
      icon: mod.icon,
      defaultState: templateDefault?.default_state || 'hidden',
      effectiveState: orgOverride?.state_override || templateDefault?.default_state || 'hidden',
      hasOverride: !!orgOverride?.state_override,
      overrideId: orgOverride?.id,
    }
  })

  const projectCount = typedOrg.projects?.[0]?.count || 0
  const taskCount = typedOrg.tasks?.[0]?.count || 0
  const members = typedOrg.org_memberships || []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/organizations">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyber-blue to-cyber-cyan flex items-center justify-center text-white font-bold text-xl">
              {typedOrg.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-3xl font-bold font-display tracking-tight">
                {typedOrg.name}
              </h1>
              <p className="text-muted-foreground">/{typedOrg.slug}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className={cn(
              'capitalize px-3 py-1',
              onboardingStatusColors[typedOrg.onboarding_status]
            )}
          >
            {typedOrg.onboarding_status.replace('_', ' ')}
          </Badge>
          <Button variant="outline" className="gap-2">
            <ExternalLink className="h-4 w-4" />
            View as Client
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard
          title="Members"
          value={members.length.toString()}
          icon={Users}
        />
        <StatsCard
          title="Projects"
          value={projectCount.toString()}
          icon={FolderKanban}
        />
        <StatsCard
          title="Tasks"
          value={taskCount.toString()}
          icon={CheckSquare}
        />
        <StatsCard
          title="Created"
          value={new Date(typedOrg.created_at).toLocaleDateString()}
          icon={Clock}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Workspace Config */}
        <div className="lg:col-span-2 space-y-6">
          {/* Template Assignment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutTemplate className="h-5 w-5 text-primary" />
                Workspace Template
              </CardTitle>
              <CardDescription>
                The base template determines default module access
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card/50">
                <div>
                  <p className="font-medium">{template?.name || 'No template assigned'}</p>
                  <p className="text-sm text-muted-foreground">
                    {template?.description || 'Assign a template to configure module defaults'}
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Change Template
                </Button>
              </div>

              {templates && templates.length > 0 && !template && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Available Templates:</p>
                  <div className="grid gap-2">
                    {templates.map((t) => (
                      <button
                        key={t.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-accent/50 hover:border-primary/30 transition-all text-left"
                      >
                        <div>
                          <p className="font-medium">{t.name}</p>
                          <p className="text-xs text-muted-foreground">{t.description}</p>
                        </div>
                        <Button size="sm">Assign</Button>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Module Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Blocks className="h-5 w-5 text-primary" />
                Module Configuration
              </CardTitle>
              <CardDescription>
                Override template defaults for this organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ModuleConfigPanel
                orgId={orgId}
                moduleStates={moduleStates}
              />
            </CardContent>
          </Card>

          {/* Organization Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Organization Settings
              </CardTitle>
              <CardDescription>
                General settings and metadata
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Organization Name</label>
                  <p className="text-sm text-muted-foreground">{typedOrg.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Slug</label>
                  <p className="text-sm text-muted-foreground">{typedOrg.slug}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Onboarding Status</label>
                  <p className="text-sm text-muted-foreground capitalize">
                    {typedOrg.onboarding_status.replace('_', ' ')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Created</label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(typedOrg.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="flex gap-2">
                <Button variant="outline" size="sm">Edit Settings</Button>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                  Delete Organization
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Members */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Team Members
              </CardTitle>
              <CardDescription>
                {members.length} member{members.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrgMembersPanel members={members} orgId={orgId} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function StatsCard({
  title,
  value,
  icon: Icon,
}: {
  title: string
  value: string
  icon: React.ElementType
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <Icon className="h-8 w-8 text-muted-foreground/50" />
        </div>
      </CardContent>
    </Card>
  )
}
