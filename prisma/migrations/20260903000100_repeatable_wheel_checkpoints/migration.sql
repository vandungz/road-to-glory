-- A career season can resolve the growth selector and magnitude wheels more
-- than once. Keep retry identity on revisionBefore while allowing later
-- occurrences of the same logical stepKey.
DROP INDEX IF EXISTS "wheel_checkpoints_careerPlayerId_seasonId_stepKey_key";

CREATE UNIQUE INDEX "wheel_checkpoints_careerPlayerId_seasonId_stepKey_revisionBefore_key"
  ON "wheel_checkpoints"("careerPlayerId", "seasonId", "stepKey", "revisionBefore");
