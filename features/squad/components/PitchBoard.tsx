"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Formation } from "@/types/game";
import { FORMATION_SLOTS, RARITY_ACCENT, type ClientSafePlayer } from "@/types/squad";
import { getSlotStateForIndex, type SlotState } from "../lib/slot-state";
import { getFlagUrl } from "../lib/nation-flags";

function slotZone(position: string): "goalkeeper" | "defense" | "midfield" | "attack" {
  if (position === "GK") return "goalkeeper";
  if (["LB", "CB", "RB", "LWB", "RWB"].includes(position)) return "defense";
  if (["LM", "CM", "CDM", "CAM", "RM"].includes(position)) return "midfield";
  return "attack";
}

function PitchMarkings() {
  return (
    <div className="rtg-pitch__markings" aria-hidden="true">
      <span className="rtg-pitch__outline" />
      <span className="rtg-pitch__halfway" />
      <span className="rtg-pitch__circle" />
      <span className="rtg-pitch__box rtg-pitch__box--top" />
      <span className="rtg-pitch__box rtg-pitch__box--bottom" />
    </div>
  );
}

function SlotButton({ position, state, onClick }: { position: string; state: Exclude<SlotState, "filled">; onClick: () => void }) {
  const isInteractive = state !== "locked";
  return (
    <button
      type="button"
      className={`rtg-pitch-token rtg-pitch-token--${state}`}
      onClick={onClick}
      disabled={!isInteractive}
      aria-label={state === "active" ? `Tiếp tục draft cầu thủ ${position}` : state === "empty" ? `Thêm cầu thủ ${position}` : `Vị trí ${position} chưa có cầu thủ`}
    >
      {state === "active" ? <><span>{position}</span><span className="rtg-pitch-token__status"><i aria-hidden="true" />Đang dở</span></> : state === "empty" ? <><span>{position}</span><span className="rtg-pitch-token__status"><Plus aria-hidden="true" size={10} />Draft</span></> : <span>{position}</span>}
    </button>
  );
}

function FilledSlot({ player, onClick }: { player: ClientSafePlayer; onClick: () => void }) {
  const nameParts = player.name.trim().split(/\s+/);
  const shortName = nameParts.length > 1 ? `${nameParts[0][0]}. ${nameParts.at(-1)}` : player.name;
  const rarityColor = RARITY_ACCENT[player.cardRarity] ?? "var(--rtg-rule-strong)";
  const flag = getFlagUrl(player.nationality);
  const style = {
    "--rarity-accent": rarityColor,
    ...(flag ? { "--player-flag": `url(${flag})` } : {}),
  } as React.CSSProperties;
  return (
    <button type="button" className="rtg-pitch-player" onClick={onClick} style={style} aria-label={`${player.name} — ${player.position}`}>
      <span className="rtg-pitch-player__top"><span>{player.position}</span><strong>{player.peakOvr}</strong></span>
      <span className="rtg-pitch-player__name">{shortName}</span>
    </button>
  );
}

interface Props {
  gameId: string;
  formation: Formation;
  players: ClientSafePlayer[];
  status?: string;
  inProgressSlots?: number[];
  draftBasePath?: string;
  hoveredSlot?: number | null;
  onSlotHover?: (slotIndex: number | null) => void;
  onPlayerClick?: (player: ClientSafePlayer) => void;
}

export function PitchBoard({ gameId, formation, players, status, inProgressSlots = [], draftBasePath = `/${gameId}`, hoveredSlot, onSlotHover, onPlayerClick }: Props) {
  const router = useRouter();
  const slots = FORMATION_SLOTS[formation] ?? FORMATION_SLOTS["4-3-3"];
  const playerMap = new Map(players.map((player) => [player.slotIndex, player]));

  function handleSlotClick(slotIndex: number) {
    const player = playerMap.get(slotIndex);
    if (player) {
      onPlayerClick?.(player);
      return;
    }
    if (status !== "completed") router.push(`${draftBasePath}/draft/${slotIndex}`);
  }

  return (
    <div className="rtg-pitch" role="region" aria-label="Sân đấu chiến thuật">
      <PitchMarkings />
      {slots.map((slot) => {
        const player = playerMap.get(slot.index);
        const state = getSlotStateForIndex(slot.index, player, inProgressSlots, status);
        return (
          <div
            key={slot.index}
            className={`rtg-pitch__slot rtg-pitch__slot--${slotZone(slot.position)}${hoveredSlot === slot.index ? " is-hovered" : ""}`}
            style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
            onMouseEnter={() => onSlotHover?.(slot.index)}
            onMouseLeave={() => onSlotHover?.(null)}
          >
            {player ? <FilledSlot player={player} onClick={() => handleSlotClick(slot.index)} /> : <SlotButton position={slot.position} state={state as Exclude<SlotState, "filled">} onClick={() => handleSlotClick(slot.index)} />}
          </div>
        );
      })}
    </div>
  );
}
