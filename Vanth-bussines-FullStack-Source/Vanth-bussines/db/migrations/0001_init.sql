CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL UNIQUE, name text NOT NULL,
 password_hash text NOT NULL, email_verified boolean NOT NULL DEFAULT false,
 preferences jsonb NOT NULL DEFAULT '{"timezone":"America/Sao_Paulo","theme":"dark","startWeek":"monday"}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS workspaces (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, owner_id uuid NOT NULL REFERENCES users(id), created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS workspace_members (
 workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE, user_id uuid REFERENCES users(id) ON DELETE CASCADE,
 role text NOT NULL CHECK (role IN ('owner','admin','member')), PRIMARY KEY(workspace_id,user_id)
);
CREATE TABLE IF NOT EXISTS sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 token_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), revoked_at timestamptz,
 user_agent text
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE TABLE IF NOT EXISTS auth_challenges (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 type text NOT NULL CHECK(type IN ('register','login','reset')),
 code_hash text NOT NULL, login_token_hash text, expires_at timestamptz NOT NULL, attempts integer NOT NULL DEFAULT 0,
 last_sent_at timestamptz DEFAULT now(), consumed_at timestamptz, created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS challenges_user_idx ON auth_challenges(user_id,type,created_at DESC);
CREATE TABLE IF NOT EXISTS rate_limits (key text PRIMARY KEY, attempts integer NOT NULL, window_start timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS projects (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 name text NOT NULL, description text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'active', color text DEFAULT '#8b5cf6',
 due_at timestamptz, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS tasks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
 title text NOT NULL, description text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'todo',
 priority text NOT NULL DEFAULT 'medium', due_at timestamptz, completed_at timestamptz,
 created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tasks_workspace_idx ON tasks(workspace_id,due_at,status);
CREATE TABLE IF NOT EXISTS subtasks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
 title text NOT NULL, done boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS tags (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 name text NOT NULL, UNIQUE(workspace_id,name)
);
CREATE TABLE IF NOT EXISTS task_tags (
 task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
 PRIMARY KEY(task_id,tag_id)
);
CREATE TABLE IF NOT EXISTS notes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 title text NOT NULL DEFAULT 'Sem título', content text NOT NULL DEFAULT '', pinned boolean NOT NULL DEFAULT false,
 created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS calendar_connections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 provider text NOT NULL DEFAULT 'google', provider_email text, refresh_token_enc text NOT NULL,
 access_token_enc text, access_expires_at timestamptz, connected_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,provider)
);
CREATE TABLE IF NOT EXISTS calendar_sync_states (
 connection_id uuid NOT NULL REFERENCES calendar_connections(id) ON DELETE CASCADE,
 calendar_id text NOT NULL, sync_token text, last_synced_at timestamptz, PRIMARY KEY(connection_id,calendar_id)
);
CREATE TABLE IF NOT EXISTS events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 title text NOT NULL, description text NOT NULL DEFAULT '', starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
 all_day boolean NOT NULL DEFAULT false, location text NOT NULL DEFAULT '', category text NOT NULL DEFAULT 'meeting',
 source text NOT NULL DEFAULT 'local', connection_id uuid REFERENCES calendar_connections(id) ON DELETE SET NULL,
 google_calendar_id text, google_event_id text, etag text, cancelled boolean NOT NULL DEFAULT false,
 created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(),
 CONSTRAINT ends_after_start CHECK(ends_at > starts_at)
);
CREATE UNIQUE INDEX IF NOT EXISTS events_google_unique ON events(connection_id,google_calendar_id,google_event_id)
 WHERE connection_id IS NOT NULL AND google_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS events_workspace_idx ON events(workspace_id,starts_at);
CREATE TABLE IF NOT EXISTS audit_logs (
 id bigserial PRIMARY KEY, user_id uuid REFERENCES users(id) ON DELETE SET NULL,
 action text NOT NULL, resource text, resource_id text, created_at timestamptz NOT NULL DEFAULT now()
);
