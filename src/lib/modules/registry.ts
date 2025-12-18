import type { ModuleDefinition } from './types'

// Static registry of all available modules
export const MODULE_REGISTRY: ModuleDefinition[] = [
  {
    key: 'dashboard',
    displayName: 'Dashboard',
    description: 'Overview and analytics',
    icon: 'LayoutDashboard',
    routePath: '/dashboard',
  },
  {
    key: 'projects',
    displayName: 'Projects',
    description: 'Project management',
    icon: 'FolderKanban',
    routePath: '/projects',
  },
  {
    key: 'tasks',
    displayName: 'Tasks',
    description: 'Task tracking and management',
    icon: 'CheckSquare',
    routePath: '/tasks',
  },
  {
    key: 'workflows',
    displayName: 'Workflows',
    description: 'Automation workflows',
    icon: 'GitBranch',
    routePath: '/workflows',
    requiredPermissions: ['workflows:read'],
  },
  {
    key: 'outreach',
    displayName: 'Outreach',
    description: 'Campaign management',
    icon: 'Send',
    routePath: '/outreach',
    requiredPermissions: ['outreach:read'],
  },
  {
    key: 'documents',
    displayName: 'Documents',
    description: 'File storage and sharing',
    icon: 'FileText',
    routePath: '/documents',
  },
  {
    key: 'analytics',
    displayName: 'Analytics',
    description: 'Reports and insights',
    icon: 'BarChart3',
    routePath: '/analytics',
    requiredPermissions: ['analytics:read'],
  },
  {
    key: 'settings',
    displayName: 'Settings',
    description: 'Workspace settings',
    icon: 'Settings',
    routePath: '/settings',
  },
]

// Admin-only modules (visible only to super admins)
export const ADMIN_MODULES: ModuleDefinition[] = [
  {
    key: 'admin-dashboard',
    displayName: 'Admin Overview',
    description: 'Agency-wide overview',
    icon: 'LayoutDashboard',
    routePath: '/admin',
    adminOnly: true,
  },
  {
    key: 'admin-organizations',
    displayName: 'Clients',
    description: 'Client directory',
    icon: 'Building2',
    routePath: '/admin/organizations',
    adminOnly: true,
  },
  {
    key: 'admin-templates',
    displayName: 'Templates',
    description: 'Workspace templates',
    icon: 'Layout',
    routePath: '/admin/templates',
    adminOnly: true,
  },
  {
    key: 'admin-users',
    displayName: 'Users',
    description: 'User management',
    icon: 'Users',
    routePath: '/admin/users',
    adminOnly: true,
  },
  {
    key: 'admin-audit',
    displayName: 'Audit Logs',
    description: 'Security audit logs',
    icon: 'ScrollText',
    routePath: '/admin/audit-logs',
    adminOnly: true,
  },
]

// Route to module key mapping for guards
export const ROUTE_TO_MODULE: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/projects': 'projects',
  '/tasks': 'tasks',
  '/workflows': 'workflows',
  '/outreach': 'outreach',
  '/documents': 'documents',
  '/analytics': 'analytics',
  '/settings': 'settings',
}

// Get module definition by key
export function getModuleDefinition(key: string): ModuleDefinition | undefined {
  return MODULE_REGISTRY.find((m) => m.key === key)
}

// Get module key from route path
export function getModuleKeyFromRoute(pathname: string): string | undefined {
  // Handle dynamic routes like /projects/123
  const basePath = '/' + pathname.split('/')[1]
  return ROUTE_TO_MODULE[basePath]
}

// Get all module keys
export function getAllModuleKeys(): string[] {
  return MODULE_REGISTRY.map((m) => m.key)
}
