'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getIconComponent } from '@/lib/utils/icons'
import type { ResolvedModule } from '@/lib/modules/types'
import {
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface SidebarModuleItemProps {
  module: ResolvedModule
}

export function SidebarModuleItem({ module }: SidebarModuleItemProps) {
  const pathname = usePathname()
  const isActive = pathname.startsWith(module.routePath)
  const isLocked = module.state === 'locked'

  const Icon = getIconComponent(module.icon)

  // Locked module - show with lock icon and disabled state
  if (isLocked) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarMenuItem>
              <Link href={`/modules/locked?module=${module.key}`}>
                <SidebarMenuButton
                  className={cn(
                    'opacity-50 hover:opacity-60 cursor-pointer',
                    'hover:bg-sidebar-accent/50'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1">{module.displayName}</span>
                  <Lock className="h-3 w-3 text-muted-foreground" />
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            <p className="font-medium">{module.displayName} is locked</p>
            <p className="text-xs text-muted-foreground mt-1">
              {module.description}
            </p>
            <p className="text-xs text-primary mt-2">
              Click to request access
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Enabled module - normal clickable link
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        className={cn(
          isActive && 'bg-sidebar-accent shadow-glow-sm border-l-2 border-primary'
        )}
      >
        <Link href={module.routePath}>
          <Icon className={cn('h-4 w-4', isActive && 'text-primary')} />
          <span>{module.displayName}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
