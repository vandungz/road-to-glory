-- Prevent future application objects created by the postgres migration owner
-- from silently becoming reachable through Supabase Data API roles.
--
-- This changes only default privileges for future objects owned by postgres in
-- public. It does not alter existing tables, table owners, Supabase-managed
-- supabase_admin defaults, or Dashboard/Table Editor privileges.
-- Every new application table must still explicitly grant the exact runtime
-- privileges and enable RLS in its own migration.

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;
