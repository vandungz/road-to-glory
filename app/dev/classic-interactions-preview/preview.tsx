"use client";

import { useState } from "react";
import { AppShell } from "@/components/shared/AppShell";
import { ClassicProfileSetup } from "@/features/wheel/components/ClassicProfileSetup";
import { BallonDorNominationModal } from "@/features/wheel/components/BallonDorNominationModal";
import { PlayerCareerDialog } from "@/features/player/components/PlayerCareerDialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { previewPlayers } from "../design-preview/fixtures";
import type { AwardRankingEntry } from "@/types/awards";
import { placeBallonDorPlayer } from "@/features/season/services/ballon-ranking";

const entries: AwardRankingEntry[] = ["Lazio", "Real Madrid", "Manchester City", "Bayern Munich", "Barcelona", "PSG", "Inter Milan", "Liverpool", "Arsenal", "Benfica"].map((clubName, index) => ({
  candidateKey: `preview:${index}`, rank: index + 1, name: ["Da Cunha", "Lucas Silva", "Harry Wilson", "Felix Bauer", "Diego García", "Jean Morel", "Lorenzo Rossi", "Jack Wright", "William Davies", "João Costa"][index],
  clubName, position: ["CM", "ST", "CAM", "LW", "RW", "GK", "CM", "CB", "CDM", "RB"][index], isCareerPlayer: index === 0, score: 100 - index, weight: 1, metrics: {}, result: index === 0 ? "winner" : "ranked",
}));

export function ClassicInteractionsPreview({ view }: { view?: string }) {
  const [open, setOpen] = useState(true);
  const [notice, setNotice] = useState("");
  return <AppShell backHref="/" className="football-draft-shell">
    <Button onClick={() => setOpen(true)}>Open preview</Button>
    <output aria-live="polite">{notice}</output>
    {view === "ballon" || view === "ballon-runner" ? open && <BallonDorNominationModal nominated rank={view === "ballon-runner" ? 2 : 1}
        entries={view === "ballon-runner" ? placeBallonDorPlayer(entries, 2, { candidateKey: entries[0].candidateKey, name: "Bomba Ballon Test", position: "CM", clubName: "Real Madrid" }) : entries}
        onClose={() => { setOpen(false); setNotice("Continue development"); }} />
      : view === "archive" ? <PlayerCareerDialog player={previewPlayers[1]} isOpen={open} gameId="design-preview" canManage onClose={() => setOpen(false)} />
      : view === "confirm" ? <ConfirmDialog open={open} title="Replace player" description="The saved career will be removed and the slot reopened." confirmLabel="Replace player"
          onCancel={() => setOpen(false)} onConfirm={() => { setOpen(false); setNotice("Confirmed once"); }} />
      : <ClassicProfileSetup slotPosition="CM" onRandom={() => setNotice("Wheel flow")} onContinue={(profile) => setNotice(`${profile.name} ${profile.position}`)} />}
  </AppShell>;
}
