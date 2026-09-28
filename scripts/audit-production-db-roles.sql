-- READ-ONLY audit for the production database access model.
-- Run this as the existing Supabase owner/admin in the correct project.
-- It never creates, alters, grants, revokes, drops, or reassigns anything.
-- Do not paste passwords or connection strings into this file.

SELECT current_database() AS database_name, current_user AS connected_role;

-- The old custom role is included only to detect whether an earlier version
-- of the provisioning process was already applied. Do not drop or reassign it
-- based only on this output; inspect dependencies first.
SELECT
  rolname,
  rolsuper,
  rolinherit,
  rolcreaterole,
  rolcreatedb,
  rolreplication,
  rolbypassrls,
  rolcanlogin
FROM pg_roles
WHERE rolname IN ('football_life_runtime', 'football_life_migration')
ORDER BY rolname;

SELECT
  member.rolname AS member_role,
  parent.rolname AS granted_role
FROM pg_auth_members AS membership
JOIN pg_roles AS member ON member.oid = membership.member
JOIN pg_roles AS parent ON parent.oid = membership.roleid
WHERE member.rolname IN ('football_life_runtime', 'football_life_migration')
ORDER BY member_role, granted_role;

-- Any owner other than the existing Supabase/Postgres owner must be reviewed.
-- In particular, football_life_runtime and football_life_migration must not
-- appear as owners in this result.
SELECT
  c.relname AS table_name,
  owner_role.rolname AS owner_role,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class AS c
JOIN pg_namespace AS namespace ON namespace.oid = c.relnamespace
JOIN pg_roles AS owner_role ON owner_role.oid = c.relowner
WHERE namespace.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'game_sessions', 'career_players', 'career_seasons', 'wheel_checkpoints',
    'career_events', 'career_commands', 'career_transfer_workflows',
    'career_transfer_negotiations', 'career_honours',
    'career_award_ranking_snapshots', 'leagues', 'clubs', 'national_teams',
    '_prisma_migrations'
  )
ORDER BY table_name;

-- Effective table grants for the relevant roles. Missing anon/authenticated
-- rows are expected after the lockdown; runtime should have DML on mutable
-- game tables and SELECT only on the three catalogs.
SELECT
  grantee,
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('PUBLIC', 'anon', 'authenticated', 'football_life_runtime', 'football_life_migration')
  AND table_name IN (
    'game_sessions', 'career_players', 'career_seasons', 'wheel_checkpoints',
    'career_events', 'career_commands', 'career_transfer_workflows',
    'career_transfer_negotiations', 'career_honours',
    'career_award_ranking_snapshots', 'leagues', 'clubs', 'national_teams',
    '_prisma_migrations'
  )
ORDER BY grantee, table_name, privilege_type;

SELECT
  namespace.nspname AS schema_name,
  c.relname AS table_name,
  policy.polname AS policy_name,
  policy.polcmd AS command,
  policy.polroles AS role_oids,
  policy.polqual AS using_expression,
  policy.polwithcheck AS check_expression
FROM pg_policy AS policy
JOIN pg_class AS c ON c.oid = policy.polrelid
JOIN pg_namespace AS namespace ON namespace.oid = c.relnamespace
WHERE namespace.nspname = 'public'
  AND c.relname IN (
    'game_sessions', 'career_players', 'career_seasons', 'wheel_checkpoints',
    'career_events', 'career_commands', 'career_transfer_workflows',
    'career_transfer_negotiations', 'career_honours',
    'career_award_ranking_snapshots', 'leagues', 'clubs', 'national_teams'
  )
ORDER BY table_name, policy.polname;

-- Default privileges are project-specific. Review these rows before creating
-- new public tables. New app tables must not silently receive Data API grants.
SELECT
  owner_role.rolname AS owner_role,
  COALESCE(namespace.nspname, '<all schemas>') AS schema_name,
  defaults.defaclobjtype AS object_type,
  defaults.defaclacl AS default_acl
FROM pg_default_acl AS defaults
JOIN pg_roles AS owner_role ON owner_role.oid = defaults.defaclrole
LEFT JOIN pg_namespace AS namespace ON namespace.oid = defaults.defaclnamespace
WHERE defaults.defaclnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
   OR defaults.defaclnamespace IS NULL
ORDER BY owner_role.rolname, schema_name, object_type;
