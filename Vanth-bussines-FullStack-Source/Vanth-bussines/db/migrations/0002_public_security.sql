-- Banco acessado somente pelo backend com credenciais PostgreSQL privadas.
-- A aplicação usa cookies HttpOnly próprios, não JWTs do Supabase Auth.
-- Portanto, NÃO conceder acesso anon/authenticated nem adicionar policies abertas.
-- Idempotente: pode ser aplicado em instalações novas ou existentes.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.users FROM anon, authenticated;

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.workspaces FROM anon, authenticated;

ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.workspace_members FROM anon, authenticated;

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.sessions FROM anon, authenticated;

ALTER TABLE public.auth_challenges ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.auth_challenges FROM anon, authenticated;

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.rate_limits FROM anon, authenticated;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.projects FROM anon, authenticated;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.tasks FROM anon, authenticated;

ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.subtasks FROM anon, authenticated;

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.tags FROM anon, authenticated;

ALTER TABLE public.task_tags ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.task_tags FROM anon, authenticated;

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.notes FROM anon, authenticated;

ALTER TABLE public.calendar_connections ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.calendar_connections FROM anon, authenticated;

ALTER TABLE public.calendar_sync_states ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.calendar_sync_states FROM anon, authenticated;

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.events FROM anon, authenticated;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.audit_logs FROM anon, authenticated;

-- Tabelas e sequences criadas posteriormente pelo migrador não devem ser
-- expostas automaticamente aos clientes públicos do Supabase.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON SEQUENCES FROM anon, authenticated;
