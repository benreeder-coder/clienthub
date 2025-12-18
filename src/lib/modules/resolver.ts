import { createClient } from '@/lib/supabase/server'
import { MODULE_REGISTRY, getModuleDefinition } from './registry'
import type { ModuleState, ResolvedModule, ModuleContext } from './types'

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

// Server-side module resolver
export async function resolveModulesForOrg(orgId: string): Promise<ResolvedModule[]> {
  const supabase = await createClient()

  // Get template assignment for this org
  const { data: assignment } = await supabase
    .from('org_template_assignments')
    .select('template_id')
    .eq('org_id', orgId)
    .single()

  const templateId = assignment?.template_id

  // Fetch template modules if template is assigned
  let templateModules: TemplateModuleRow[] = []
  if (templateId) {
    const { data } = await supabase
      .from('template_modules')
      .select('module_key, display_name, description, icon, route_path, default_state, sort_order, config')
      .eq('template_id', templateId)
      .order('sort_order')

    templateModules = (data || []) as TemplateModuleRow[]
  }

  // Fetch org-level overrides
  const { data: orgModulesData } = await supabase
    .from('org_modules')
    .select('module_key, state_override, config_override')
    .eq('org_id', orgId)

  const orgModules = (orgModulesData || []) as OrgModuleRow[]

  // Create lookup maps
  const templateMap = new Map<string, TemplateModuleRow>(
    templateModules.map((tm) => [tm.module_key, tm])
  )
  const overrideMap = new Map<string, OrgModuleRow>(
    orgModules.map((om) => [om.module_key, om])
  )

  // Resolve each module from registry
  const resolvedModules: ResolvedModule[] = MODULE_REGISTRY.map((definition) => {
    const templateModule = templateMap.get(definition.key)
    const orgOverride = overrideMap.get(definition.key)

    // Effective state: org override ?? template default ?? 'hidden'
    const effectiveState: ModuleState =
      orgOverride?.state_override ??
      templateModule?.default_state ??
      'hidden'

    // Effective config: merge template config with org override
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

  // Sort by template sort order if available
  return resolvedModules.sort((a, b) => {
    const aSort = templateMap.get(a.key)?.sort_order ?? 999
    const bSort = templateMap.get(b.key)?.sort_order ?? 999
    return aSort - bSort
  })
}

// Get single module state (optimized for guards)
export async function resolveModuleState(
  orgId: string,
  moduleKey: string
): Promise<ModuleState> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_module_state', {
    target_org_id: orgId,
    target_module_key: moduleKey,
  })

  if (error) {
    console.error('Error resolving module state:', error)
    return 'hidden' // Fail closed
  }

  return data as ModuleState
}

// Check if module is accessible (for guards)
export async function isModuleAccessible(
  orgId: string,
  moduleKey: string
): Promise<boolean> {
  const state = await resolveModuleState(orgId, moduleKey)
  return state === 'enabled'
}

// Create module context for client components
export async function createModuleContext(orgId: string): Promise<ModuleContext> {
  const modules = await resolveModulesForOrg(orgId)

  return {
    orgId,
    modules,
    getModule: (key: string) => modules.find((m) => m.key === key),
    isModuleEnabled: (key: string) =>
      modules.find((m) => m.key === key)?.state === 'enabled',
    isModuleLocked: (key: string) =>
      modules.find((m) => m.key === key)?.state === 'locked',
    isModuleHidden: (key: string) =>
      modules.find((m) => m.key === key)?.state === 'hidden',
  }
}

// Deep merge utility for config
function deepMerge<T extends Record<string, unknown>>(
  base: T,
  override: Partial<T>
): T {
  const result = { ...base }

  for (const key in override) {
    if (Object.prototype.hasOwnProperty.call(override, key)) {
      const baseValue = base[key]
      const overrideValue = override[key]

      if (
        typeof baseValue === 'object' &&
        baseValue !== null &&
        typeof overrideValue === 'object' &&
        overrideValue !== null &&
        !Array.isArray(baseValue) &&
        !Array.isArray(overrideValue)
      ) {
        result[key] = deepMerge(
          baseValue as Record<string, unknown>,
          overrideValue as Record<string, unknown>
        ) as T[Extract<keyof T, string>]
      } else if (overrideValue !== undefined) {
        result[key] = overrideValue as T[Extract<keyof T, string>]
      }
    }
  }

  return result
}
