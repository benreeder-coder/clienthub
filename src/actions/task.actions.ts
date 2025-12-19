'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { checkModuleAccess, checkOrgAdmin } from '@/lib/auth/action-guards'
import { createTaskSchema, updateTaskSchema, moveTaskSchema } from '@/schemas/task.schema'

// =============================================================================
// GET TASKS
// =============================================================================
export async function getTasks(orgId: string, projectId?: string) {
  const accessResult = await checkModuleAccess(orgId, 'tasks')
  if (!accessResult.success) {
    return { error: accessResult.error, code: accessResult.code, data: [] }
  }

  const supabase = await createClient()

  let query = supabase
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
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching tasks:', error)
    return { error: 'Failed to fetch tasks', code: 'DATABASE_ERROR', data: [] }
  }

  return { success: true, data: data || [] }
}

// =============================================================================
// GET TASK BY ID
// =============================================================================
export async function getTask(taskId: string, orgId: string) {
  const accessResult = await checkModuleAccess(orgId, 'tasks')
  if (!accessResult.success) {
    return { error: accessResult.error, code: accessResult.code, data: null }
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      assigned_profile:user_profiles!tasks_assigned_to_fkey (
        id,
        full_name,
        avatar_url,
        email
      ),
      created_by_profile:user_profiles!tasks_created_by_fkey (
        id,
        full_name,
        avatar_url
      ),
      projects (
        id,
        name
      )
    `)
    .eq('id', taskId)
    .eq('org_id', orgId)
    .single()

  if (error) {
    console.error('Error fetching task:', error)
    return { error: 'Task not found', code: 'NOT_FOUND', data: null }
  }

  return { success: true, data }
}

// =============================================================================
// CREATE TASK
// =============================================================================
export async function createTask(orgId: string, formData: FormData) {
  const accessResult = await checkModuleAccess(orgId, 'tasks')
  if (!accessResult.success) {
    return { error: accessResult.error, code: accessResult.code }
  }

  const rawData = {
    title: formData.get('title'),
    description: formData.get('description') || undefined,
    status: formData.get('status') || 'todo',
    priority: formData.get('priority') || 'medium',
    projectId: formData.get('projectId') || undefined,
    assignedTo: formData.get('assignedTo') || undefined,
    dueDate: formData.get('dueDate') || undefined,
  }

  const validation = createTaskSchema.safeParse(rawData)
  if (!validation.success) {
    return {
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      issues: validation.error.issues,
    }
  }

  const supabase = await createClient()

  // Get the max sort_order for this status
  const { data: maxPosResult } = await supabase
    .from('tasks')
    .select('sort_order')
    .eq('org_id', orgId)
    .eq('status', validation.data.status)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const newSortOrder = (maxPosResult?.sort_order ?? -1) + 1

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('tasks')
    .insert({
      org_id: orgId,
      title: validation.data.title,
      description: validation.data.description,
      status: validation.data.status,
      priority: validation.data.priority,
      project_id: validation.data.projectId,
      assigned_to: validation.data.assignedTo,
      due_date: validation.data.dueDate,
      created_by: accessResult.data.userId,
      sort_order: newSortOrder,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating task:', error)
    return { error: 'Failed to create task', code: 'DATABASE_ERROR' }
  }

  revalidatePath('/tasks')
  return { success: true, data }
}

// =============================================================================
// UPDATE TASK
// =============================================================================
export async function updateTask(
  taskId: string,
  orgId: string,
  formData: FormData
) {
  const accessResult = await checkModuleAccess(orgId, 'tasks')
  if (!accessResult.success) {
    return { error: accessResult.error, code: accessResult.code }
  }

  const rawData = {
    title: formData.get('title') || undefined,
    description: formData.get('description') || undefined,
    status: formData.get('status') || undefined,
    priority: formData.get('priority') || undefined,
    projectId: formData.get('projectId') || undefined,
    assignedTo: formData.get('assignedTo') || undefined,
    dueDate: formData.get('dueDate') || undefined,
  }

  // Filter out undefined values
  const filteredData = Object.fromEntries(
    Object.entries(rawData).filter(([_, v]) => v !== undefined)
  )

  const validation = updateTaskSchema.safeParse(filteredData)
  if (!validation.success) {
    return {
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      issues: validation.error.issues,
    }
  }

  const supabase = await createClient()

  const updateData: Record<string, unknown> = {}
  if (validation.data.title) updateData.title = validation.data.title
  if (validation.data.description !== undefined) updateData.description = validation.data.description
  if (validation.data.status) updateData.status = validation.data.status
  if (validation.data.priority) updateData.priority = validation.data.priority
  if (validation.data.projectId !== undefined) updateData.project_id = validation.data.projectId
  if (validation.data.assignedTo !== undefined) updateData.assigned_to = validation.data.assignedTo
  if (validation.data.dueDate !== undefined) updateData.due_date = validation.data.dueDate

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('tasks')
    .update(updateData)
    .eq('id', taskId)
    .eq('org_id', orgId)
    .select()
    .single()

  if (error) {
    console.error('Error updating task:', error)
    return { error: 'Failed to update task', code: 'DATABASE_ERROR' }
  }

  revalidatePath(`/tasks/${taskId}`)
  revalidatePath('/tasks')
  return { success: true, data }
}

// =============================================================================
// MOVE TASK (Kanban drag-drop)
// =============================================================================
export async function moveTask(orgId: string, data: {
  taskId: string
  status: string
  position?: number
}) {
  const accessResult = await checkModuleAccess(orgId, 'tasks')
  if (!accessResult.success) {
    return { error: accessResult.error, code: accessResult.code }
  }

  const validation = moveTaskSchema.safeParse(data)
  if (!validation.success) {
    return {
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      issues: validation.error.issues,
    }
  }

  const supabase = await createClient()

  // Get current task
  const { data: currentTask, error: fetchError } = await supabase
    .from('tasks')
    .select('status, sort_order')
    .eq('id', validation.data.taskId)
    .eq('org_id', orgId)
    .single()

  if (fetchError || !currentTask) {
    return { error: 'Task not found', code: 'NOT_FOUND' }
  }

  const newStatus = validation.data.status as 'todo' | 'in_progress' | 'review' | 'done' | 'archived'
  const newSortOrder = validation.data.position ?? 0

  // If moving to a different status, reorder both columns
  if (currentTask.status !== newStatus) {
    // Decrement positions in old column for items after this task
    await supabase.rpc('reorder_tasks_after_remove', {
      p_org_id: orgId,
      p_status: currentTask.status,
      p_old_position: currentTask.sort_order,
    })

    // Increment positions in new column for items at or after new position
    await supabase.rpc('reorder_tasks_before_insert', {
      p_org_id: orgId,
      p_status: newStatus,
      p_new_position: newSortOrder,
    })
  } else {
    // Same column, just reorder
    await supabase.rpc('reorder_tasks_same_column', {
      p_org_id: orgId,
      p_status: newStatus,
      p_old_position: currentTask.sort_order,
      p_new_position: newSortOrder,
    })
  }

  // Update the task
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updatedTask, error: updateError } = await (supabase as any)
    .from('tasks')
    .update({
      status: newStatus,
      sort_order: newSortOrder,
    })
    .eq('id', validation.data.taskId)
    .eq('org_id', orgId)
    .select()
    .single()

  if (updateError) {
    console.error('Error moving task:', updateError)
    return { error: 'Failed to move task', code: 'DATABASE_ERROR' }
  }

  revalidatePath('/tasks')
  return { success: true, data: updatedTask }
}

// =============================================================================
// DELETE TASK
// =============================================================================
export async function deleteTask(taskId: string, orgId: string) {
  const accessResult = await checkModuleAccess(orgId, 'tasks')
  if (!accessResult.success) {
    return { error: accessResult.error, code: accessResult.code }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
    .eq('org_id', orgId)

  if (error) {
    console.error('Error deleting task:', error)
    return { error: 'Failed to delete task', code: 'DATABASE_ERROR' }
  }

  revalidatePath('/tasks')
  return { success: true }
}
