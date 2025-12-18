export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          settings: Json
          metadata: Json
          is_active: boolean
          onboarding_status: 'pending' | 'in_progress' | 'completed' | 'skipped'
          onboarding_completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          settings?: Json
          metadata?: Json
          is_active?: boolean
          onboarding_status?: 'pending' | 'in_progress' | 'completed' | 'skipped'
          onboarding_completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          logo_url?: string | null
          settings?: Json
          metadata?: Json
          is_active?: boolean
          onboarding_status?: 'pending' | 'in_progress' | 'completed' | 'skipped'
          onboarding_completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          phone: string | null
          timezone: string
          preferences: Json
          is_super_admin: boolean
          last_active_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          timezone?: string
          preferences?: Json
          is_super_admin?: boolean
          last_active_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          timezone?: string
          preferences?: Json
          is_super_admin?: boolean
          last_active_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      org_memberships: {
        Row: {
          id: string
          user_id: string
          org_id: string
          role: 'super_admin' | 'org_admin' | 'org_member' | 'client'
          is_primary: boolean
          invited_by: string | null
          invited_at: string
          accepted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          org_id: string
          role?: 'super_admin' | 'org_admin' | 'org_member' | 'client'
          is_primary?: boolean
          invited_by?: string | null
          invited_at?: string
          accepted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          org_id?: string
          role?: 'super_admin' | 'org_admin' | 'org_member' | 'client'
          is_primary?: boolean
          invited_by?: string | null
          invited_at?: string
          accepted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'org_memberships_org_id_fkey'
            columns: ['org_id']
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'org_memberships_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          }
        ]
      }
      workspace_templates: {
        Row: {
          id: string
          name: string
          description: string | null
          icon: string | null
          is_default: boolean
          is_active: boolean
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          icon?: string | null
          is_default?: boolean
          is_active?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          icon?: string | null
          is_default?: boolean
          is_active?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      template_modules: {
        Row: {
          id: string
          template_id: string
          module_key: string
          display_name: string
          description: string | null
          icon: string | null
          route_path: string
          default_state: 'enabled' | 'locked' | 'hidden'
          sort_order: number
          config: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          template_id: string
          module_key: string
          display_name: string
          description?: string | null
          icon?: string | null
          route_path: string
          default_state?: 'enabled' | 'locked' | 'hidden'
          sort_order?: number
          config?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          template_id?: string
          module_key?: string
          display_name?: string
          description?: string | null
          icon?: string | null
          route_path?: string
          default_state?: 'enabled' | 'locked' | 'hidden'
          sort_order?: number
          config?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'template_modules_template_id_fkey'
            columns: ['template_id']
            referencedRelation: 'workspace_templates'
            referencedColumns: ['id']
          }
        ]
      }
      org_template_assignments: {
        Row: {
          id: string
          org_id: string
          template_id: string
          assigned_by: string | null
          assigned_at: string
        }
        Insert: {
          id?: string
          org_id: string
          template_id: string
          assigned_by?: string | null
          assigned_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          template_id?: string
          assigned_by?: string | null
          assigned_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'org_template_assignments_org_id_fkey'
            columns: ['org_id']
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'org_template_assignments_template_id_fkey'
            columns: ['template_id']
            referencedRelation: 'workspace_templates'
            referencedColumns: ['id']
          }
        ]
      }
      org_modules: {
        Row: {
          id: string
          org_id: string
          module_key: string
          state_override: 'enabled' | 'locked' | 'hidden' | null
          config_override: Json | null
          overridden_by: string | null
          overridden_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          module_key: string
          state_override?: 'enabled' | 'locked' | 'hidden' | null
          config_override?: Json | null
          overridden_by?: string | null
          overridden_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          module_key?: string
          state_override?: 'enabled' | 'locked' | 'hidden' | null
          config_override?: Json | null
          overridden_by?: string | null
          overridden_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'org_modules_org_id_fkey'
            columns: ['org_id']
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          }
        ]
      }
      projects: {
        Row: {
          id: string
          org_id: string
          name: string
          description: string | null
          status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
          start_date: string | null
          end_date: string | null
          budget: number | null
          settings: Json
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          name: string
          description?: string | null
          status?: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
          start_date?: string | null
          end_date?: string | null
          budget?: number | null
          settings?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          name?: string
          description?: string | null
          status?: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
          start_date?: string | null
          end_date?: string | null
          budget?: number | null
          settings?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'projects_org_id_fkey'
            columns: ['org_id']
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          }
        ]
      }
      tasks: {
        Row: {
          id: string
          org_id: string
          project_id: string | null
          title: string
          description: string | null
          status: 'todo' | 'in_progress' | 'review' | 'done' | 'archived'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          due_date: string | null
          assigned_to: string | null
          parent_task_id: string | null
          sort_order: number
          metadata: Json
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          project_id?: string | null
          title: string
          description?: string | null
          status?: 'todo' | 'in_progress' | 'review' | 'done' | 'archived'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          due_date?: string | null
          assigned_to?: string | null
          parent_task_id?: string | null
          sort_order?: number
          metadata?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          project_id?: string | null
          title?: string
          description?: string | null
          status?: 'todo' | 'in_progress' | 'review' | 'done' | 'archived'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          due_date?: string | null
          assigned_to?: string | null
          parent_task_id?: string | null
          sort_order?: number
          metadata?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tasks_org_id_fkey'
            columns: ['org_id']
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_project_id_fkey'
            columns: ['project_id']
            referencedRelation: 'projects'
            referencedColumns: ['id']
          }
        ]
      }
      audit_logs: {
        Row: {
          id: string
          org_id: string | null
          user_id: string | null
          action: string
          resource_type: string
          resource_id: string | null
          old_values: Json | null
          new_values: Json | null
          ip_address: string | null
          user_agent: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          org_id?: string | null
          user_id?: string | null
          action: string
          resource_type: string
          resource_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string | null
          user_id?: string | null
          action?: string
          resource_type?: string
          resource_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          metadata?: Json
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_module_state: {
        Args: {
          target_org_id: string
          target_module_key: string
        }
        Returns: 'enabled' | 'locked' | 'hidden'
      }
      is_module_enabled: {
        Args: {
          target_org_id: string
          target_module_key: string
        }
        Returns: boolean
      }
      user_belongs_to_org: {
        Args: {
          target_org_id: string
        }
        Returns: boolean
      }
      is_org_admin: {
        Args: {
          target_org_id: string
        }
        Returns: boolean
      }
      is_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      get_user_org_ids: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
    }
    Enums: {
      user_role: 'super_admin' | 'org_admin' | 'org_member' | 'client'
      module_state: 'enabled' | 'locked' | 'hidden'
      onboarding_status: 'pending' | 'in_progress' | 'completed' | 'skipped'
      task_status: 'todo' | 'in_progress' | 'review' | 'done' | 'archived'
      task_priority: 'low' | 'medium' | 'high' | 'urgent'
      project_status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
