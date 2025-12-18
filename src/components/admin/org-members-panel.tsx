'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import {
  MoreVertical,
  Shield,
  ShieldCheck,
  User,
  UserPlus,
  Mail,
  Trash2,
} from 'lucide-react'

type Role = 'org_admin' | 'org_member' | 'client'

interface Member {
  id: string
  role: Role
  user_profiles: {
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
  } | null
}

interface OrgMembersPanelProps {
  orgId: string
  members: Member[]
}

const roleConfig: Record<Role, { label: string; icon: React.ElementType; color: string }> = {
  org_admin: {
    label: 'Admin',
    icon: ShieldCheck,
    color: 'text-cyber-blue border-cyber-blue/30 bg-cyber-blue/10',
  },
  org_member: {
    label: 'Member',
    icon: User,
    color: 'text-muted-foreground border-border',
  },
  client: {
    label: 'Client',
    icon: Shield,
    color: 'text-cyber-cyan border-cyber-cyan/30 bg-cyber-cyan/10',
  },
}

export function OrgMembersPanel({ orgId, members }: OrgMembersPanelProps) {
  const [memberList, setMemberList] = useState(members)

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return email.slice(0, 2).toUpperCase()
  }

  const handleRoleChange = async (memberId: string, newRole: Role) => {
    // Optimistic update
    setMemberList((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
    )

    // TODO: Call server action
  }

  const handleRemoveMember = async (memberId: string) => {
    // Optimistic update
    setMemberList((prev) => prev.filter((m) => m.id !== memberId))

    // TODO: Call server action
  }

  return (
    <div className="space-y-4">
      <Button variant="outline" className="w-full gap-2">
        <UserPlus className="h-4 w-4" />
        Invite Member
      </Button>

      <div className="space-y-2">
        {memberList.map((member) => {
          const profile = member.user_profiles
          if (!profile) return null

          const roleInfo = roleConfig[member.role as Role] || roleConfig.org_member
          const RoleIcon = roleInfo.icon

          return (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-accent/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name || profile.email}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                    {getInitials(profile.full_name, profile.email)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {profile.full_name || 'Unnamed'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {profile.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn('text-xs', roleInfo.color)}>
                  <RoleIcon className="h-3 w-3 mr-1" />
                  {roleInfo.label}
                </Badge>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[160px]">
                    <DropdownMenuItem
                      onClick={() => handleRoleChange(member.id, 'org_admin')}
                      className="gap-2"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Make Admin
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleRoleChange(member.id, 'org_member')}
                      className="gap-2"
                    >
                      <User className="h-4 w-4" />
                      Make Member
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleRoleChange(member.id, 'client')}
                      className="gap-2"
                    >
                      <Shield className="h-4 w-4" />
                      Make Client
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="gap-2">
                      <Mail className="h-4 w-4" />
                      Send Email
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleRemoveMember(member.id)}
                      className="gap-2 text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )
        })}
      </div>

      {memberList.length === 0 && (
        <div className="text-center py-6 text-muted-foreground">
          <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No members yet</p>
        </div>
      )}
    </div>
  )
}
