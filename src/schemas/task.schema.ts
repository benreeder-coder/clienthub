import { z } from 'zod'

export const taskStatusEnum = z.enum([
  'todo',
  'in_progress',
  'review',
  'completed',
  'cancelled',
])

export const taskPriorityEnum = z.enum([
  'low',
  'medium',
  'high',
  'urgent',
])

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(2000, 'Description too long').optional(),
  status: taskStatusEnum.default('todo'),
  priority: taskPriorityEnum.default('medium'),
  projectId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
  dueDate: z.string().optional(),
  estimatedHours: z.coerce.number().positive().optional(),
})

export const updateTaskSchema = createTaskSchema.partial()

export const moveTaskSchema = z.object({
  taskId: z.string().uuid(),
  status: taskStatusEnum,
  position: z.number().int().nonnegative().optional(),
})

export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
export type MoveTaskInput = z.infer<typeof moveTaskSchema>
export type TaskStatus = z.infer<typeof taskStatusEnum>
export type TaskPriority = z.infer<typeof taskPriorityEnum>

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}
