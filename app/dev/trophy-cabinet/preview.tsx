"use client";

import { useState } from "react";
import { AppShell } from "@/components/shared/AppShell";
import { Button } from "@/components/ui/Button";
import { TrophyCabinetModal } from "@/features/wheel/components/TrophyCabinetModal";
import type { SeasonRecord } from "@/types/game";

// Display-only seasons; this preview never reads or writes an account.
export function TrophyCabinetPreview({ count }: { count: number }) {
  const [open, setOpen] = useState(true);
  const records: Record<number, SeasonRecord> = Object.fromEntries(Array.from({ length: count }, (_, index) => [22 + index, {
    age: 22 + index, clubName: index < 4 ? "Genoa" : "Borussia Dortmund", leagueName: index < 4 ? "Serie A" : "Bundesliga",
    leagueId: index < 4 ? "serie-a" : "bundesliga", standing: null, domesticCup: index % 2 ? "Runner-Up" : "Winner",
    continentalCup: null, nationalTeam: null, ballonDorResult: index === 0 ? 1 : null,
  } satisfies SeasonRecord]));
  return <AppShell><Button onClick={() => setOpen(true)}>Open cabinet</Button>
    {open && <TrophyCabinetModal seasonRecords={records} playerName="Benerin" playerNationality="Mexico" onClose={() => setOpen(false)} />}
  </AppShell>;
}
