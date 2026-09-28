-- Public Data API lockdown for Football Life application tables.
-- The app uses Prisma with a dedicated runtime role for data access. Supabase
-- Auth still uses the public client key, but no browser code queries these
-- tables through PostgREST.
--
-- Important:
-- * Keep the existing Supabase/Postgres owner unchanged.
-- * Do not use FORCE ROW LEVEL SECURITY here: Dashboard/Table Editor and
--   provider migrations use privileged/admin paths and must retain control.
-- * This policy separates the Prisma runtime role from public Data API roles;
--   it is not a per-user ownership policy. Server-side user ownership checks
--   remain mandatory in the application.

DO $$
DECLARE
  table_name text;
  app_tables text[] := ARRAY[
    'game_sessions', 'career_players', 'career_seasons', 'wheel_checkpoints',
    'career_events', 'career_commands', 'career_transfer_workflows',
    'career_transfer_negotiations', 'career_honours',
    'career_award_ranking_snapshots', 'leagues', 'clubs', 'national_teams'
  ];
  catalog_tables text[] := ARRAY['leagues', 'clubs', 'national_teams'];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'football_life_runtime') THEN
    RAISE EXCEPTION 'Create role football_life_runtime before applying RLS lockdown';
  END IF;

  GRANT USAGE ON SCHEMA public TO football_life_runtime;
  REVOKE CREATE ON SCHEMA public FROM football_life_runtime;

  FOREACH table_name IN ARRAY app_tables LOOP
    IF to_regclass(format('public.%I', table_name)) IS NULL THEN
      RAISE EXCEPTION 'Expected application table public.% does not exist', table_name;
    END IF;

    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC', table_name);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', table_name);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM authenticated', table_name);
    END IF;

    IF table_name = ANY(catalog_tables) THEN
      -- Reference data is read-only at request time. Catalog writes belong to
      -- the protected seed/migration path, not the application runtime role.
      EXECUTE format(
        'GRANT SELECT ON TABLE public.%I TO football_life_runtime',
        table_name
      );
    ELSE
      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO football_life_runtime',
        table_name
      );
    END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE public.%I NO FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS football_life_runtime_access ON public.%I', table_name);
    EXECUTE format(
      'CREATE POLICY football_life_runtime_access ON public.%I
       FOR ALL TO football_life_runtime
       USING (true)
       WITH CHECK (true)',
      table_name
    );
  END LOOP;

  -- Prisma migration metadata is server-internal and must not be exposed via
  -- PostgREST. It is intentionally not granted to the runtime role.
  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
    REVOKE ALL ON TABLE public._prisma_migrations FROM PUBLIC;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      REVOKE ALL ON TABLE public._prisma_migrations FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      REVOKE ALL ON TABLE public._prisma_migrations FROM authenticated;
    END IF;
  END IF;
END $$;
