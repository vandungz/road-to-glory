-- Canonical award/honour records and per-career-season ranking snapshots.
-- Additive migration: legacy JSON aggregates remain readable during rollout.

CREATE TABLE "career_honours" (
    "id" UUID NOT NULL,
    "careerPlayerId" UUID NOT NULL,
    "seasonId" UUID NOT NULL,
    "age" INTEGER NOT NULL,
    "seasonLabel" TEXT,
    "category" TEXT NOT NULL,
    "awardKey" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "scopeKey" TEXT,
    "awardInstanceKey" TEXT NOT NULL,
    "slotKey" TEXT,
    "rank" INTEGER,
    "result" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "clubId" TEXT,
    "clubName" TEXT,
    "leagueId" TEXT,
    "metrics" JSONB NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "resolutionVersion" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "career_honours_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "career_award_ranking_snapshots" (
    "id" UUID NOT NULL,
    "careerPlayerId" UUID NOT NULL,
    "seasonId" UUID NOT NULL,
    "age" INTEGER NOT NULL,
    "seasonLabel" TEXT,
    "snapshotKey" TEXT NOT NULL,
    "awardKey" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "scopeKey" TEXT,
    "modelVersion" TEXT NOT NULL,
    "resolutionVersion" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'generated',
    "entries" JSONB NOT NULL,
    "resolution" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "career_award_ranking_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "career_honours_careerPlayerId_awardInstanceKey_key"
  ON "career_honours"("careerPlayerId", "awardInstanceKey");
CREATE INDEX "career_honours_careerPlayerId_seasonId_idx"
  ON "career_honours"("careerPlayerId", "seasonId");
CREATE INDEX "career_honours_careerPlayerId_awardKey_scope_seasonId_idx"
  ON "career_honours"("careerPlayerId", "awardKey", "scope", "seasonId");
CREATE INDEX "career_honours_seasonId_awardKey_scope_idx"
  ON "career_honours"("seasonId", "awardKey", "scope");

CREATE UNIQUE INDEX "career_award_ranking_snapshots_snapshotKey_key"
  ON "career_award_ranking_snapshots"("snapshotKey");
CREATE INDEX "career_award_ranking_snapshots_careerPlayerId_seasonId_idx"
  ON "career_award_ranking_snapshots"("careerPlayerId", "seasonId");
CREATE INDEX "career_award_ranking_snapshots_careerPlayerId_awardKey_scope_idx"
  ON "career_award_ranking_snapshots"("careerPlayerId", "awardKey", "scope");
CREATE INDEX "career_award_ranking_snapshots_seasonId_awardKey_scope_idx"
  ON "career_award_ranking_snapshots"("seasonId", "awardKey", "scope");

ALTER TABLE "career_honours"
  ADD CONSTRAINT "career_honours_careerPlayerId_fkey"
  FOREIGN KEY ("careerPlayerId") REFERENCES "career_players"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "career_honours"
  ADD CONSTRAINT "career_honours_seasonId_fkey"
  FOREIGN KEY ("seasonId") REFERENCES "career_seasons"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "career_award_ranking_snapshots"
  ADD CONSTRAINT "career_award_ranking_snapshots_careerPlayerId_fkey"
  FOREIGN KEY ("careerPlayerId") REFERENCES "career_players"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "career_award_ranking_snapshots"
  ADD CONSTRAINT "career_award_ranking_snapshots_seasonId_fkey"
  FOREIGN KEY ("seasonId") REFERENCES "career_seasons"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
