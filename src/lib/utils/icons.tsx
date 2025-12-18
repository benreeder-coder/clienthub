import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  GitBranch,
  Send,
  FileText,
  BarChart3,
  Settings,
  Building2,
  Layout,
  Users,
  ScrollText,
  Home,
  type LucideIcon,
} from 'lucide-react'

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  GitBranch,
  Send,
  FileText,
  BarChart3,
  Settings,
  Building2,
  Layout,
  Users,
  ScrollText,
  Home,
}

export function getIconComponent(iconName: string): LucideIcon {
  return iconMap[iconName] || Home
}

// Alias for compatibility
export const getModuleIcon = getIconComponent
