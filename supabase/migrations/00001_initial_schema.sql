-- =============================================================================
-- CLIENTHUB DATABASE SCHEMA
-- Multi-tenant client portal with RBAC and Row-Level Security
-- =============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE user_role AS ENUM ('super_admin', 'org_admin', 'org_member', 'client');
CREATE TYPE module_state AS ENUM ('enabled', 'locked', 'hidden');
CREATE TYPE onboarding_status AS ENUM ('pending', 'in_progress', 'completed', 'skipped');
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'review', 'done', 'archived');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE project_status AS ENUM ('planning', 'active', 'on_hold', 'completed', 'cancelled');
CREATE TYPE workflow_status AS ENUM ('draft', 'active', 'paused', 'completed');

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Organizations (Tenants)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    onboarding_status onboarding_status DEFAULT 'pending',
    onboarding_completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_is_active ON organizations(is_active);

-- User profiles (extends Supabase auth.users)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    timezone TEXT DEFAULT 'UTC',
    preferences JSONB DEFAULT '{}',
    is_super_admin BOOLEAN DEFAULT false,
    last_active_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_is_super_admin ON user_profiles(is_super_admin);

-- Organization memberships (users belong to orgs with roles)
CREATE TABLE org_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'org_member',
    is_primary BOOLEAN DEFAULT false,
    invited_by UUID REFERENCES user_profiles(id),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, org_id)
);

CREATE INDEX idx_org_memberships_user_id ON org_memberships(user_id);
CREATE INDEX idx_org_memberships_org_id ON org_memberships(org_id);
CREATE INDEX idx_org_memberships_role ON org_memberships(role);

-- =============================================================================
-- MODULE/TEMPLATE SYSTEM
-- =============================================================================

-- Workspace templates (template definitions)
CREATE TABLE workspace_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template modules (default modules per template)
CREATE TABLE template_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES workspace_templates(id) ON DELETE CASCADE,
    module_key TEXT NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    route_path TEXT NOT NULL,
    default_state module_state DEFAULT 'enabled',
    sort_order INTEGER DEFAULT 0,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(template_id, module_key)
);

CREATE INDEX idx_template_modules_template_id ON template_modules(template_id);
CREATE INDEX idx_template_modules_module_key ON template_modules(module_key);

-- Org template assignments (which template assigned to org)
CREATE TABLE org_template_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES workspace_templates(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES user_profiles(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(org_id)
);

CREATE INDEX idx_org_template_assignments_org_id ON org_template_assignments(org_id);
CREATE INDEX idx_org_template_assignments_template_id ON org_template_assignments(template_id);

-- Org modules (per-org module overrides)
CREATE TABLE org_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    module_key TEXT NOT NULL,
    state_override module_state,
    config_override JSONB,
    overridden_by UUID REFERENCES user_profiles(id),
    overridden_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(org_id, module_key)
);

CREATE INDEX idx_org_modules_org_id ON org_modules(org_id);
CREATE INDEX idx_org_modules_module_key ON org_modules(module_key);

-- =============================================================================
-- BUSINESS TABLES
-- =============================================================================

-- Projects
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status project_status DEFAULT 'planning',
    start_date DATE,
    end_date DATE,
    budget DECIMAL(12, 2),
    settings JSONB DEFAULT '{}',
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_org_id ON projects(org_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_by ON projects(created_by);

-- Tasks
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    status task_status DEFAULT 'todo',
    priority task_priority DEFAULT 'medium',
    due_date TIMESTAMPTZ,
    assigned_to UUID REFERENCES user_profiles(id),
    parent_task_id UUID REFERENCES tasks(id),
    sort_order INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_org_id ON tasks(org_id);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);

-- Workflows
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status workflow_status DEFAULT 'draft',
    trigger_config JSONB DEFAULT '{}',
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workflows_org_id ON workflows(org_id);
CREATE INDEX idx_workflows_status ON workflows(status);

-- Workflow steps
CREATE TABLE workflow_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    step_type TEXT NOT NULL,
    config JSONB DEFAULT '{}',
    sort_order INTEGER DEFAULT 0,
    next_step_id UUID REFERENCES workflow_steps(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workflow_steps_workflow_id ON workflow_steps(workflow_id);

-- Outreach campaigns
CREATE TABLE outreach_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    campaign_type TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    config JSONB DEFAULT '{}',
    stats JSONB DEFAULT '{}',
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_outreach_campaigns_org_id ON outreach_campaigns(org_id);

-- Documents/Files
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT,
    file_size BIGINT,
    storage_bucket TEXT DEFAULT 'documents',
    metadata JSONB DEFAULT '{}',
    uploaded_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_org_id ON documents(org_id);
CREATE INDEX idx_documents_project_id ON documents(project_id);

-- =============================================================================
-- ONBOARDING & EVENTS
-- =============================================================================

-- Onboarding workflows
CREATE TABLE onboarding_workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    current_step INTEGER DEFAULT 1,
    total_steps INTEGER DEFAULT 5,
    completed_steps JSONB DEFAULT '[]',
    status onboarding_status DEFAULT 'pending',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_onboarding_workflows_org_id ON onboarding_workflows(org_id);

-- Onboarding events (event-driven)
CREATE TABLE onboarding_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    workflow_id UUID REFERENCES onboarding_workflows(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}',
    triggered_by UUID REFERENCES user_profiles(id),
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_onboarding_events_org_id ON onboarding_events(org_id);
CREATE INDEX idx_onboarding_events_processed ON onboarding_events(processed);
CREATE INDEX idx_onboarding_events_event_type ON onboarding_events(event_type);

-- =============================================================================
-- AUDIT LOGS
-- =============================================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_org_id ON audit_logs(org_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Check if current user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM user_profiles WHERE id = auth.uid()),
    false
  )
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Get user's org IDs they belong to
CREATE OR REPLACE FUNCTION public.get_user_org_ids()
RETURNS UUID[] AS $$
  SELECT COALESCE(
    ARRAY(SELECT org_id FROM org_memberships WHERE user_id = auth.uid()),
    '{}'::UUID[]
  )
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Check if user belongs to an org
CREATE OR REPLACE FUNCTION public.user_belongs_to_org(target_org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_memberships
    WHERE user_id = auth.uid()
    AND org_id = target_org_id
  )
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Get user's role in an org
CREATE OR REPLACE FUNCTION public.get_user_org_role(target_org_id UUID)
RETURNS user_role AS $$
  SELECT role FROM org_memberships
  WHERE user_id = auth.uid()
  AND org_id = target_org_id
  LIMIT 1
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Check if user is org admin
CREATE OR REPLACE FUNCTION public.is_org_admin(target_org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_memberships
    WHERE user_id = auth.uid()
    AND org_id = target_org_id
    AND role IN ('org_admin', 'super_admin')
  ) OR (SELECT public.is_super_admin())
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Get effective module state for an org
CREATE OR REPLACE FUNCTION public.get_module_state(target_org_id UUID, target_module_key TEXT)
RETURNS module_state AS $$
DECLARE
  override_state module_state;
  template_state module_state;
BEGIN
  -- Check for org-level override first
  SELECT state_override INTO override_state
  FROM org_modules
  WHERE org_id = target_org_id AND module_key = target_module_key;

  IF override_state IS NOT NULL THEN
    RETURN override_state;
  END IF;

  -- Fall back to template default
  SELECT tm.default_state INTO template_state
  FROM template_modules tm
  JOIN org_template_assignments ota ON ota.template_id = tm.template_id
  WHERE ota.org_id = target_org_id AND tm.module_key = target_module_key;

  -- Return template state or 'hidden' if no assignment
  RETURN COALESCE(template_state, 'hidden');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if module is accessible (enabled) for an org
CREATE OR REPLACE FUNCTION public.is_module_enabled(target_org_id UUID, target_module_key TEXT)
RETURNS BOOLEAN AS $$
  SELECT public.get_module_state(target_org_id, target_module_key) = 'enabled'
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_template_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- ORGANIZATIONS POLICIES
-- -----------------------------------------------------------------------------

CREATE POLICY "Super admins can view all organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING ((SELECT public.is_super_admin()));

CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (id = ANY((SELECT public.get_user_org_ids())));

CREATE POLICY "Super admins can create organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_super_admin()));

CREATE POLICY "Super admins can update organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_super_admin()));

CREATE POLICY "Super admins can delete organizations"
  ON organizations FOR DELETE
  TO authenticated
  USING ((SELECT public.is_super_admin()));

-- -----------------------------------------------------------------------------
-- USER PROFILES POLICIES
-- -----------------------------------------------------------------------------

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Super admins can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING ((SELECT public.is_super_admin()));

CREATE POLICY "Users can view org member profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT om.user_id FROM org_memberships om
      WHERE om.org_id = ANY((SELECT public.get_user_org_ids()))
    )
  );

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Super admins can update any profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_super_admin()));

-- -----------------------------------------------------------------------------
-- ORG MEMBERSHIPS POLICIES
-- -----------------------------------------------------------------------------

CREATE POLICY "Users can view org memberships"
  ON org_memberships FOR SELECT
  TO authenticated
  USING (org_id = ANY((SELECT public.get_user_org_ids())));

CREATE POLICY "Super admins can view all memberships"
  ON org_memberships FOR SELECT
  TO authenticated
  USING ((SELECT public.is_super_admin()));

CREATE POLICY "Org admins can insert memberships"
  ON org_memberships FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.is_org_admin(org_id))
  );

CREATE POLICY "Org admins can update memberships"
  ON org_memberships FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_org_admin(org_id)));

CREATE POLICY "Org admins can delete memberships"
  ON org_memberships FOR DELETE
  TO authenticated
  USING ((SELECT public.is_org_admin(org_id)));

-- -----------------------------------------------------------------------------
-- WORKSPACE TEMPLATES POLICIES
-- -----------------------------------------------------------------------------

CREATE POLICY "Anyone can view active templates"
  ON workspace_templates FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Super admins can manage templates"
  ON workspace_templates FOR ALL
  TO authenticated
  USING ((SELECT public.is_super_admin()));

-- -----------------------------------------------------------------------------
-- TEMPLATE MODULES POLICIES
-- -----------------------------------------------------------------------------

CREATE POLICY "Anyone can view template modules"
  ON template_modules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admins can manage template modules"
  ON template_modules FOR ALL
  TO authenticated
  USING ((SELECT public.is_super_admin()));

-- -----------------------------------------------------------------------------
-- ORG TEMPLATE ASSIGNMENTS POLICIES
-- -----------------------------------------------------------------------------

CREATE POLICY "Users can view their org template assignments"
  ON org_template_assignments FOR SELECT
  TO authenticated
  USING (org_id = ANY((SELECT public.get_user_org_ids())));

CREATE POLICY "Super admins can view all assignments"
  ON org_template_assignments FOR SELECT
  TO authenticated
  USING ((SELECT public.is_super_admin()));

CREATE POLICY "Super admins can manage template assignments"
  ON org_template_assignments FOR ALL
  TO authenticated
  USING ((SELECT public.is_super_admin()));

-- -----------------------------------------------------------------------------
-- ORG MODULES POLICIES
-- -----------------------------------------------------------------------------

CREATE POLICY "Users can view their org modules"
  ON org_modules FOR SELECT
  TO authenticated
  USING (org_id = ANY((SELECT public.get_user_org_ids())));

CREATE POLICY "Super admins can view all org modules"
  ON org_modules FOR SELECT
  TO authenticated
  USING ((SELECT public.is_super_admin()));

CREATE POLICY "Super admins can manage org modules"
  ON org_modules FOR ALL
  TO authenticated
  USING ((SELECT public.is_super_admin()));

-- -----------------------------------------------------------------------------
-- PROJECTS POLICIES
-- -----------------------------------------------------------------------------

CREATE POLICY "Users can view org projects"
  ON projects FOR SELECT
  TO authenticated
  USING (
    (org_id = ANY((SELECT public.get_user_org_ids()))
     AND (SELECT public.is_module_enabled(org_id, 'projects')))
    OR (SELECT public.is_super_admin())
  );

CREATE POLICY "Org members can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.user_belongs_to_org(org_id))
    AND (SELECT public.is_module_enabled(org_id, 'projects'))
  );

CREATE POLICY "Org members can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    ((SELECT public.user_belongs_to_org(org_id))
     AND (SELECT public.is_module_enabled(org_id, 'projects')))
    OR (SELECT public.is_super_admin())
  );

CREATE POLICY "Org admins can delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (
    (SELECT public.is_org_admin(org_id))
    OR (SELECT public.is_super_admin())
  );

-- -----------------------------------------------------------------------------
-- TASKS POLICIES
-- -----------------------------------------------------------------------------

CREATE POLICY "Users can view org tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    (org_id = ANY((SELECT public.get_user_org_ids()))
     AND (SELECT public.is_module_enabled(org_id, 'tasks')))
    OR (SELECT public.is_super_admin())
  );

CREATE POLICY "Org members can create tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.user_belongs_to_org(org_id))
    AND (SELECT public.is_module_enabled(org_id, 'tasks'))
  );

CREATE POLICY "Org members can update tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    ((SELECT public.user_belongs_to_org(org_id))
     AND (SELECT public.is_module_enabled(org_id, 'tasks')))
    OR (SELECT public.is_super_admin())
  );

CREATE POLICY "Org admins can delete tasks"
  ON tasks FOR DELETE
  TO authenticated
  USING (
    (SELECT public.is_org_admin(org_id))
    OR (SELECT public.is_super_admin())
  );

-- -----------------------------------------------------------------------------
-- WORKFLOWS POLICIES
-- -----------------------------------------------------------------------------

CREATE POLICY "Users can view org workflows"
  ON workflows FOR SELECT
  TO authenticated
  USING (
    (org_id = ANY((SELECT public.get_user_org_ids()))
     AND (SELECT public.is_module_enabled(org_id, 'workflows')))
    OR (SELECT public.is_super_admin())
  );

CREATE POLICY "Org admins can manage workflows"
  ON workflows FOR ALL
  TO authenticated
  USING (
    ((SELECT public.is_org_admin(org_id))
     AND (SELECT public.is_module_enabled(org_id, 'workflows')))
    OR (SELECT public.is_super_admin())
  );

-- Workflow steps inherit from parent workflow
CREATE POLICY "Users can view workflow steps"
  ON workflow_steps FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workflows w
      WHERE w.id = workflow_id
      AND (
        (w.org_id = ANY((SELECT public.get_user_org_ids()))
         AND (SELECT public.is_module_enabled(w.org_id, 'workflows')))
        OR (SELECT public.is_super_admin())
      )
    )
  );

-- -----------------------------------------------------------------------------
-- OUTREACH CAMPAIGNS POLICIES
-- -----------------------------------------------------------------------------

CREATE POLICY "Users can view org outreach campaigns"
  ON outreach_campaigns FOR SELECT
  TO authenticated
  USING (
    (org_id = ANY((SELECT public.get_user_org_ids()))
     AND (SELECT public.is_module_enabled(org_id, 'outreach')))
    OR (SELECT public.is_super_admin())
  );

CREATE POLICY "Org members can manage outreach campaigns"
  ON outreach_campaigns FOR ALL
  TO authenticated
  USING (
    ((SELECT public.user_belongs_to_org(org_id))
     AND (SELECT public.is_module_enabled(org_id, 'outreach')))
    OR (SELECT public.is_super_admin())
  );

-- -----------------------------------------------------------------------------
-- DOCUMENTS POLICIES
-- -----------------------------------------------------------------------------

CREATE POLICY "Users can view org documents"
  ON documents FOR SELECT
  TO authenticated
  USING (
    (org_id = ANY((SELECT public.get_user_org_ids()))
     AND (SELECT public.is_module_enabled(org_id, 'documents')))
    OR (SELECT public.is_super_admin())
  );

CREATE POLICY "Org members can upload documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.user_belongs_to_org(org_id))
    AND (SELECT public.is_module_enabled(org_id, 'documents'))
  );

CREATE POLICY "Org members can update documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (
    ((SELECT public.user_belongs_to_org(org_id))
     AND (SELECT public.is_module_enabled(org_id, 'documents')))
    OR (SELECT public.is_super_admin())
  );

CREATE POLICY "Org admins can delete documents"
  ON documents FOR DELETE
  TO authenticated
  USING (
    (SELECT public.is_org_admin(org_id))
    OR (SELECT public.is_super_admin())
  );

-- -----------------------------------------------------------------------------
-- ONBOARDING POLICIES
-- -----------------------------------------------------------------------------

CREATE POLICY "Users can view their org onboarding"
  ON onboarding_workflows FOR SELECT
  TO authenticated
  USING (
    org_id = ANY((SELECT public.get_user_org_ids()))
    OR (SELECT public.is_super_admin())
  );

CREATE POLICY "Org admins can manage onboarding"
  ON onboarding_workflows FOR ALL
  TO authenticated
  USING (
    (SELECT public.is_org_admin(org_id))
    OR (SELECT public.is_super_admin())
  );

CREATE POLICY "Users can view onboarding events"
  ON onboarding_events FOR SELECT
  TO authenticated
  USING (
    org_id = ANY((SELECT public.get_user_org_ids()))
    OR (SELECT public.is_super_admin())
  );

CREATE POLICY "System can manage onboarding events"
  ON onboarding_events FOR ALL
  TO authenticated
  USING (
    (SELECT public.is_org_admin(org_id))
    OR (SELECT public.is_super_admin())
  );

-- -----------------------------------------------------------------------------
-- AUDIT LOGS POLICIES
-- -----------------------------------------------------------------------------

CREATE POLICY "Super admins can view all audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING ((SELECT public.is_super_admin()));

CREATE POLICY "Org admins can view org audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    org_id IS NOT NULL
    AND (SELECT public.is_org_admin(org_id))
  );

-- =============================================================================
-- TRIGGERS FOR AUTOMATIC AUDIT LOGGING
-- =============================================================================

CREATE OR REPLACE FUNCTION public.audit_log_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (org_id, user_id, action, resource_type, resource_id, new_values)
    VALUES (
      COALESCE(NEW.org_id, NULL),
      auth.uid(),
      'CREATE',
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (org_id, user_id, action, resource_type, resource_id, old_values, new_values)
    VALUES (
      COALESCE(NEW.org_id, OLD.org_id, NULL),
      auth.uid(),
      'UPDATE',
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (org_id, user_id, action, resource_type, resource_id, old_values)
    VALUES (
      COALESCE(OLD.org_id, NULL),
      auth.uid(),
      'DELETE',
      TG_TABLE_NAME,
      OLD.id,
      to_jsonb(OLD)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to important tables
CREATE TRIGGER audit_projects
  AFTER INSERT OR UPDATE OR DELETE ON projects
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_tasks
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_workflows
  AFTER INSERT OR UPDATE OR DELETE ON workflows
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_org_memberships
  AFTER INSERT OR UPDATE OR DELETE ON org_memberships
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- =============================================================================
-- TRIGGER FOR UPDATED_AT
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER set_updated_at_organizations
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at_user_profiles
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at_org_memberships
  BEFORE UPDATE ON org_memberships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at_projects
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at_tasks
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at_workflows
  BEFORE UPDATE ON workflows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at_workflow_steps
  BEFORE UPDATE ON workflow_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at_documents
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at_org_modules
  BEFORE UPDATE ON org_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at_workspace_templates
  BEFORE UPDATE ON workspace_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at_template_modules
  BEFORE UPDATE ON template_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================================================
-- TRIGGER TO AUTO-CREATE USER PROFILE ON SIGNUP
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- SEED DATA FOR DEFAULT TEMPLATE
-- =============================================================================

INSERT INTO workspace_templates (id, name, description, is_default, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Standard Client Portal',
  'Default template with all standard modules',
  true,
  true
);

INSERT INTO template_modules (template_id, module_key, display_name, description, icon, route_path, default_state, sort_order)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'dashboard', 'Dashboard', 'Overview and analytics', 'LayoutDashboard', '/dashboard', 'enabled', 1),
  ('00000000-0000-0000-0000-000000000001', 'projects', 'Projects', 'Project management', 'FolderKanban', '/projects', 'enabled', 2),
  ('00000000-0000-0000-0000-000000000001', 'tasks', 'Tasks', 'Task tracking and management', 'CheckSquare', '/tasks', 'enabled', 3),
  ('00000000-0000-0000-0000-000000000001', 'workflows', 'Workflows', 'Automation workflows', 'GitBranch', '/workflows', 'locked', 4),
  ('00000000-0000-0000-0000-000000000001', 'outreach', 'Outreach', 'Campaign management', 'Send', '/outreach', 'locked', 5),
  ('00000000-0000-0000-0000-000000000001', 'documents', 'Documents', 'File storage and sharing', 'FileText', '/documents', 'enabled', 6),
  ('00000000-0000-0000-0000-000000000001', 'analytics', 'Analytics', 'Reports and insights', 'BarChart3', '/analytics', 'hidden', 7),
  ('00000000-0000-0000-0000-000000000001', 'settings', 'Settings', 'Workspace settings', 'Settings', '/settings', 'enabled', 8);
