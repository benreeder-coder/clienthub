import { Metadata } from 'next'
import { requireModuleAccess } from '@/lib/auth/guards'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Activity,
  CheckCircle2,
  Clock,
  FolderKanban,
  TrendingUp,
  Users,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Overview of your workspace',
}

export default async function DashboardPage() {
  // Verify module access
  const { user, orgId } = await requireModuleAccess('dashboard')

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold font-display tracking-tight">
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Welcome back{user.profile?.full_name ? `, ${user.profile.full_name}` : ''}! Here's what's happening.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Active Projects"
          value="12"
          description="+2 from last month"
          icon={FolderKanban}
          trend="up"
        />
        <StatsCard
          title="Open Tasks"
          value="24"
          description="8 due this week"
          icon={Clock}
          trend="neutral"
        />
        <StatsCard
          title="Completed"
          value="156"
          description="+23% from last month"
          icon={CheckCircle2}
          trend="up"
        />
        <StatsCard
          title="Team Members"
          value="8"
          description="Active this week"
          icon={Users}
          trend="neutral"
        />
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
            <CardDescription>Your latest updates and changes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 text-sm"
                >
                  <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                  <div>
                    <p className="font-medium">{activity.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {quickActions.map((action, i) => (
                <button
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-background/50 hover:bg-accent/50 hover:border-primary/30 transition-all text-left group"
                >
                  <div className="p-2 rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    {action.icon}
                  </div>
                  <div>
                    <p className="font-medium">{action.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

interface StatsCardProps {
  title: string
  value: string
  description: string
  icon: React.ElementType
  trend: 'up' | 'down' | 'neutral'
}

function StatsCard({ title, value, description, icon: Icon, trend }: StatsCardProps) {
  return (
    <Card className="hover:shadow-glow-sm transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className={`text-xs ${
          trend === 'up' ? 'text-cyber-emerald' :
          trend === 'down' ? 'text-destructive' :
          'text-muted-foreground'
        }`}>
          {description}
        </p>
      </CardContent>
    </Card>
  )
}

const recentActivity = [
  { title: 'New task created: "Update landing page"', time: '2 hours ago' },
  { title: 'Project "Website Redesign" marked complete', time: '4 hours ago' },
  { title: 'Comment added to "API Integration"', time: '6 hours ago' },
  { title: 'New document uploaded: "Q4 Report.pdf"', time: 'Yesterday' },
  { title: 'Task assigned to you: "Review PRD"', time: 'Yesterday' },
]

const quickActions = [
  {
    title: 'Create Project',
    description: 'Start a new project',
    icon: <FolderKanban className="h-4 w-4" />,
  },
  {
    title: 'Add Task',
    description: 'Create a new task',
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  {
    title: 'Invite Member',
    description: 'Add team members',
    icon: <Users className="h-4 w-4" />,
  },
]
