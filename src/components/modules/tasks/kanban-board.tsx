'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import {
  GripVertical,
  MoreVertical,
  Plus,
  Clock,
  User,
  AlertCircle,
  CheckCircle2,
  Circle,
  Loader2,
  Eye,
  Edit,
  Trash2,
  FolderKanban,
} from 'lucide-react'
import { TaskStatus, TaskPriority, TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '@/schemas/task.schema'

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

interface KanbanBoardProps {
  tasks: Task[]
  orgId: string
  onMoveTask?: (taskId: string, status: TaskStatus, position: number) => Promise<void>
  onEditTask?: (task: Task) => void
  onDeleteTask?: (taskId: string) => Promise<void>
  onCreateTask?: (status: TaskStatus) => void
}

const COLUMNS: TaskStatus[] = ['todo', 'in_progress', 'review', 'done']

const columnConfig: Record<TaskStatus, {
  icon: React.ElementType
  color: string
  bgColor: string
  borderColor: string
}> = {
  todo: {
    icon: Circle,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/30',
    borderColor: 'border-border/50',
  },
  in_progress: {
    icon: Loader2,
    color: 'text-cyber-blue',
    bgColor: 'bg-cyber-blue/5',
    borderColor: 'border-cyber-blue/20',
  },
  review: {
    icon: Eye,
    color: 'text-cyber-amber',
    bgColor: 'bg-cyber-amber/5',
    borderColor: 'border-cyber-amber/20',
  },
  done: {
    icon: CheckCircle2,
    color: 'text-cyber-emerald',
    bgColor: 'bg-cyber-emerald/5',
    borderColor: 'border-cyber-emerald/20',
  },
  archived: {
    icon: Circle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/5',
    borderColor: 'border-destructive/20',
  },
}

const priorityConfig: Record<TaskPriority, { color: string; bgColor: string }> = {
  low: { color: 'text-muted-foreground', bgColor: 'bg-muted' },
  medium: { color: 'text-cyber-blue', bgColor: 'bg-cyber-blue/10' },
  high: { color: 'text-cyber-amber', bgColor: 'bg-cyber-amber/10' },
  urgent: { color: 'text-destructive', bgColor: 'bg-destructive/10' },
}

export function KanbanBoard({
  tasks,
  orgId,
  onMoveTask,
  onEditTask,
  onDeleteTask,
  onCreateTask,
}: KanbanBoardProps) {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null)

  // Group tasks by status
  const tasksByStatus = COLUMNS.reduce((acc, status) => {
    acc[status] = tasks
      .filter((t) => t.status === status)
      .sort((a, b) => a.sort_order - b.sort_order)
    return acc
  }, {} as Record<TaskStatus, Task[]>)

  const handleDragStart = useCallback((e: React.DragEvent, task: Task) => {
    setDraggedTask(task)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', task.id)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(status)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent, status: TaskStatus) => {
      e.preventDefault()
      setDragOverColumn(null)

      if (!draggedTask || !onMoveTask) return

      const targetTasks = tasksByStatus[status]
      const newPosition = targetTasks.length

      if (draggedTask.status !== status || draggedTask.sort_order !== newPosition) {
        await onMoveTask(draggedTask.id, status, newPosition)
      }

      setDraggedTask(null)
    },
    [draggedTask, onMoveTask, tasksByStatus]
  )

  const handleDragEnd = useCallback(() => {
    setDraggedTask(null)
    setDragOverColumn(null)
  }, [])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 min-h-[600px]">
      {COLUMNS.map((status) => {
        const config = columnConfig[status]
        const Icon = config.icon
        const columnTasks = tasksByStatus[status]
        const isDropTarget = dragOverColumn === status

        return (
          <div
            key={status}
            className={cn(
              'flex flex-col rounded-xl border-2 transition-all',
              config.bgColor,
              isDropTarget ? 'border-primary border-dashed' : config.borderColor
            )}
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status)}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between p-3 border-b border-border/30">
              <div className="flex items-center gap-2">
                <Icon className={cn('h-4 w-4', config.color)} />
                <span className="font-medium text-sm">{TASK_STATUS_LABELS[status]}</span>
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {columnTasks.length}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onCreateTask?.(status)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Tasks */}
            <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-300px)]">
              {columnTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isDragging={draggedTask?.id === task.id}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onEdit={() => onEditTask?.(task)}
                  onDelete={() => onDeleteTask?.(task.id)}
                />
              ))}

              {columnTasks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Icon className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No tasks</p>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

interface TaskCardProps {
  task: Task
  isDragging: boolean
  onDragStart: (e: React.DragEvent, task: Task) => void
  onDragEnd: () => void
  onEdit: () => void
  onDelete: () => void
}

function TaskCard({
  task,
  isDragging,
  onDragStart,
  onDragEnd,
  onEdit,
  onDelete,
}: TaskCardProps) {
  const priorityStyle = priorityConfig[task.priority]
  const isOverdue = task.due_date && new Date(task.due_date) < new Date()

  return (
    <Card
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onDragEnd={onDragEnd}
      className={cn(
        'group cursor-grab active:cursor-grabbing transition-all',
        'hover:shadow-glow-sm hover:border-primary/30',
        isDragging && 'opacity-50 rotate-2 scale-105'
      )}
    >
      <CardContent className="p-3 space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="flex-1 font-medium text-sm line-clamp-2">{task.title}</p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[140px]">
              <DropdownMenuItem onClick={onEdit} className="gap-2">
                <Edit className="h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="gap-2 text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Description preview */}
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        )}

        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Priority */}
          <Badge
            variant="outline"
            className={cn('text-xs px-1.5 py-0', priorityStyle.bgColor, priorityStyle.color)}
          >
            {TASK_PRIORITY_LABELS[task.priority]}
          </Badge>

          {/* Project */}
          {task.projects && (
            <Badge variant="outline" className="text-xs px-1.5 py-0 gap-1">
              <FolderKanban className="h-3 w-3" />
              {task.projects.name}
            </Badge>
          )}

          {/* Due date */}
          {task.due_date && (
            <Badge
              variant="outline"
              className={cn(
                'text-xs px-1.5 py-0 gap-1',
                isOverdue && 'border-destructive/30 text-destructive bg-destructive/10'
              )}
            >
              {isOverdue && <AlertCircle className="h-3 w-3" />}
              <Clock className="h-3 w-3" />
              {new Date(task.due_date).toLocaleDateString()}
            </Badge>
          )}
        </div>

        {/* Assignee */}
        {task.assigned_profile && (
          <div className="flex items-center gap-2 pt-1 border-t border-border/30">
            {task.assigned_profile.avatar_url ? (
              <img
                src={task.assigned_profile.avatar_url}
                alt={task.assigned_profile.full_name || ''}
                className="w-5 h-5 rounded-full"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-3 w-3 text-primary" />
              </div>
            )}
            <span className="text-xs text-muted-foreground truncate">
              {task.assigned_profile.full_name || task.assigned_profile.email}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
