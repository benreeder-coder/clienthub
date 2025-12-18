import { Metadata } from 'next'
import Link from 'next/link'
import { requireSuperAdmin } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Building2,
  Plus,
  Search,
  Users,
  FolderKanban,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Organizations | Admin',
  description: 'Manage client organizations',
}

const onboardingStatusColors: Record<string, string> = {
  pending: 'border-muted text-muted-foreground',
  in_progress: 'border-cyber-amber/30 text-cyber-amber',
  completed: 'border-cyber-emerald/30 text-cyber-emerald',
}

export default async function AdminOrganizationsPage() {
  await requireSuperAdmin()
  const supabase = await createClient()

  // Fetch all organizations with member counts and project counts
  const { data: organizations, error } = await supabase
    .from('organizations')
    .select(`
      *,
      org_memberships (count),
      projects (count),
      org_template_assignments (
        workspace_templates (
          id,
          name
        )
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching organizations:', error)
  }

  const orgs = organizations || []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight">
            Organizations
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage client organizations and workspaces
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Organization
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search organizations..."
                className="pl-10"
              />
            </div>
            <Button variant="outline">All Status</Button>
            <Button variant="outline">All Templates</Button>
          </div>
        </CardContent>
      </Card>

      {/* Organizations Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {orgs.map((org) => {
          const memberCount = org.org_memberships?.[0]?.count || 0
          const projectCount = org.projects?.[0]?.count || 0
          const template = org.org_template_assignments?.[0]?.workspace_templates

          return (
            <Card
              key={org.id}
              className="hover:shadow-glow-sm hover:border-primary/30 transition-all group"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyber-blue to-cyber-cyan flex items-center justify-center text-white font-bold text-lg">
                      {org.name.charAt(0)}
                    </div>
                    <div>
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">
                        {org.name}
                      </CardTitle>
                      <CardDescription>/{org.slug}</CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'capitalize',
                      onboardingStatusColors[org.onboarding_status]
                    )}
                  >
                    {org.onboarding_status.replace('_', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Stats */}
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{memberCount} members</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <FolderKanban className="h-4 w-4" />
                    <span>{projectCount} projects</span>
                  </div>
                </div>

                {/* Template */}
                {template && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Template:</span>
                    <Badge variant="secondary" className="font-normal">
                      {template.name}
                    </Badge>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Link href={`/admin/organizations/${org.id}`} className="flex-1">
                    <Button variant="outline" className="w-full gap-2">
                      Manage
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="icon" title="View as client">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Empty State */}
      {orgs.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No organizations yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first client organization to get started.
            </p>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Organization
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
