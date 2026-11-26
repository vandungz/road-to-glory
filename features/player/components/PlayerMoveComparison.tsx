import { useTranslations } from "next-intl";
import type { MovePlayerSummary } from "@/types/squad";
import { PlayerPortrait } from "./PlayerPortrait";
import { resolveSavedPortraitId } from "../lib/player-portraits";


export function PlayerMoveComparison({ incoming, outgoing, destination, selected, loading }: { incoming: MovePlayerSummary; outgoing?: MovePlayerSummary; destination?: string; selected: boolean; loading: boolean }) {
  const t = useTranslations("squadManagement"); const ui = useTranslations("ui");
  function profile(player: MovePlayerSummary) {
    return <>
      <div className="football-move-player-identity">
        <div className="football-move-portrait" data-nation={player.nationality.replace(/\s+/g, "")}><PlayerPortrait portraitId={resolveSavedPortraitId(player.portraitId, player.id)} animate={false} /></div>
        <div><h3>{player.name}</h3><span>{player.position}</span></div>
      </div>
      <dl><div><dt>{ui("peakOvr")}</dt><dd>{player.peakOvr}</dd></div><div><dt>{t("nationality")}</dt><dd>{player.nationality}</dd></div></dl>
    </>;
  }
  return <div className="football-move-comparison" aria-label={t("comparison")}>
    <section className="football-move-comparison__incoming" aria-label={t("incoming")}><p className="football-move-comparison__label">{t("incoming")}</p>{profile(incoming)}<p className="football-move-comparison__note">{t("keepCareer")}</p></section>
    <section className={outgoing ? "football-move-comparison__outgoing" : "football-move-comparison__empty"} aria-label={t("destinationPlayer")}>
      <p className="football-move-comparison__label">{outgoing ? t("outgoing") : t("destinationPlayer")}</p>
      {outgoing ? profile(outgoing) : loading ? <div className="football-move-comparison__skeleton" aria-hidden="true"><div className="football-skeleton" /><div className="football-skeleton" /><div className="football-skeleton" /></div> : <div className="football-move-empty"><strong>{selected ? t("emptySlot") : t("chooseDestination")}</strong><p>{selected ? t("noDeletion") : t("comparisonHint")}</p></div>}
      {destination && <p className="football-move-comparison__note">{destination}</p>}
    </section>
  </div>;
}
