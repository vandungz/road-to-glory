"use client";

import { DraftDrumScreen } from "@/features/wheel/components/DraftDrumScreen";

const MOCK_LEAGUES = [
  { id: "epl", name: "Premier League", tier: 1 },
  { id: "laliga", name: "La Liga", tier: 1 },
];

const MOCK_CLUBS = [
  { id: "c1", name: "Liverpool", leagueId: "epl", prestige: 5, continentalType: "ucl" },
  { id: "c2", name: "Arsenal", leagueId: "epl", prestige: 5, continentalType: "ucl" },
];

export default function DevDraftPreviewPage() {
  return (
    <DraftDrumScreen
      gameId="dev-game"
      slotIndex={1}
      position="ST"
      leagues={MOCK_LEAGUES}
      clubs={MOCK_CLUBS}
      initialMode="career"
    />
  );
}
