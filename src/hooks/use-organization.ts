'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useUser } from './use-user'
import type { Tables } from '@/types/database.types'

type Organization = Tables<'organizations'>

// Store current org ID in localStorage for persistence
const CURRENT_ORG_KEY = 'clienthub-current-org'

export function useCurrentOrgId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(CURRENT_ORG_KEY)
}

export function setCurrentOrgId(orgId: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(CURRENT_ORG_KEY, orgId)
  }
}

export function useOrganization(orgId?: string) {
  const { data: user } = useUser()
  const storedOrgId = useCurrentOrgId()

  // Determine which org to use
  const targetOrgId = orgId || storedOrgId || user?.memberships?.[0]?.org_id

  return useQuery({
    queryKey: ['organization', targetOrgId],
    queryFn: async (): Promise<Organization | null> => {
      if (!targetOrgId) return null

      const supabase = createClient()
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', targetOrgId)
        .single()

      if (error) {
        console.error('Error fetching organization:', error)
        return null
      }

      return data
    },
    enabled: !!targetOrgId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useOrganizations() {
  const { data: user } = useUser()

  return useQuery({
    queryKey: ['organizations'],
    queryFn: async (): Promise<Organization[]> => {
      if (!user) return []

      // Super admins can see all orgs
      if (user.isSuperAdmin) {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('organizations')
          .select('*')
          .order('name')

        if (error) {
          console.error('Error fetching organizations:', error)
          return []
        }

        return data || []
      }

      // Regular users only see their orgs
      return user.memberships.map(m => m.organizations).filter(Boolean) as Organization[]
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })
}

export function useOrgMembers(orgId: string) {
  return useQuery({
    queryKey: ['org-members', orgId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('org_memberships')
        .select(`
          *,
          user_profiles (
            id,
            email,
            full_name,
            avatar_url
          )
        `)
        .eq('org_id', orgId)
        .order('created_at')

      if (error) {
        console.error('Error fetching org members:', error)
        return []
      }

      return data || []
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
  })
}

export function useSwitchOrganization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newOrgId: string) => {
      setCurrentOrgId(newOrgId)
      return newOrgId
    },
    onSuccess: (newOrgId) => {
      // Invalidate org-related queries
      queryClient.invalidateQueries({ queryKey: ['organization'] })
      queryClient.invalidateQueries({ queryKey: ['modules'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
