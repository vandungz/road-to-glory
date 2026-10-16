-- Run once as the Supabase database owner/admin.
--
-- This provisions only the application runtime role. It deliberately does
-- not change table ownership and does not create a custom migration owner.
-- Supabase-managed Dashboard/Table Editor and provider migrations retain the
-- existing owner/admin path. Prisma migrations use the provider's direct
-- admin connection through DIRECT_URL in a migration-only runner.
--
-- Set the runtime password through an interactive psql session or provider
-- secret manager; never add it to this file or to git.

DO $$
DECLARE
  runtime_role RECORD;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'football_life_runtime') THEN
    CREATE ROLE football_life_runtime
      LOGIN
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOINHERIT
      NOREPLICATION
      NOBYPASSRLS;
  ELSE
    -- Supabase SQL Editor cannot reliably ALTER roles with protected role
    -- attributes. Never try to repair an existing role by force here.
    -- Inspect it first and stop if it is not already a safe runtime role.
    SELECT
      rolsuper,
      rolcreatedb,
      rolcreaterole,
      rolreplication,
      rolbypassrls,
      rolcanlogin
    INTO runtime_role
    FROM pg_roles
    WHERE rolname = 'football_life_runtime';

    IF runtime_role.rolsuper
      OR runtime_role.rolcreatedb
      OR runtime_role.rolcreaterole
      OR runtime_role.rolreplication
      OR runtime_role.rolbypassrls
      OR NOT runtime_role.rolcanlogin THEN
      RAISE EXCEPTION
        'football_life_runtime exists with unsafe role attributes; run scripts/audit-production-db-roles.sql and repair it through the provider-supported admin path before continuing';
    END IF;
  END IF;
END $$;

-- Use the database the admin session is actually connected to. Do not assume
-- every Supabase-compatible environment names it "postgres".
DO $$
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO football_life_runtime', current_database());
END $$;

GRANT USAGE ON SCHEMA public TO football_life_runtime;
REVOKE CREATE ON SCHEMA public FROM football_life_runtime;

-- The role is created without memberships. If this role already existed,
-- inspect pg_auth_members with scripts/audit-production-db-roles.sql before
-- revoking anything; do not mutate Supabase-managed role memberships blindly.

-- No table ownership changes happen here. Table grants, RLS and the explicit
-- app-table allowlist are applied by the versioned Prisma migration.

-- Verification result. This deliberately verifies only what this script owns:
-- role attributes and database/schema privileges. It does not claim that the
-- app-table grants/RLS are ready; those belong to the versioned migration.
SELECT
  current_database() AS database_name,
  current_user AS executed_as,
  r.rolname,
  r.rolsuper,
  r.rolcreatedb,
  r.rolcreaterole,
  r.rolreplication,
  r.rolbypassrls,
  r.rolcanlogin,
  has_database_privilege(r.rolname, current_database(), 'CONNECT') AS can_connect,
  has_schema_privilege(r.rolname, 'public', 'USAGE') AS public_schema_usage,
  has_schema_privilege(r.rolname, 'public', 'CREATE') AS public_schema_create
FROM pg_roles AS r
WHERE r.rolname = 'football_life_runtime';

-- After this script, set the password out-of-band. Never put it in this file:
-- it is tracked in git and SQL Editor history may retain it.
