'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { checkModuleAccess, checkOrgAdmin } from '@/lib/auth/action-guards'
import { createProjectSchema, updateProjectSchema } from '@/schemas/project.schema'

// =============================================================================
// GET PROJECTS
// =============================================================================
export async function getProjects(orgId: string) {
  const accessResult = await checkModuleAccess(orgId, 'projects')
  if (!accessResult.success) {
    return { error: accessResult.error, code: accessResult.code, data: [] }
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      created_by_profile:user_profiles!projects_created_by_fkey (
        id,
        full_name,
        avatar_url
      )
    `)
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching projects:', error)
    return { error: 'Failed to fetch projects', code: 'DATABASE_ERROR', data: [] }
  }

  return { success: true, data: data || [] }
}

// =============================================================================
// GET PROJECT BY ID
// =============================================================================
export async function getProject(projectId: string, orgId: string) {
  const accessResult = await checkModuleAccess(orgId, 'projects')
  if (!accessResult.success) {
    return { error: accessResult.error, code: accessResult.code, data: null }
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      created_by_profile:user_profiles!projects_created_by_fkey (
        id,
        full_name,
        avatar_url
      ),
      tasks (
        id,
        title,
        status,
        priority,
        due_date
      )
    `)
    .eq('id', projectId)
    .eq('org_id', orgId)
    .single()

  if (error) {
    console.error('Error fetching project:', error)
    return { error: 'Project not found', code: 'NOT_FOUND', data: null }
  }

  return { success: true, data }
}

// =============================================================================
// CREATE PROJECT
// =============================================================================
export async function createProject(orgId: string, formData: FormData) {
  const accessResult = await checkModuleAccess(orgId, 'projects')
  if (!accessResult.success) {
    return { error: accessResult.error, code: accessResult.code }
  }

  const rawData = {
    name: formData.get('name'),
    description: formData.get('description') || undefined,
    status: formData.get('status') || 'planning',
    startDate: formData.get('startDate') || undefined,
    endDate: formData.get('endDate') || undefined,
    budget: formData.get('budget') || undefined,
  }

  const validation = createProjectSchema.safeParse(rawData)
  if (!validation.success) {
    return {
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      issues: validation.error.issues,
    }
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('projects')
    .insert({
      org_id: orgId,
      name: validation.data.name,
      description: validation.data.description,
      status: validation.data.status as 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled',
      start_date: validation.data.startDate,
      end_date: validation.data.endDate,
      budget: validation.data.budget,
      created_by: accessResult.data.userId,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating project:', error)
    return { error: 'Failed to create project', code: 'DATABASE_ERROR' }
  }

  revalidatePath('/projects')
  return { success: true, data }
}

// =============================================================================
// UPDATE PROJECT
// =============================================================================
export async function updateProject(
  projectId: string,
  orgId: string,
  formData: FormData
) {
  const accessResult = await checkModuleAccess(orgId, 'projects')
  if (!accessResult.success) {
    return { error: accessResult.error, code: accessResult.code }
  }

  const rawData = {
    name: formData.get('name') || undefined,
    description: formData.get('description') || undefined,
    status: formData.get('status') || undefined,
    startDate: formData.get('startDate') || undefined,
    endDate: formData.get('endDate') || undefined,
    budget: formData.get('budget') || undefined,
  }

  // Filter out undefined values
  const filteredData = Object.fromEntries(
    Object.entries(rawData).filter(([_, v]) => v !== undefined)
  )

  const validation = updateProjectSchema.safeParse(filteredData)
  if (!validation.success) {
    return {
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      issues: validation.error.issues,
    }
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('projects')
    .update({
      ...validation.data,
      start_date: validation.data.startDate,
      end_date: validation.data.endDate,
    })
    .eq('id', projectId)
    .eq('org_id', orgId)
    .select()
    .single()

  if (error) {
    console.error('Error updating project:', error)
    return { error: 'Failed to update project', code: 'DATABASE_ERROR' }
  }

  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/projects')
  return { success: true, data }
}

// =============================================================================
// DELETE PROJECT (Admin only)
// =============================================================================
export async function deleteProject(projectId: string, orgId: string) {
  const adminResult = await checkOrgAdmin(orgId)
  if (!adminResult.success) {
    return { error: adminResult.error, code: adminResult.code }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)
    .eq('org_id', orgId)

  if (error) {
    console.error('Error deleting project:', error)
    return { error: 'Failed to delete project', code: 'DATABASE_ERROR' }
  }

  revalidatePath('/projects')
  return { success: true }
}
