'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@/types/database.types'

type UserProfile = Tables<'user_profiles'>
type OrgMembership = Tables<'org_memberships'> & {
  organizations: Tables<'organizations'>
}

export interface User {
  id: string
  email: string
  profile: UserProfile | null
  memberships: OrgMembership[]
  isSuperAdmin: boolean
}

export function useUser() {
  return useQuery({
    queryKey: ['user'],
    queryFn: async (): Promise<User | null> => {
      const supabase = createClient()

      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        return null
      }

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
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })
}

export function useIsAuthenticated() {
  const { data: user, isLoading } = useUser()
  return { isAuthenticated: !!user, isLoading }
}

export function useIsSuperAdmin() {
  const { data: user, isLoading } = useUser()
  return { isSuperAdmin: user?.isSuperAdmin || false, isLoading }
}
