-- Expand migration for V2 career projection and immutable checkpoints.
-- This migration is safe after the baseline has been marked/applied.

ALTER TABLE "career_players"
  ADD COLUMN IF NOT EXISTS "checkpointVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "currentAge" INTEGER,
  ADD COLUMN IF NOT EXISTS "currentStep" TEXT,
  ADD COLUMN IF NOT EXISTS "currentWheel" TEXT,
  ADD COLUMN IF NOT EXISTS "lastCheckpointAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastCheckpointId" UUID,
  ADD COLUMN IF NOT EXISTS "revision" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "career_seasons" (
    "id" UUID NOT NULL,
    "careerPlayerId" UUID NOT NULL,
    "seasonNumber" INTEGER NOT NULL,
    "age" INTEGER NOT NULL,
    "clubId" TEXT,
    "clubName" TEXT,
    "leagueId" TEXT,
    "leagueName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "runtimeState" JSONB NOT NULL DEFAULT '{}',
    "summary" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "career_seasons_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "wheel_checkpoints" (
    "id" UUID NOT NULL,
    "careerPlayerId" UUID NOT NULL,
    "seasonId" UUID NOT NULL,
    "stepKey" TEXT NOT NULL,
    "wheelType" TEXT NOT NULL,
    "resolverVersion" TEXT NOT NULL,
    "input" JSONB,
    "outcome" JSONB NOT NULL,
    "publicResult" JSONB,
    "revisionBefore" INTEGER NOT NULL,
    "revisionAfter" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wheel_checkpoints_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "career_events" (
    "id" UUID NOT NULL,
    "careerPlayerId" UUID NOT NULL,
    "seasonId" UUID,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "career_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "career_seasons_careerPlayerId_seasonNumber_key"
  ON "career_seasons"("careerPlayerId", "seasonNumber");
CREATE INDEX "career_seasons_careerPlayerId_status_idx"
  ON "career_seasons"("careerPlayerId", "status");
CREATE INDEX "career_seasons_careerPlayerId_age_idx"
  ON "career_seasons"("careerPlayerId", "age");

CREATE UNIQUE INDEX "wheel_checkpoints_careerPlayerId_seasonId_stepKey_key"
  ON "wheel_checkpoints"("careerPlayerId", "seasonId", "stepKey");
CREATE UNIQUE INDEX "wheel_checkpoints_careerPlayerId_idempotencyKey_key"
  ON "wheel_checkpoints"("careerPlayerId", "idempotencyKey");
CREATE INDEX "wheel_checkpoints_careerPlayerId_createdAt_idx"
  ON "wheel_checkpoints"("careerPlayerId", "createdAt");
CREATE INDEX "wheel_checkpoints_seasonId_createdAt_idx"
  ON "wheel_checkpoints"("seasonId", "createdAt");

CREATE INDEX "career_events_careerPlayerId_createdAt_idx"
  ON "career_events"("careerPlayerId", "createdAt");
CREATE INDEX "career_events_seasonId_createdAt_idx"
  ON "career_events"("seasonId", "createdAt");

ALTER TABLE "career_seasons"
  ADD CONSTRAINT "career_seasons_careerPlayerId_fkey"
  FOREIGN KEY ("careerPlayerId") REFERENCES "career_players"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "wheel_checkpoints"
  ADD CONSTRAINT "wheel_checkpoints_careerPlayerId_fkey"
  FOREIGN KEY ("careerPlayerId") REFERENCES "career_players"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "wheel_checkpoints"
  ADD CONSTRAINT "wheel_checkpoints_seasonId_fkey"
  FOREIGN KEY ("seasonId") REFERENCES "career_seasons"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "career_events"
  ADD CONSTRAINT "career_events_careerPlayerId_fkey"
  FOREIGN KEY ("careerPlayerId") REFERENCES "career_players"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "career_events"
  ADD CONSTRAINT "career_events_seasonId_fkey"
  FOREIGN KEY ("seasonId") REFERENCES "career_seasons"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
