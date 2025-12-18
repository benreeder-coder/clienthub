// Module state types
export type ModuleState = 'enabled' | 'locked' | 'hidden'

// Module definition from registry
export interface ModuleDefinition {
  key: string
  displayName: string
  description: string
  icon: string
  routePath: string
  requiredPermissions?: string[]
  adminOnly?: boolean
}

// Resolved module with effective state
export interface ResolvedModule extends ModuleDefinition {
  state: ModuleState
  isAccessible: boolean // enabled && has permissions
  config: Record<string, unknown>
}

// Module context for the current org
export interface ModuleContext {
  orgId: string
  modules: ResolvedModule[]
  getModule: (key: string) => ResolvedModule | undefined
  isModuleEnabled: (key: string) => boolean
  isModuleLocked: (key: string) => boolean
  isModuleHidden: (key: string) => boolean
}

// Template with its modules
export interface WorkspaceTemplate {
  id: string
  name: string
  description: string | null
  icon: string | null
  isDefault: boolean
  isActive: boolean
  modules: TemplateModule[]
}

// Module configuration in a template
export interface TemplateModule {
  id: string
  templateId: string
  moduleKey: string
  displayName: string
  description: string | null
  icon: string | null
  routePath: string
  defaultState: ModuleState
  sortOrder: number
  config: Record<string, unknown>
}

// Org-level module override
export interface OrgModuleOverride {
  id: string
  orgId: string
  moduleKey: string
  stateOverride: ModuleState | null
  configOverride: Record<string, unknown> | null
}
