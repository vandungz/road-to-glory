CREATE TABLE "pve_players" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "eraStart" INTEGER NOT NULL,
    "eraEnd" INTEGER NOT NULL,
    "overall" INTEGER NOT NULL,
    "stats" JSONB NOT NULL,

    CONSTRAINT "pve_players_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pve_tournaments" (
    "id" UUID NOT NULL,
    "gameSessionId" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "state" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pve_tournaments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pve_tournaments_gameSessionId_key"
  ON "pve_tournaments"("gameSessionId");
CREATE INDEX "pve_players_position_overall_idx"
  ON "pve_players"("position", "overall");
CREATE INDEX "pve_tournaments_userId_status_idx"
  ON "pve_tournaments"("userId", "status");

ALTER TABLE "pve_tournaments"
  ADD CONSTRAINT "pve_tournaments_gameSessionId_fkey"
  FOREIGN KEY ("gameSessionId") REFERENCES "game_sessions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'football_life_runtime') THEN
    RAISE EXCEPTION 'Create role football_life_runtime before applying PvE migration';
  END IF;

  REVOKE ALL ON TABLE "pve_players", "pve_tournaments" FROM PUBLIC;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "pve_players", "pve_tournaments" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "pve_players", "pve_tournaments" FROM authenticated;
  END IF;

  GRANT SELECT ON TABLE "pve_players" TO football_life_runtime;
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "pve_tournaments" TO football_life_runtime;

  ALTER TABLE "pve_players" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "pve_players" NO FORCE ROW LEVEL SECURITY;
  ALTER TABLE "pve_tournaments" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "pve_tournaments" NO FORCE ROW LEVEL SECURITY;

  CREATE POLICY football_life_runtime_access ON "pve_players"
    FOR SELECT TO football_life_runtime USING (true);
  CREATE POLICY football_life_runtime_access ON "pve_tournaments"
    FOR ALL TO football_life_runtime USING (true) WITH CHECK (true);
END $$;
