"use client";

import type { ClientSafePlayer } from "@/types/squad";
import { PlayerPortrait } from "./PlayerPortrait";
import { resolveSavedPortraitId } from "../lib/player-portraits";

interface PlayerStickerCardProps {
  player: ClientSafePlayer;
  finalClub: string;
  debutAge: number;
  retireAge: number;
  careerLength: number;
}

function nationCode(nationality: string): string {
  const codes: Record<string, string> = {
    Algeria: "ALG", Argentina: "ARG", Brazil: "BRA", England: "ENG", France: "FRA",
    Germany: "GER", Italy: "ITA", Netherlands: "NED", Portugal: "POR", Spain: "ESP",
    USA: "USA", Belgium: "BEL", Croatia: "CRO", Denmark: "DEN", Ghana: "GHA",
    Japan: "JPN", Morocco: "MAR", Nigeria: "NGA", Senegal: "SEN", Serbia: "SRB",
    Sweden: "SWE", Switzerland: "SUI", Turkey: "TUR", Ukraine: "UKR", Uruguay: "URU",
  };
  return codes[nationality.replace(/\s+/g, "")] ?? nationality.slice(0, 3).toUpperCase();
}

export function PlayerStickerCard({ player, finalClub, debutAge, retireAge, careerLength }: PlayerStickerCardProps) {
  return (
    <div className="football-player-sticker" data-nation={player.nationality.replace(/\s+/g, "")}>
      <div className="football-player-sticker__top"><span>Hall of Fame</span><strong>{player.position}</strong></div>
      <div className="football-player-sticker__portrait" data-has-portrait="true">
        <PlayerPortrait portraitId={resolveSavedPortraitId(player.portraitId, player.id)} animate={false} />
        <strong>{player.peakOvr}</strong>
        <span>{nationCode(player.nationality)}</span>
        <div className="football-player-sticker__silhouette" aria-hidden="true" />
        <small>OVR đỉnh cao</small>
      </div>
      <div className="football-player-sticker__identity">
        <h3>{player.name}</h3>
        <small>{debutAge} → {retireAge} tuổi · {careerLength} mùa · {finalClub}</small>
      </div>
    </div>
  );
}
