import { Metadata } from 'next'
import Link from 'next/link'
import { requireSuperAdmin } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Building2,
  Users,
  FolderKanban,
  CheckSquare,
  Clock,
  ArrowRight,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Admin Dashboard',
  description: 'Agency overview and management',
}

const priorityColors: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-cyber-blue/20 text-cyber-blue',
  high: 'bg-cyber-amber/20 text-cyber-amber',
  urgent: 'bg-destructive/20 text-destructive',
}

export default async function AdminDashboardPage() {
  const user = await requireSuperAdmin()
  const supabase = await createClient()

  // Fetch summary data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedSupabase = supabase as any
  const [orgsResult, usersResult, tasksResult] = await Promise.all([
    typedSupabase.from('organizations').select('id, name, slug, onboarding_status', { count: 'exact' }),
    typedSupabase.from('user_profiles').select('id', { count: 'exact' }),
    typedSupabase
      .from('tasks')
      .select(`
        id,
        title,
        status,
        priority,
        due_date,
        assigned_to,
        org_id,
        organizations (name)
      `)
      .in('status', ['todo', 'in_progress', 'review'])
      .order('due_date', { ascending: true })
      .limit(20),
  ])

  const organizations = (orgsResult.data || []) as any[]
  const totalUsers = usersResult.count || 0
  const allTasks = (tasksResult.data || []) as any[]

  // Tasks assigned to current admin
  const myTasks = allTasks.filter((t: any) => t.assigned_to === user.id)

  // Group by due date urgency
  const today = new Date()
  const overdueTasks = allTasks.filter(
    (t: any) => t.due_date && new Date(t.due_date) < today
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold font-display tracking-tight">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Agency overview and client management
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Clients"
          value={organizations.length.toString()}
          icon={Building2}
          href="/admin/organizations"
        />
        <StatsCard
          title="Total Users"
          value={totalUsers.toString()}
          icon={Users}
          href="/admin/users"
        />
        <StatsCard
          title="Open Tasks"
          value={allTasks.length.toString()}
          description={`${overdueTasks.length} overdue`}
          icon={CheckSquare}
        />
        <StatsCard
          title="My Tasks"
          value={myTasks.length.toString()}
          icon={Clock}
        />
      </div>

      {/* Tasks Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary" />
            Action Items
          </CardTitle>
          <CardDescription>
            Tasks across all clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="my-tasks" className="w-full">
            <TabsList>
              <TabsTrigger value="my-tasks">
                My Tasks ({myTasks.length})
              </TabsTrigger>
              <TabsTrigger value="all-tasks">
                All Client Tasks ({allTasks.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="my-tasks" className="mt-4">
              {myTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No tasks assigned to you
                </div>
              ) : (
                <TaskList tasks={myTasks} />
              )}
            </TabsContent>

            <TabsContent value="all-tasks" className="mt-4">
              {allTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No open tasks across clients
                </div>
              ) : (
                <TaskList tasks={allTasks} showOrg />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Clients List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Clients
            </CardTitle>
            <CardDescription>
              All client organizations
            </CardDescription>
          </div>
          <Link href="/admin/organizations">
            <Button variant="outline" size="sm" className="gap-1">
              View All
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {organizations.slice(0, 5).map((org) => (
              <Link
                key={org.id}
                href={`/admin/organizations/${org.id}`}
                className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-accent/50 hover:border-primary/30 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyber-blue to-cyber-cyan flex items-center justify-center text-white font-bold">
                    {org.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium group-hover:text-primary transition-colors">
                      {org.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      /{org.slug}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    org.onboarding_status === 'completed'
                      ? 'border-cyber-emerald/30 text-cyber-emerald'
                      : org.onboarding_status === 'in_progress'
                      ? 'border-cyber-amber/30 text-cyber-amber'
                      : 'border-muted text-muted-foreground'
                  )}
                >
                  {org.onboarding_status.replace('_', ' ')}
                </Badge>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface StatsCardProps {
  title: string
  value: string
  description?: string
  icon: React.ElementType
  href?: string
}

function StatsCard({ title, value, description, icon: Icon, href }: StatsCardProps) {
  const content = (
    <Card className={cn('hover:shadow-glow-sm transition-all', href && 'cursor-pointer')}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return content
}

interface Task {
  id: string
  title: string
  status: string
  priority: string
  due_date: string | null
  organizations?: { name: string } | null
}

function TaskList({ tasks, showOrg }: { tasks: Task[]; showOrg?: boolean }) {
  const today = new Date()

  return (
    <div className="space-y-2">
      {tasks.map((task) => {
        const isOverdue = task.due_date && new Date(task.due_date) < today
        return (
          <div
            key={task.id}
            className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-accent/50 transition-all"
          >
            <div className="flex items-center gap-3">
              {isOverdue && (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )}
              <div>
                <p className="font-medium">{task.title}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {showOrg && task.organizations && (
                    <span>{task.organizations.name}</span>
                  )}
                  {task.due_date && (
                    <span className={cn(isOverdue && 'text-destructive')}>
                      Due {new Date(task.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn('capitalize', priorityColors[task.priority])}
              >
                {task.priority}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {task.status.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        )
      })}
    </div>
  )
}
