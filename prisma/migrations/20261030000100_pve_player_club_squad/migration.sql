ALTER TABLE "pve_players"
  ADD COLUMN "clubId" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "clubName" TEXT NOT NULL DEFAULT '';

CREATE INDEX "pve_players_clubId_position_overall_idx"
  ON "pve_players"("clubId", "position", "overall");
