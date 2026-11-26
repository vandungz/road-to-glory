"use client";
import { ScrollArea } from "@/components/ui/ScrollArea";


import { useTranslations } from "next-intl";
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
  const ui = useTranslations("ui");
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
      data-nation={player?.nationality.replace(/\s+/g, "")}
      aria-label={player ? ui("openSProfile", { v0: String(player.name) }) : state === "active" ? ui("resumeDrafting", { v0: String(slot.position) }) : state === "empty" ? ui("draftA", { v0: String(slot.position) }) : ui("slotIsEmpty", { v0: String(slot.position) })}
    >
      <span className="football-squad-sheet__position">{player?.position ?? slot.position}</span>
      <span className="football-squad-sheet__nation">{nationCode(player?.nationality)}</span>
      <span className="football-squad-sheet__player">
        {state === "active" ? ui("resumeDraft") : state === "empty" ? <><Plus aria-hidden="true" size={13} strokeWidth={2.2} />{ui("draftPlayer")}</> : state === "locked" ? ui("noPlayerYet") : player?.name}
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
  const ui = useTranslations("ui");
  const playerMap = new Map(players.map((player) => [player.slotIndex, player]));

  return (
    <section className="football-squad-sheet" aria-labelledby="starting-xi-title">
      <div className="football-squad-sheet__heading">
        <h2 id="starting-xi-title">{ui("startingXi")}</h2>
      </div>
      <div className="football-squad-sheet__row football-squad-sheet__row--head" aria-hidden="true">
        <span>{ui("position")}</span><span className="football-squad-sheet__nation">{ui("nationalityShort")}</span><span>{ui("player3")}</span><span>OVR</span><span />
      </div>
      <ScrollArea className="football-squad-sheet__table" role="region" aria-label={ui("startingLineup")} tabIndex={0}>
        {slots.map((slot) => {
          const player = playerMap.get(slot.index);
          const state = getSlotStateForIndex(slot.index, player, inProgressSlots, status);
          return <SlotRow key={slot.index} slot={slot} player={player} state={state} isHovered={hoveredSlot === slot.index} onHover={(slotIndex) => onSlotHover?.(slotIndex)} onClick={() => onSlotClick(slot.index, player)} />;
        })}
      </ScrollArea>
    </section>
  );
}
