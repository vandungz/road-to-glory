"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { SeasonRecapModal } from "@/features/wheel/components/SeasonRecapModal";
import type { SimulatedSeasonResult } from "@/features/season/services/season-simulator.service";
import type { SeasonRecord } from "@/types/game";

export const record: SeasonRecord = {
  age: 18, clubName: "CLB thử nghiệm", leagueName: "Giải thử nghiệm",
  standing: 2, domesticCup: "Semi-Finals", continentalCup: null,
  nationalTeam: { type: "World Cup", callup: "yes", result: "Group Stage" },
};
export const result: SimulatedSeasonResult = {
  apps: 38, goals: 1, assists: 7, cleanSheets: 4, matchRating: 6.8, events: [],
  leagueStats: { apps: 32, goals: 1, assists: 6, cleanSheets: 4, rating: 6.8 },
  domesticCupStats: { apps: 6, goals: 0, assists: 1, cleanSheets: 0, rating: 6.8 },
  ballonDor: { eligible: false, nominationWeight: 0, rankWeights: [] },
  awardSimulation: {
    modelVersion: "preview", resolutionVersion: "preview", candidateUniverseSize: 0,
    snapshots: [], honours: [],
    ballonDor: { eligible: false, nominationWeight: 0, rankWeights: [], snapshotKey: "preview" },
  },
};

export function RecapPreview() {
  const [open, setOpen] = useState(false);
  return <>
    <Button onClick={() => setOpen(true)}>Mở tổng kết thử nghiệm</Button>
    {open && <SeasonRecapModal record={record} yearSimResult={result}
      currentContinentalCup="none" playerDebutAge={17} onClose={() => setOpen(false)} />}
  </>;
}
