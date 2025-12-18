'use server'

import { createClient } from '@/lib/supabase/server'

// Result type for guard checks
export type GuardResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code: string }

// =============================================================================
// ACTION GUARD: Check Auth
// =============================================================================
export async function checkAuth(): Promise<GuardResult<{ userId: string; email: string }>> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  return { success: true, data: { userId: user.id, email: user.email! } }
}

// =============================================================================
// ACTION GUARD: Check Super Admin
// =============================================================================
export async function checkSuperAdmin(): Promise<GuardResult<{ userId: string }>> {
  const authResult = await checkAuth()
  if (!authResult.success) return authResult

  const supabase = await createClient()

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('is_super_admin')
    .eq('id', authResult.data.userId)
    .single()

  if (error || !profile?.is_super_admin) {
    return { success: false, error: 'Super admin access required', code: 'FORBIDDEN' }
  }

  return { success: true, data: { userId: authResult.data.userId } }
}

// =============================================================================
// ACTION GUARD: Check Org Membership
// =============================================================================
export async function checkOrgMembership(
  orgId: string
): Promise<GuardResult<{ userId: string; role: string }>> {
  const authResult = await checkAuth()
  if (!authResult.success) return authResult

  const supabase = await createClient()

  const { data: membership, error } = await supabase
    .from('org_memberships')
    .select('role')
    .eq('user_id', authResult.data.userId)
    .eq('org_id', orgId)
    .single()

  if (error || !membership) {
    // Check if super admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_super_admin')
      .eq('id', authResult.data.userId)
      .single()

    if (!profile?.is_super_admin) {
      return { success: false, error: 'Access denied', code: 'FORBIDDEN' }
    }

    return {
      success: true,
      data: { userId: authResult.data.userId, role: 'super_admin' }
    }
  }

  return {
    success: true,
    data: { userId: authResult.data.userId, role: membership.role }
  }
}

// =============================================================================
// ACTION GUARD: Check Org Admin Role
// =============================================================================
export async function checkOrgAdmin(
  orgId: string
): Promise<GuardResult<{ userId: string }>> {
  const membershipResult = await checkOrgMembership(orgId)
  if (!membershipResult.success) return membershipResult

  const { role } = membershipResult.data

  if (!['org_admin', 'super_admin'].includes(role)) {
    return { success: false, error: 'Admin access required', code: 'FORBIDDEN' }
  }

  return {
    success: true,
    data: { userId: membershipResult.data.userId }
  }
}

// =============================================================================
// ACTION GUARD: Check Module Access
// =============================================================================
export async function checkModuleAccess(
  orgId: string,
  moduleKey: string
): Promise<GuardResult<{ userId: string; role: string }>> {
  const membershipResult = await checkOrgMembership(orgId)
  if (!membershipResult.success) return membershipResult

  // Super admins bypass module checks
  if (membershipResult.data.role === 'super_admin') {
    return membershipResult
  }

  const supabase = await createClient()

  const { data: isEnabled, error } = await supabase.rpc('is_module_enabled', {
    target_org_id: orgId,
    target_module_key: moduleKey,
  })

  if (error || !isEnabled) {
    return {
      success: false,
      error: 'Module not accessible',
      code: 'MODULE_LOCKED'
    }
  }

  return membershipResult
}

// =============================================================================
// ACTION GUARD: Validate org_id is not spoofed
// =============================================================================
export async function validateOrgAccess(
  orgId: string
): Promise<GuardResult<{ orgId: string; userId: string; role: string }>> {
  const membershipResult = await checkOrgMembership(orgId)
  if (!membershipResult.success) return membershipResult

  return {
    success: true,
    data: {
      orgId,
      userId: membershipResult.data.userId,
      role: membershipResult.data.role,
    }
  }
}
