# Production database access model

The repository uses two different database access paths:

- football_life_runtime: a non-owner, non-superuser role used by the
  application through DATABASE_URL. It receives DML only for mutable game
  tables, SELECT only for read-only catalogs, and the RLS policy needed by the
  Prisma runtime.
- Supabase's existing owner/admin path: used by Prisma migrations through
  DIRECT_URL in a protected migration runner. This path is deliberately not
  replaced by a custom owner role.

The provisioning script does not change table ownership. This preserves the
Supabase/Postgres owner used by Dashboard/Table Editor and managed database
operations. Supabase documentation states that Dashboard queries run as
postgres; PostgREST access is controlled by grants and RLS for anon and
authenticated, not by assigning a custom table owner.

Run scripts/provision-production-db-roles.sql once as the database owner/admin.
Set the runtime password out-of-band and never put it in the repository.

## Runtime and migration URLs

- DATABASE_URL: runtime role, normally through the Supabase pooler.
- DIRECT_URL: direct connection for Prisma CLI only, normally the Supabase
  project admin/postgres credential. Keep it in CI or a controlled migration
  runner; it is not required by the deployed request-serving application.
- The application never imports DIRECT_URL into client code.
- prisma.config.ts refuses Prisma database commands when DIRECT_URL is not set,
  so a migration cannot silently fall back to the runtime role.

## RLS boundary

The RLS migration:

1. keeps the existing owner unchanged;
2. revokes app-table access from PUBLIC, anon and authenticated;
3. grants DML only to football_life_runtime for mutable game tables, and
   SELECT only for read-only catalogs (leagues, clubs, national_teams);
4. enables RLS without FORCE ROW LEVEL SECURITY;
5. creates an explicit policy for football_life_runtime;
6. revokes public Data API access to _prisma_migrations when that table exists.

This is a database-role boundary, not a per-user policy. The application must
continue to enforce userId/game ownership in every Server Action and page
loader. The current source uses Prisma for data access and only uses the
Supabase browser/server clients for Auth, so the public Data API does not need
access to these application tables.

Verify in staging before production:

1. Prisma runtime queries succeed with DATABASE_URL.
2. prisma migrate deploy succeeds with DIRECT_URL.
3. Supabase REST requests using anon/authenticated keys return a permission
   denial and cannot read or write any application table.
4. football_life_runtime reports rolsuper=false and rolbypassrls=false.
5. Application table ownership remains the existing Supabase/Postgres owner.
6. Dashboard Table Editor can still read/write a staging fixture as an admin.
7. A two-user IDOR test confirms user B cannot access or mutate user A data.

Do not add a new table without adding its explicit runtime grant, RLS enablement
and policy in the same migration. Do not run both the Prisma RLS migration and
the manual SQL copy as separate production changes.
