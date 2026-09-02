"use client";

import type { ClientSafePlayer } from "@/types/squad";

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
    <div className="rtg-player-sticker">
      <div className="rtg-player-sticker__top"><span>Hall of Fame</span><strong>{player.position}</strong></div>
      <div className="rtg-player-sticker__portrait">
        <strong>{player.peakOvr}</strong>
        <span>{nationCode(player.nationality)}</span>
        <div className="rtg-player-sticker__silhouette" aria-hidden="true" />
        <small>Ảnh cầu thủ</small>
      </div>
      <div className="rtg-player-sticker__identity">
        <h3>{player.name}</h3>
        <small>{debutAge} → {retireAge} tuổi · {careerLength} mùa · {finalClub}</small>
      </div>
    </div>
  );
}
