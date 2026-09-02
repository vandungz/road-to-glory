"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlayerCareerDialog } from "@/features/player/components/PlayerCareerDialog";
import { PitchBoard } from "./PitchBoard";
import { SquadBoardPageHead } from "./SquadBoardPageHead";
import { SquadSheet } from "./SquadSheet";
import { SquadSummary } from "./SquadSummary";
import { getSlotStateForIndex } from "../lib/slot-state";
import type { ClientSafePlayer, SlotConfig } from "@/types/squad";
import type { Formation } from "@/types/game";

interface SquadDashboardProps {
  gameId: string;
  formation: Formation;
  status: string;
  squadRating: number | null;
  sessionName: string;
  players: ClientSafePlayer[];
  slots: SlotConfig[];
  inProgressSlots?: number[];
  draftBasePath?: string;
}

export function SquadDashboard({
  gameId,
  formation,
  status,
  squadRating,
  sessionName,
  players,
  slots,
  inProgressSlots = [],
  draftBasePath = `/${gameId}`,
}: SquadDashboardProps) {
  const router = useRouter();
  const [selectedPlayer, setSelectedPlayer] = useState<ClientSafePlayer | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);
  const startingXI = players.filter((player) => player.slotIndex >= 0 && player.slotIndex <= 10);
  const playerMap = new Map(startingXI.map((player) => [player.slotIndex, player]));
  const activeSlot = slots.find((slot) => getSlotStateForIndex(slot.index, playerMap.get(slot.index), inProgressSlots, status) === "active");
  const nextEmptySlot = slots.find((slot) => getSlotStateForIndex(slot.index, playerMap.get(slot.index), inProgressSlots, status) === "empty");
  const currentSquadOvr = startingXI.length > 0
    ? Math.round(startingXI.reduce((sum, player) => sum + player.peakOvr, 0) / startingXI.length)
    : 0;
  const displaySquadOvr = status === "completed" ? (squadRating ?? 0) : currentSquadOvr;

  function draftSlot(slotIndex: number) {
    router.push(`${draftBasePath}/draft/${slotIndex}`);
  }

  function handleSlotClick(slotIndex: number, player?: ClientSafePlayer) {
    if (player) setSelectedPlayer(player);
    else if (status !== "completed") draftSlot(slotIndex);
  }

  return (
    <div className="rtg-squad-dashboard">
      <SquadBoardPageHead
        sessionName={sessionName}
        mobileMeta={`${startingXI.length} / 11 · ovr tb ${displaySquadOvr || "—"}`}
        slots={slots}
        players={startingXI}
        inProgressSlots={inProgressSlots}
        status={status}
      />

      <div className="rtg-squad-dashboard__body">
        <section className="rtg-squad-dashboard__pitch">
          <PitchBoard
            gameId={gameId}
            formation={formation}
            players={startingXI}
            status={status}
            inProgressSlots={inProgressSlots}
            draftBasePath={draftBasePath}
            hoveredSlot={hoveredSlot}
            onSlotHover={setHoveredSlot}
            onPlayerClick={setSelectedPlayer}
          />
        </section>

        <div className="rtg-squad-dashboard__sheet">
          <SquadSummary
            gameId={gameId}
            status={status}
            playerCount={startingXI.length}
            squadOvr={displaySquadOvr}
          />
          <SquadSheet
            slots={slots}
            players={startingXI}
            inProgressSlots={inProgressSlots}
            status={status}
            hoveredSlot={hoveredSlot}
            onSlotHover={setHoveredSlot}
            onSlotClick={handleSlotClick}
          />
          {status !== "completed" && (activeSlot || nextEmptySlot) && startingXI.length < 11 && (
            <div className="rtg-squad-dashboard__next-action">
              <button type="button" className="rtg-button rtg-button--primary" onClick={() => draftSlot((activeSlot ?? nextEmptySlot)!.index)}>
                {activeSlot ? `Quay tiếp ${activeSlot.position}` : `Draft ${nextEmptySlot!.position}`}
                <span aria-hidden="true">›</span>
              </button>
              <span>{activeSlot ? "vị trí đang dở · mở lại đúng bước" : "vị trí trống tiếp theo · vòng quay 13 bước"}</span>
            </div>
          )}
        </div>
      </div>

      <PlayerCareerDialog player={selectedPlayer} isOpen={selectedPlayer !== null} onClose={() => setSelectedPlayer(null)} />
    </div>
  );
}
