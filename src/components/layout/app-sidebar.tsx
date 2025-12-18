'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ChevronsUpDown,
  LogOut,
  Settings,
  Shield,
  User,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUser } from '@/hooks/use-user'
import { useModules } from '@/hooks/use-modules'
import { useCurrentOrgId, useOrganization, useSwitchOrganization } from '@/hooks/use-organization'
import { createClient } from '@/lib/supabase/client'
import { ADMIN_MODULES } from '@/lib/modules/registry'
import { getIconComponent } from '@/lib/utils/icons'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SidebarModuleItem } from './sidebar-module-item'

export function AppSidebar() {
  const router = useRouter()
  const { data: user, isLoading: userLoading } = useUser()
  const currentOrgId = useCurrentOrgId()
  const { data: currentOrg } = useOrganization(currentOrgId || undefined)
  const { data: modules, isLoading: modulesLoading } = useModules(currentOrgId)

  if (userLoading || !user) {
    return (
      <Sidebar>
        <SidebarHeader>
          <div className="h-12 animate-pulse bg-sidebar-accent rounded-lg" />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {[1, 2, 3, 4, 5].map((i) => (
                  <SidebarMenuItem key={i}>
                    <div className="h-8 animate-pulse bg-sidebar-accent rounded-md" />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    )
  }

  // Filter out hidden modules
  const visibleModules = modules?.filter((m) => m.state !== 'hidden') || []

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <Sidebar>
      {/* Header with org switcher */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent"
                >
                  {/* Logo */}
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyber-blue to-cyber-cyan text-white shadow-glow-sm">
                    <Zap className="size-4" />
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-semibold font-display">ClientHub</span>
                    <span className="text-xs text-muted-foreground">
                      {currentOrg?.name || 'Select workspace'}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width]"
                align="start"
              >
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Workspaces
                </DropdownMenuLabel>
                {user.memberships.map((membership) => (
                  <DropdownMenuItem
                    key={membership.org_id}
                    className="gap-2"
                    onSelect={() => {
                      localStorage.setItem('clienthub-current-org', membership.org_id)
                      router.refresh()
                    }}
                  >
                    <div className="flex size-6 items-center justify-center rounded-sm border bg-background">
                      {membership.organizations?.name?.charAt(0) || '?'}
                    </div>
                    {membership.organizations?.name || 'Unknown'}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Main navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {modulesLoading ? (
                [1, 2, 3, 4].map((i) => (
                  <SidebarMenuItem key={i}>
                    <div className="h-8 animate-pulse bg-sidebar-accent/50 rounded-md" />
                  </SidebarMenuItem>
                ))
              ) : (
                visibleModules.map((module) => (
                  <SidebarModuleItem key={module.key} module={module} />
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin section (only for super admins) */}
        {user.isSuperAdmin && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>
                <Shield className="mr-2 h-3 w-3" />
                Admin
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {ADMIN_MODULES.map((module) => {
                    const Icon = getIconComponent(module.icon)
                    return (
                      <SidebarMenuItem key={module.key}>
                        <SidebarMenuButton asChild>
                          <Link href={module.routePath}>
                            <Icon className="h-4 w-4" />
                            <span>{module.displayName}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      {/* Footer with user menu */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent"
                >
                  {/* Avatar */}
                  <div className="flex aspect-square size-8 items-center justify-center rounded-full bg-gradient-to-br from-cyber-magenta to-cyber-purple text-white text-sm font-medium">
                    {user.profile?.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-medium">
                      {user.profile?.full_name || 'User'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width]"
                side="top"
                align="start"
              >
                <DropdownMenuLabel className="flex items-center gap-2">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-full bg-gradient-to-br from-cyber-magenta to-cyber-purple text-white text-sm font-medium">
                    {user.profile?.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span>{user.profile?.full_name || 'User'}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings/profile" className="gap-2">
                    <User className="size-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="gap-2">
                    <Settings className="size-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gap-2 text-destructive focus:text-destructive"
                  onSelect={handleSignOut}
                >
                  <LogOut className="size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
