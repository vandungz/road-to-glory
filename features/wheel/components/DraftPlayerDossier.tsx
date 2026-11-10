import type { DraftData } from "../stores/useWheelUiStore";
import { PlayerPortrait } from "@/features/player/components/PlayerPortrait";
import type { ClassicProfile } from "./ClassicProfileSetup";

interface DraftPlayerDossierProps {
  profile?: ClassicProfile;
  draftData: DraftData;
  position: string;
  playerNumber: number;
}

function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="football-draft-dossier__row">
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}

const FIELD_STATS = [
  ["PAC", "pac"], ["SHO", "sho"], ["PAS", "pas"],
  ["DRI", "dri"], ["DEF", "def"], ["PHY", "phy"],
] as const;

const GK_STATS = [
  ["DIV", "div"], ["HAN", "han"], ["KIC", "kic"],
  ["REF", "ref"], ["SPD", "spd"], ["POS", "pos"],
] as const;

export function DraftPlayerDossier({ profile, draftData, position, playerNumber }: DraftPlayerDossierProps) {
  const stats = position === "GK" ? GK_STATS : FIELD_STATS;

  return (
    <aside className="football-draft-dossier" data-nation={draftData.nationality?.replace(/\s+/g, "")} aria-label="Hồ sơ cầu thủ đang draft">
      <div className="football-draft-dossier__heading" data-has-profile={Boolean(profile)}>
        {profile ? <PlayerPortrait portraitId={profile.portraitId} /> : <span>Hồ sơ sau draft</span>}
        <h2>{profile?.name ?? `Cầu thủ số ${playerNumber}`}</h2>
      </div>

      <div className="football-draft-dossier__meta">
        <span>Vị trí</span>
        <strong>{position}</strong>
      </div>

      <div className="football-draft-dossier__rows">
        <DetailRow label="Quốc tịch" value={draftData.nationality} />
        <DetailRow label="Chiều cao" value={draftData.height ? `${draftData.height} cm` : null} />
        <DetailRow label="Cân nặng" value={draftData.weight ? `${draftData.weight} kg` : null} />
        <DetailRow label="Tuổi vào nghề" value={draftData.debutAge} />
        <DetailRow label="Thời gian sự nghiệp" value={draftData.careerLength ? `${draftData.careerLength} năm` : null} />
        <DetailRow label="Giải đấu" value={draftData.leagueName} />
        <DetailRow label="CLB đầu tiên" value={draftData.clubName} />
      </div>

      <div className="football-draft-dossier__stats">
        <span>Chỉ số debut</span>
        <div>
          {stats.map(([label, key]) => (
            <span key={label}>
              <small>{label}</small>
              <strong>{draftData[key] ?? "—"}</strong>
            </span>
          ))}
        </div>
      </div>

    </aside>
  );
}
