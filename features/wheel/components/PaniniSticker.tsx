"use client";

import { useTranslations } from "next-intl";
import { useCompetitionResult } from "./useCompetitionResult";
import { NationFlag } from "@/components/shared/NationFlag";
import { PlayerPortrait } from "@/features/player/components/PlayerPortrait";
import { isPortraitId } from "@/features/player/lib/player-portraits";
import type { PaniniReaction } from "../lib/portrait-reactions";

interface PaniniStickerProps {
  portraitId?: string | null;
  portraitReaction?: PaniniReaction | null;
  onPortraitReactionEnd?: () => void;
  playerName: string;
  position: string;
  playerNationality: string;
  currentOvr: number;
  currentAge: number;
  playerDebutAge: number;
  currentContinentalCup: string;
  standingResult: number | null;
  domesticCupResult: string | null;
  continentalCupResult: string | null;
  nationalCallupResult: string | null;
  nationalTournamentResult: string | null;
  hasBallonDorWinner: boolean;
  currentStats: Record<string, number>;
  evolvedStatsThisYear: Array<{ stat: string; delta: number }>;
}

function seasonYear(age: number, debutAge: number) {
  const start = 2025 + age - debutAge;
  return `${start}/${String((start + 1) % 100).padStart(2, "0")}`;
}

const reactionKeys: Record<string, string> = {
  "Được triệu tập lên tuyển": "calledUp",
  "Không được triệu tập lên tuyển": "missed",
  "Bị loại": "eliminated",
  "Tăng chỉ số": "increase",
  "Giảm chỉ số": "decrease",
  "Đến CLB có danh tiếng tương đương hoặc cao hơn": "transferUp",
  "Đến CLB có danh tiếng thấp hơn": "transferDown",
};

export function PaniniSticker({ playerName, position, playerNationality, currentOvr, currentAge, playerDebutAge, currentStats, evolvedStatsThisYear, portraitId, portraitReaction, onPortraitReactionEnd }: PaniniStickerProps) {
  const t = useTranslations("wheel");
  const resultLabel = useCompetitionResult();
  const reaction = portraitReaction?.label;
  const reactionKey = reaction && reactionKeys[reaction];
  const stats = ["GK"].includes(position)
    ? [["DIV", "div"], ["HAN", "han"], ["KIC", "kic"], ["REF", "ref"], ["SPD", "spd"], ["POS", "pos"]]
    : [["PAC", "pac"], ["SHO", "sho"], ["PAS", "pas"], ["DRI", "dri"], ["DEF", "def"], ["PHY", "phy"]];
  const season = seasonYear(currentAge, playerDebutAge);

  return (
    <section className="football-panini-sticker" data-nation={playerNationality.replace(/\s+/g, "")}>
      <div className="football-panini-sticker__top">
        <span>Panini {season}</span>
        <span className="football-panini-sticker__nation"><NationFlag nationality={playerNationality} /><strong>{position}</strong></span>
      </div>
      {isPortraitId(portraitId) && <div className="football-panini-sticker__media">
        <PlayerPortrait portraitId={portraitId} reaction={portraitReaction} onReactionEnd={onPortraitReactionEnd} loop />
        <span className="sr-only" role="status">{reactionKey ? t(reactionKey) : reaction ? resultLabel(reaction) : null}</span>
      </div>}
      <div className="football-panini-sticker__identity">
        <strong>{playerName}</strong>
        <span className="football-panini-sticker__ovr"><span>OVR</span><strong>{currentOvr}</strong></span>
      </div>
      <div className="football-panini-sticker__stats">
        {stats.map(([label, key]) => {
          const evolution = evolvedStatsThisYear.find((item) => item.stat === key);
          return <div key={key}><span>{label}</span><strong>{currentStats[key] ?? "—"}{evolution && <em data-loss={evolution.delta < 0}>{evolution.delta > 0 ? `+${evolution.delta}` : evolution.delta}</em>}</strong></div>;
        })}
      </div>
    </section>
  );
}
