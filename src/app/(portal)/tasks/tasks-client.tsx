'use client'

import { useState, useTransition, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { KanbanBoard } from '@/components/modules/tasks/kanban-board'
import { TaskForm } from '@/components/modules/tasks/task-form'
import { createTask, moveTask, updateTask, deleteTask } from '@/actions/task.actions'
import { cn } from '@/lib/utils'
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  Filter,
  SlidersHorizontal,
} from 'lucide-react'
import { TaskStatus, TaskPriority } from '@/schemas/task.schema'

interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  sort_order: number
  project_id: string | null
  assigned_to: string | null
  assigned_profile: {
    id: string
    full_name: string | null
    avatar_url: string | null
    email: string
  } | null
  projects: {
    id: string
    name: string
  } | null
}

interface Project {
  id: string
  name: string
}

interface Member {
  id: string
  full_name: string | null
  email: string
  avatar_url: string | null
}

interface TasksPageClientProps {
  initialTasks: Task[]
  projects: Project[]
  members: Member[]
  orgId: string
}

export function TasksPageClient({
  initialTasks,
  projects,
  members,
  orgId,
}: TasksPageClientProps) {
  const [tasks, setTasks] = useState(initialTasks)
  const [view, setView] = useState<'board' | 'list'>('board')
  const [searchQuery, setSearchQuery] = useState('')
  const [isPending, startTransition] = useTransition()

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>('todo')

  // Filter tasks based on search
  const filteredTasks = tasks.filter((task) =>
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCreateTask = useCallback((status: TaskStatus) => {
    setFormMode('create')
    setDefaultStatus(status)
    setEditingTask(null)
    setShowForm(true)
  }, [])

  const handleEditTask = useCallback((task: Task) => {
    setFormMode('edit')
    setEditingTask(task)
    setShowForm(true)
  }, [])

  const handleFormSubmit = async (formData: FormData): Promise<{ error?: string }> => {
    if (formMode === 'create') {
      const result = await createTask(orgId, formData)
      if (result.error) {
        return { error: result.error }
      }
      if (result.data) {
        startTransition(() => {
          setTasks((prev) => [result.data, ...prev])
        })
      }
    } else if (editingTask) {
      const result = await updateTask(editingTask.id, orgId, formData)
      if (result.error) {
        return { error: result.error }
      }
      if (result.data) {
        startTransition(() => {
          setTasks((prev) =>
            prev.map((t) => (t.id === editingTask.id ? { ...t, ...result.data } : t))
          )
        })
      }
    }

    setShowForm(false)
    setEditingTask(null)
    return {}
  }

  const handleMoveTask = async (taskId: string, status: TaskStatus, position: number) => {
    // Optimistic update
    startTransition(() => {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status, position } : t))
      )
    })

    const result = await moveTask(orgId, { taskId, status, position })
    if (result.error) {
      // Revert on error - refetch would be better
      console.error('Error moving task:', result.error)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    // Optimistic update
    startTransition(() => {
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
    })

    const result = await deleteTask(taskId, orgId)
    if (result.error) {
      // Revert on error
      console.error('Error deleting task:', result.error)
    }
  }

  const taskCounts = {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === 'todo').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    review: tasks.filter((t) => t.status === 'review').length,
    done: tasks.filter((t) => t.status === 'done').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight">
            Tasks
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage and track your tasks
          </p>
        </div>
        <Button onClick={() => handleCreateTask('todo')} className="gap-2">
          <Plus className="h-4 w-4" />
          New Task
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="gap-1">
          Total: {taskCounts.total}
        </Badge>
        <Badge variant="outline" className="gap-1 border-muted text-muted-foreground">
          To Do: {taskCounts.todo}
        </Badge>
        <Badge variant="outline" className="gap-1 border-cyber-blue/30 text-cyber-blue">
          In Progress: {taskCounts.in_progress}
        </Badge>
        <Badge variant="outline" className="gap-1 border-cyber-amber/30 text-cyber-amber">
          Review: {taskCounts.review}
        </Badge>
        <Badge variant="outline" className="gap-1 border-cyber-emerald/30 text-cyber-emerald">
          Done: {taskCounts.done}
        </Badge>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
          <div className="flex rounded-lg border border-border overflow-hidden">
            <Button
              variant={view === 'board' ? 'secondary' : 'ghost'}
              size="icon"
              className="rounded-none border-0"
              onClick={() => setView('board')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={view === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="rounded-none border-0"
              onClick={() => setView('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {view === 'board' ? (
        <KanbanBoard
          tasks={filteredTasks}
          orgId={orgId}
          onMoveTask={handleMoveTask}
          onEditTask={handleEditTask}
          onDeleteTask={handleDeleteTask}
          onCreateTask={handleCreateTask}
        />
      ) : (
        <TaskListView
          tasks={filteredTasks}
          onEdit={handleEditTask}
          onDelete={handleDeleteTask}
        />
      )}

      {/* Task Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <TaskForm
            mode={formMode}
            defaultStatus={defaultStatus}
            defaultValues={
              editingTask
                ? {
                    id: editingTask.id,
                    title: editingTask.title,
                    description: editingTask.description || undefined,
                    status: editingTask.status,
                    priority: editingTask.priority,
                    projectId: editingTask.project_id || undefined,
                    assignedTo: editingTask.assigned_to || undefined,
                    dueDate: editingTask.due_date || undefined,
                  }
                : undefined
            }
            projects={projects}
            members={members}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setShowForm(false)
              setEditingTask(null)
            }}
          />
        </div>
      )}
    </div>
  )
}

// Simple list view component
function TaskListView({
  tasks,
  onEdit,
  onDelete,
}: {
  tasks: Task[]
  onEdit: (task: Task) => void
  onDelete: (taskId: string) => void
}) {
  const priorityColors: Record<TaskPriority, string> = {
    low: 'text-muted-foreground',
    medium: 'text-cyber-blue',
    high: 'text-cyber-amber',
    urgent: 'text-destructive',
  }

  const statusColors: Record<TaskStatus, string> = {
    todo: 'bg-muted',
    in_progress: 'bg-cyber-blue',
    review: 'bg-cyber-amber',
    done: 'bg-cyber-emerald',
    archived: 'bg-destructive',
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No tasks found
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="flex items-center gap-4 p-4 rounded-lg border border-border/50 hover:bg-accent/30 transition-colors cursor-pointer"
          onClick={() => onEdit(task)}
        >
          <div className={cn('w-2 h-2 rounded-full', statusColors[task.status])} />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{task.title}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {task.projects && <span>{task.projects.name}</span>}
              {task.due_date && (
                <span>Due {new Date(task.due_date).toLocaleDateString()}</span>
              )}
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn('capitalize', priorityColors[task.priority])}
          >
            {task.priority}
          </Badge>
          {task.assigned_profile && (
            <div className="flex items-center gap-2">
              {task.assigned_profile.avatar_url ? (
                <img
                  src={task.assigned_profile.avatar_url}
                  alt=""
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs">
                  {(task.assigned_profile.full_name || task.assigned_profile.email)
                    .charAt(0)
                    .toUpperCase()}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
