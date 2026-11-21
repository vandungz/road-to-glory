import { useTranslations } from "next-intl";
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
  const ui = useTranslations("ui");
  const stats = position === "GK" ? GK_STATS : FIELD_STATS;

  return (
    <aside className="football-draft-dossier" data-guide="draft-result" data-nation={draftData.nationality?.replace(/\s+/g, "")} aria-label={ui("draftProfile")}>
      <div className="football-draft-dossier__heading" data-has-profile={Boolean(profile)}>
        {profile ? <PlayerPortrait portraitId={profile.portraitId} /> : <span>{ui("completedDraftProfile")}</span>}
        <h2>{profile?.name ?? ui("player", { v0: String(playerNumber) })}</h2>
      </div>

      <div className="football-draft-dossier__meta">
        <span>{ui("position")}</span>
        <strong>{position}</strong>
      </div>

      <div className="football-draft-dossier__rows">
        <DetailRow label={ui("nationality")} value={draftData.nationality} />
        <DetailRow label={ui("height")} value={draftData.height ? `${draftData.height} cm` : null} />
        <DetailRow label={ui("weight")} value={draftData.weight ? `${draftData.weight} kg` : null} />
        <DetailRow label={ui("debutAge")} value={draftData.debutAge} />
        <DetailRow label={ui("careerLength")} value={draftData.careerLength ? ui("yearCount", { count: draftData.careerLength }) : null} />
        <DetailRow label={ui("competition")} value={draftData.leagueName} />
        <DetailRow label={ui("firstClub")} value={draftData.clubName} />
      </div>

      <div className="football-draft-dossier__stats">
        <span>{ui("debutStats")}</span>
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
