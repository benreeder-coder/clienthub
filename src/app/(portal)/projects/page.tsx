import { Metadata } from 'next'
import Link from 'next/link'
import { requireModuleAccess, getCurrentOrgId } from '@/lib/auth/guards'
import { getProjects } from '@/actions/project.actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, FolderKanban, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Projects',
  description: 'Manage your projects',
}

const statusColors: Record<string, string> = {
  planning: 'bg-cyber-blue/20 text-cyber-blue border-cyber-blue/30',
  active: 'bg-cyber-emerald/20 text-cyber-emerald border-cyber-emerald/30',
  on_hold: 'bg-cyber-amber/20 text-cyber-amber border-cyber-amber/30',
  completed: 'bg-cyber-cyan/20 text-cyber-cyan border-cyber-cyan/30',
  cancelled: 'bg-destructive/20 text-destructive border-destructive/30',
}

export default async function ProjectsPage() {
  const { orgId } = await requireModuleAccess('projects')
  const { data: projects } = await getProjects(orgId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight">
            Projects
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage and track your projects
          </p>
        </div>
        <Button variant="neon" className="gap-2">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <FolderKanban className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first project to get started
            </p>
            <Button variant="neon" className="gap-2">
              <Plus className="h-4 w-4" />
              Create Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="h-full hover:shadow-glow-sm hover:border-primary/30 transition-all cursor-pointer group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      {project.name}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={cn(
                        'capitalize',
                        statusColors[project.status] || statusColors.planning
                      )}
                    >
                      {project.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {project.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {project.start_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(project.start_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
