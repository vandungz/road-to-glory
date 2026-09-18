-- Durable transfer workflow state.
-- Market snapshots remain immutable in career_commands; these tables only keep
-- the small, mutable state needed to resume a negotiation after navigation or
-- reload without copying the offer payload into career_seasons.runtimeState.

CREATE TABLE "career_transfer_workflows" (
    "id" UUID NOT NULL,
    "careerPlayerId" UUID NOT NULL,
    "seasonId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "selectedClubId" TEXT,
    "selectedOfferKind" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "career_transfer_workflows_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "career_transfer_negotiations" (
    "id" UUID NOT NULL,
    "careerPlayerId" UUID NOT NULL,
    "seasonId" UUID NOT NULL,
    "workflowId" UUID NOT NULL,
    "clubId" TEXT NOT NULL,
    "offerKind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "failedWageMask" INTEGER NOT NULL DEFAULT 0,
    "marketCommandId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "career_transfer_negotiations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "career_transfer_workflows_seasonId_key"
  ON "career_transfer_workflows"("seasonId");
CREATE INDEX "career_transfer_workflows_careerPlayerId_status_idx"
  ON "career_transfer_workflows"("careerPlayerId", "status");

CREATE UNIQUE INDEX "career_transfer_negotiations_careerPlayerId_seasonId_clubId_offerKind_key"
  ON "career_transfer_negotiations"("careerPlayerId", "seasonId", "clubId", "offerKind");
CREATE INDEX "career_transfer_negotiations_careerPlayerId_seasonId_status_idx"
  ON "career_transfer_negotiations"("careerPlayerId", "seasonId", "status");
CREATE INDEX "career_transfer_negotiations_workflowId_status_idx"
  ON "career_transfer_negotiations"("workflowId", "status");

ALTER TABLE "career_transfer_workflows"
  ADD CONSTRAINT "career_transfer_workflows_careerPlayerId_fkey"
  FOREIGN KEY ("careerPlayerId") REFERENCES "career_players"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "career_transfer_workflows"
  ADD CONSTRAINT "career_transfer_workflows_seasonId_fkey"
  FOREIGN KEY ("seasonId") REFERENCES "career_seasons"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "career_transfer_negotiations"
  ADD CONSTRAINT "career_transfer_negotiations_careerPlayerId_fkey"
  FOREIGN KEY ("careerPlayerId") REFERENCES "career_players"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "career_transfer_negotiations"
  ADD CONSTRAINT "career_transfer_negotiations_seasonId_fkey"
  FOREIGN KEY ("seasonId") REFERENCES "career_seasons"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "career_transfer_negotiations"
  ADD CONSTRAINT "career_transfer_negotiations_workflowId_fkey"
  FOREIGN KEY ("workflowId") REFERENCES "career_transfer_workflows"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "career_transfer_negotiations"
  ADD CONSTRAINT "career_transfer_negotiations_marketCommandId_fkey"
  FOREIGN KEY ("marketCommandId") REFERENCES "career_commands"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "career_commands_careerPlayerId_seasonId_commandType_revisionBefore_createdAt_idx"
  ON "career_commands"("careerPlayerId", "seasonId", "commandType", "revisionBefore", "createdAt");
