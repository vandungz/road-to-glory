"use client";

import { getFlagUrl } from "@/features/squad/lib/nation-flags";

interface PaniniStickerProps {
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

export function PaniniSticker({ playerName, position, playerNationality, currentOvr, currentAge, playerDebutAge, currentStats, evolvedStatsThisYear }: PaniniStickerProps) {
  const stats = ["GK"].includes(position)
    ? [["DIV", "div"], ["HAN", "han"], ["KIC", "kic"], ["REF", "ref"], ["SPD", "spd"], ["POS", "pos"]]
    : [["PAC", "pac"], ["SHO", "sho"], ["PAS", "pas"], ["DRI", "dri"], ["DEF", "def"], ["PHY", "phy"]];
  const flagUrl = getFlagUrl(playerNationality);
  const nationCode = playerNationality.replace(/\s+/g, "").slice(0, 3).toUpperCase();
  const season = seasonYear(currentAge, playerDebutAge);

  return (
    <section className="football-panini-sticker">
      <div className="football-panini-sticker__top"><span>Panini · {season}</span><strong>{position}</strong></div>
      <div className="football-panini-sticker__portrait">
        <span className="football-panini-sticker__flag">
          {flagUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={flagUrl} alt={playerNationality} />
          ) : nationCode}
        </span>
        <strong>{currentOvr}</strong>
        <span className="football-panini-sticker__portrait-label">Ảnh cầu thủ</span>
        <div aria-hidden="true" />
      </div>
      <div className="football-panini-sticker__identity"><strong>{playerName}</strong></div>
      <div className="football-panini-sticker__stats">
        {stats.map(([label, key]) => {
          const evolution = evolvedStatsThisYear.find((item) => item.stat === key);
          return <div key={key}><span>{label}</span><strong>{currentStats[key] ?? "—"}{evolution && <em>{evolution.delta > 0 ? ` +${evolution.delta}` : ` ${evolution.delta}`}</em>}</strong></div>;
        })}
      </div>
    </section>
  );
}
