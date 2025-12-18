'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { MODULE_REGISTRY } from '@/lib/modules/registry'
import type { ModuleState, ResolvedModule } from '@/lib/modules/types'

interface TemplateModuleRow {
  module_key: string
  display_name: string
  description: string | null
  icon: string | null
  route_path: string
  default_state: ModuleState
  sort_order: number
  config: Record<string, unknown>
}

interface OrgModuleRow {
  module_key: string
  state_override: ModuleState | null
  config_override: Record<string, unknown> | null
}

export function useModules(orgId: string | null) {
  return useQuery({
    queryKey: ['modules', orgId],
    queryFn: async (): Promise<ResolvedModule[]> => {
      if (!orgId) return []

      const supabase = createClient()

      // Get template assignment
      const { data: assignment } = await supabase
        .from('org_template_assignments')
        .select('template_id')
        .eq('org_id', orgId)
        .single()

      const templateId = assignment?.template_id

      // Get template modules
      let templateModules: TemplateModuleRow[] = []
      if (templateId) {
        const { data } = await supabase
          .from('template_modules')
          .select('module_key, display_name, description, icon, route_path, default_state, sort_order, config')
          .eq('template_id', templateId)
          .order('sort_order')

        templateModules = (data || []) as TemplateModuleRow[]
      }

      // Get org overrides
      const { data: orgModulesData } = await supabase
        .from('org_modules')
        .select('module_key, state_override, config_override')
        .eq('org_id', orgId)

      const orgModules = (orgModulesData || []) as OrgModuleRow[]

      // Create lookup maps
      const templateMap = new Map(templateModules.map((tm) => [tm.module_key, tm]))
      const overrideMap = new Map(orgModules.map((om) => [om.module_key, om]))

      // Resolve modules
      const resolved = MODULE_REGISTRY.map((definition) => {
        const templateModule = templateMap.get(definition.key)
        const orgOverride = overrideMap.get(definition.key)

        const effectiveState: ModuleState =
          orgOverride?.state_override ??
          templateModule?.default_state ??
          'hidden'

        const effectiveConfig = {
          ...(templateModule?.config || {}),
          ...(orgOverride?.config_override || {}),
        }

        return {
          ...definition,
          displayName: templateModule?.display_name || definition.displayName,
          description: templateModule?.description || definition.description,
          icon: templateModule?.icon || definition.icon,
          routePath: templateModule?.route_path || definition.routePath,
          state: effectiveState,
          isAccessible: effectiveState === 'enabled',
          config: effectiveConfig,
        }
      })

      // Sort by template order
      return resolved.sort((a, b) => {
        const aSort = templateMap.get(a.key)?.sort_order ?? 999
        const bSort = templateMap.get(b.key)?.sort_order ?? 999
        return aSort - bSort
      })
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useModuleState(orgId: string | null, moduleKey: string) {
  const { data: modules } = useModules(orgId)
  const module = modules?.find((m) => m.key === moduleKey)

  return {
    state: module?.state || 'hidden',
    isEnabled: module?.state === 'enabled',
    isLocked: module?.state === 'locked',
    isHidden: module?.state === 'hidden',
    module,
  }
}
