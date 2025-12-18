import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/database.types'

type UserProfile = Tables<'user_profiles'>
type OrgMembership = Tables<'org_memberships'> & {
  organizations: Tables<'organizations'>
}

export interface AuthUser {
  id: string
  email: string
  profile: UserProfile | null
  memberships: OrgMembership[]
  isSuperAdmin: boolean
}

// Get current authenticated user with profile and memberships
export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return null
  }

  // Fetch user profile with org memberships
  const { data: profile } = await supabase
    .from('user_profiles')
    .select(`
      *,
      org_memberships (
        id,
        org_id,
        role,
        is_primary,
        invited_at,
        accepted_at,
        organizations (
          id,
          name,
          slug,
          logo_url,
          is_active
        )
      )
    `)
    .eq('id', user.id)
    .single()

  return {
    id: user.id,
    email: user.email!,
    profile: profile as UserProfile | null,
    memberships: (profile?.org_memberships || []) as OrgMembership[],
    isSuperAdmin: profile?.is_super_admin || false,
  }
}

// Get current org ID from user's primary membership or first available
export async function getCurrentOrgId(): Promise<string | null> {
  const user = await getCurrentUser()

  if (!user || user.memberships.length === 0) {
    return null
  }

  // Find primary org or use first
  const primaryMembership = user.memberships.find(m => m.is_primary)
  return primaryMembership?.org_id || user.memberships[0].org_id
}

// =============================================================================
// GUARD: Require Authentication
// =============================================================================
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return user
}

// =============================================================================
// GUARD: Require Super Admin
// =============================================================================
export async function requireSuperAdmin(): Promise<AuthUser> {
  const user = await requireAuth()

  if (!user.isSuperAdmin) {
    redirect('/dashboard')
  }

  return user
}

// =============================================================================
// GUARD: Require Org Membership
// =============================================================================
export async function requireOrgMembership(orgId?: string): Promise<{
  user: AuthUser
  orgId: string
  membership: OrgMembership
}> {
  const user = await requireAuth()

  const targetOrgId = orgId || await getCurrentOrgId()

  if (!targetOrgId) {
    redirect('/onboarding') // No org assigned
  }

  const membership = user.memberships.find(m => m.org_id === targetOrgId)

  // Super admins can access any org
  if (!membership && !user.isSuperAdmin) {
    redirect('/dashboard')
  }

  // For super admins without membership, create a virtual membership
  const effectiveMembership = membership || {
    id: 'super-admin-virtual',
    org_id: targetOrgId,
    user_id: user.id,
    role: 'super_admin' as const,
    is_primary: false,
    invited_at: new Date().toISOString(),
    accepted_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    invited_by: null,
    organizations: null as any, // Will be fetched separately if needed
  }

  return { user, orgId: targetOrgId, membership: effectiveMembership as OrgMembership }
}

// =============================================================================
// GUARD: Require Org Admin Role
// =============================================================================
export async function requireOrgAdmin(orgId?: string): Promise<{
  user: AuthUser
  orgId: string
  membership: OrgMembership
}> {
  const { user, orgId: resolvedOrgId, membership } = await requireOrgMembership(orgId)

  const isAdmin =
    user.isSuperAdmin ||
    membership.role === 'org_admin' ||
    membership.role === 'super_admin'

  if (!isAdmin) {
    redirect('/dashboard')
  }

  return { user, orgId: resolvedOrgId, membership }
}

// =============================================================================
// GUARD: Require Module Access
// =============================================================================
export async function requireModuleAccess(moduleKey: string, orgId?: string): Promise<{
  user: AuthUser
  orgId: string
  membership: OrgMembership
  moduleState: 'enabled' | 'locked' | 'hidden'
}> {
  const { user, orgId: resolvedOrgId, membership } = await requireOrgMembership(orgId)

  // Super admins bypass module restrictions
  if (user.isSuperAdmin) {
    return { user, orgId: resolvedOrgId, membership, moduleState: 'enabled' }
  }

  // Get module state from database
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_module_state', {
    target_org_id: resolvedOrgId,
    target_module_key: moduleKey,
  })

  const moduleState = (data as 'enabled' | 'locked' | 'hidden') || 'hidden'

  if (moduleState !== 'enabled') {
    if (moduleState === 'locked') {
      redirect(`/modules/locked?module=${moduleKey}`)
    } else {
      // Hidden - act as if it doesn't exist
      redirect('/dashboard')
    }
  }

  return { user, orgId: resolvedOrgId, membership, moduleState }
}

// =============================================================================
// Higher-Order Guard for Page Components
// =============================================================================
export function withModuleGuard(moduleKey: string) {
  return async function guard(orgId?: string) {
    return requireModuleAccess(moduleKey, orgId)
  }
}

// =============================================================================
// Helper: Check if user can access module (without redirect)
// =============================================================================
export async function canAccessModule(moduleKey: string, orgId: string): Promise<boolean> {
  const user = await getCurrentUser()

  if (!user) return false
  if (user.isSuperAdmin) return true

  const supabase = await createClient()
  const { data } = await supabase.rpc('is_module_enabled', {
    target_org_id: orgId,
    target_module_key: moduleKey,
  })

  return data || false
}
