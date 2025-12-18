import { Metadata } from 'next'
import { requireModuleAccess } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { TasksPageClient } from './tasks-client'

export const metadata: Metadata = {
  title: 'Tasks',
  description: 'Manage your tasks with kanban board',
}

export default async function TasksPage() {
  const { user, orgId } = await requireModuleAccess('tasks')
  const supabase = await createClient()

  // Fetch tasks for this org
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select(`
      *,
      assigned_profile:user_profiles!tasks_assigned_to_fkey (
        id,
        full_name,
        avatar_url,
        email
      ),
      projects (
        id,
        name
      )
    `)
    .eq('org_id', orgId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: false })

  if (tasksError) {
    console.error('Error fetching tasks:', tasksError)
  }

  // Fetch projects for dropdown
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')
    .eq('org_id', orgId)
    .order('name')

  // Fetch org members for assignment
  const { data: memberships } = await supabase
    .from('org_memberships')
    .select(`
      user_profiles (
        id,
        full_name,
        email,
        avatar_url
      )
    `)
    .eq('org_id', orgId)

  const members = memberships
    ?.map((m) => m.user_profiles)
    .filter(Boolean) as Array<{
      id: string
      full_name: string | null
      email: string
      avatar_url: string | null
    }> || []

  return (
    <TasksPageClient
      initialTasks={tasks || []}
      projects={projects || []}
      members={members}
      orgId={orgId}
    />
  )
}
