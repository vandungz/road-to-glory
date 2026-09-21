"use client";

import { ChevronRight, Plus } from "lucide-react";
import { RARITY_ACCENT, type ClientSafePlayer, type SlotConfig } from "@/types/squad";
import { getSlotStateForIndex, type SlotState } from "../lib/slot-state";
import { getFlagUrl } from "../lib/nation-flags";

const NATION_CODES: Record<string, string> = {
  Argentina: "ARG", Australia: "AUS", Austria: "AUT", Belgium: "BEL", Brazil: "BRA",
  Cameroon: "CMR", Canada: "CAN", Chile: "CHI", Colombia: "COL", Croatia: "CRO",
  Denmark: "DEN", Ecuador: "ECU", Egypt: "EGY", England: "ENG", France: "FRA",
  Germany: "GER", Ghana: "GHA", Greece: "GRE", Hungary: "HUN", Iran: "IRN",
  Ireland: "IRL", Italy: "ITA", Japan: "JPN", Mexico: "MEX", Morocco: "MAR",
  Netherlands: "NED", Nigeria: "NGA", Norway: "NOR", Poland: "POL", Portugal: "POR",
  Senegal: "SEN", Serbia: "SRB", Slovakia: "SVK", Algeria: "ALG", SouthAfrica: "RSA", SouthKorea: "KOR",
  Spain: "ESP", Sweden: "SWE", Switzerland: "SUI", Turkey: "TUR", Ukraine: "UKR",
  Uruguay: "URU", USA: "USA",
};

function nationCode(nationality?: string): string {
  return nationality ? NATION_CODES[nationality.replace(/\s+/g, "")] ?? nationality.slice(0, 3).toUpperCase() : "—";
}

interface RowProps {
  slot: SlotConfig;
  player?: ClientSafePlayer;
  state: SlotState;
  isHovered: boolean;
  onHover: (slotIndex: number | null) => void;
  onClick: () => void;
}

function SlotRow({ slot, player, state, isHovered, onHover, onClick }: RowProps) {
  const isInteractive = state !== "locked";
  const rarityColor = player ? RARITY_ACCENT[player.cardRarity] ?? "var(--football-rule-strong)" : "var(--football-rule-strong)";
  const flag = getFlagUrl(player?.nationality);
  const style = {
    "--rarity-accent": rarityColor,
    ...(flag ? { "--player-flag": `url(${flag})` } : {}),
  } as React.CSSProperties;

  return (
    <button
      type="button"
      className={`football-squad-sheet__row is-${state}${isHovered ? " is-hovered" : ""}`}
      onClick={onClick}
      onMouseEnter={() => onHover(slot.index)}
      onMouseLeave={() => onHover(null)}
      disabled={!isInteractive}
      style={style}
      aria-label={player ? `Mở hồ sơ ${player.name}` : state === "active" ? `Tiếp tục draft vị trí ${slot.position}` : state === "empty" ? `Draft vị trí ${slot.position}` : `Vị trí ${slot.position} chưa có cầu thủ`}
    >
      <span className="football-squad-sheet__position">{slot.position}</span>
      <span className="football-squad-sheet__nation">{nationCode(player?.nationality)}</span>
      <span className="football-squad-sheet__player">
        {state === "active" ? <><i aria-hidden="true" />Đang dở — quay tiếp</> : state === "empty" ? <><Plus aria-hidden="true" size={13} strokeWidth={2.2} />Draft cầu thủ</> : state === "locked" ? "Chưa có cầu thủ" : player?.name}
      </span>
      <span className="football-squad-sheet__ovr">{player?.peakOvr ?? "—"}</span>
      <ChevronRight className="football-squad-sheet__chevron" aria-hidden="true" size={15} strokeWidth={1.6} />
    </button>
  );
}

interface Props {
  slots: SlotConfig[];
  players: ClientSafePlayer[];
  inProgressSlots: number[];
  status: string;
  hoveredSlot?: number | null;
  onSlotHover?: (slotIndex: number | null) => void;
  onSlotClick: (slotIndex: number, player?: ClientSafePlayer) => void;
}

export function SquadSheet({ slots, players, inProgressSlots, status, hoveredSlot, onSlotHover, onSlotClick }: Props) {
  const playerMap = new Map(players.map((player) => [player.slotIndex, player]));
  const playerCount = players.length;

  return (
    <section className="football-squad-sheet" aria-labelledby="starting-xi-title">
      <div className="football-squad-sheet__heading">
        <h2 id="starting-xi-title">Đội hình xuất phát</h2>
        <span>{playerCount} / 11</span>
      </div>
      <div className="football-squad-sheet__table" role="table" aria-label="Đội hình xuất phát">
        <div className="football-squad-sheet__row football-squad-sheet__row--head" role="row">
          <span>Vị trí</span><span className="football-squad-sheet__nation">QT</span><span>Cầu thủ</span><span>OVR</span><span />
        </div>
        {slots.map((slot) => {
          const player = playerMap.get(slot.index);
          const state = getSlotStateForIndex(slot.index, player, inProgressSlots, status);
          return <SlotRow key={slot.index} slot={slot} player={player} state={state} isHovered={hoveredSlot === slot.index} onHover={(slotIndex) => onSlotHover?.(slotIndex)} onClick={() => onSlotClick(slot.index, player)} />;
        })}
      </div>
    </section>
  );
}
