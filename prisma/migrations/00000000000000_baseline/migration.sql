-- Baseline captured from the existing database schema on 2026-09-02.
-- Existing environments must mark this migration as applied with
-- `prisma migrate resolve --applied 00000000000000_baseline`; do not run it
-- against a database that already contains these tables.

CREATE SCHEMA IF NOT EXISTS "public";

CREATE TABLE "public"."career_players" (
    "id" UUID NOT NULL,
    "gameSessionId" UUID NOT NULL,
    "slotIndex" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "height" INTEGER NOT NULL,
    "preferredFoot" TEXT NOT NULL,
    "debutAge" INTEGER NOT NULL,
    "retireAge" INTEGER NOT NULL,
    "careerLengthYears" INTEGER NOT NULL,
    "debutOvr" INTEGER NOT NULL,
    "peakOvr" INTEGER NOT NULL,
    "cardRarity" TEXT NOT NULL,
    "statsTimeline" JSONB NOT NULL,
    "clubStints" JSONB NOT NULL,
    "events" JSONB NOT NULL,
    "hiddenStats" JSONB NOT NULL,
    "achievements" JSONB,
    "currentContinentalCup" TEXT NOT NULL DEFAULT 'none',
    "isRetired" BOOLEAN NOT NULL DEFAULT false,
    "seasonHistory" JSONB NOT NULL DEFAULT '{}',
    "weight" INTEGER NOT NULL DEFAULT 75,
    "contractYearsRemaining" INTEGER NOT NULL DEFAULT 3,
    "contractYearsTotal" INTEGER NOT NULL DEFAULT 3,
    "currentWageAnnual" INTEGER NOT NULL DEFAULT 0,
    "marketValue" INTEGER NOT NULL DEFAULT 0,
    "isUnemployed" BOOLEAN NOT NULL DEFAULT false,
    "influenceScore" INTEGER NOT NULL DEFAULT 0,
    "shopInventory" JSONB NOT NULL DEFAULT '[]',
    "walletBalance" INTEGER NOT NULL DEFAULT 0,
    "walletLedger" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "career_players_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."clubs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "prestige" INTEGER NOT NULL,
    "leagueTitlesCount" INTEGER NOT NULL DEFAULT 0,
    "domesticCupsCount" INTEGER NOT NULL DEFAULT 0,
    "continentalTitlesCount" INTEGER NOT NULL DEFAULT 0,
    "continentalType" TEXT NOT NULL DEFAULT 'none',

    CONSTRAINT "clubs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."game_sessions" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "squadRating" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "userId" TEXT NOT NULL,
    "formation" TEXT NOT NULL DEFAULT '4-3-3',

    CONSTRAINT "game_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."leagues" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    "prestige" INTEGER NOT NULL,
    "confederation" TEXT NOT NULL DEFAULT 'UEFA',
    "domesticCupName" TEXT NOT NULL DEFAULT 'Cup Quốc Gia',

    CONSTRAINT "leagues_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."national_teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "confederation" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,

    CONSTRAINT "national_teams_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "career_players_gameSessionId_slotIndex_key"
  ON "public"."career_players"("gameSessionId" ASC, "slotIndex" ASC);
CREATE UNIQUE INDEX "national_teams_nationality_key"
  ON "public"."national_teams"("nationality" ASC);

ALTER TABLE "public"."career_players"
  ADD CONSTRAINT "career_players_gameSessionId_fkey"
  FOREIGN KEY ("gameSessionId") REFERENCES "public"."game_sessions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."clubs"
  ADD CONSTRAINT "clubs_leagueId_fkey"
  FOREIGN KEY ("leagueId") REFERENCES "public"."leagues"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
