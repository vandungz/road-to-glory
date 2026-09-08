-- Additive command/idempotency storage for non-wheel career mutations.
-- This migration does not alter or remove the existing JSON aggregates.

CREATE TABLE "career_commands" (
    "id" UUID NOT NULL,
    "careerPlayerId" UUID NOT NULL,
    "seasonId" UUID,
    "commandType" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "input" JSONB,
    "result" JSONB NOT NULL,
    "revisionBefore" INTEGER NOT NULL,
    "revisionAfter" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "career_commands_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "career_commands_careerPlayerId_idempotencyKey_key"
  ON "career_commands"("careerPlayerId", "idempotencyKey");
CREATE INDEX "career_commands_careerPlayerId_commandType_createdAt_idx"
  ON "career_commands"("careerPlayerId", "commandType", "createdAt");

ALTER TABLE "career_commands"
  ADD CONSTRAINT "career_commands_careerPlayerId_fkey"
  FOREIGN KEY ("careerPlayerId") REFERENCES "career_players"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "career_commands"
  ADD CONSTRAINT "career_commands_seasonId_fkey"
  FOREIGN KEY ("seasonId") REFERENCES "career_seasons"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
