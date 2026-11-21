"use client";

import { PageGuide } from "@/features/onboarding/GuideProvider";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { RefreshCw, RotateCw } from "lucide-react";
import { RouteLoading } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { SpinnerWheel } from "@/features/wheel/components/SpinnerWheel";
import { NationFlag } from "@/components/shared/NationFlag";
import { PlayerPortrait } from "@/features/player/components/PlayerPortrait";
import { trackGameEntry } from "@/features/game/lib/entry-analytics";
import { useQuickMode } from "../hooks/useQuickMode";
import type { QuickClubOption, QuickLeagueOption, QuickPlayer, QuickStatKey } from "../types";

interface Props {
  leagues: QuickLeagueOption[];
  clubs: QuickClubOption[];
  isAuthenticated: boolean;
}

function valueLabel(value: unknown, yes: string, no: string) {
  if (typeof value === "object" && value !== null && "name" in value) return String(value.name);
  if (value === "yes") return yes;
  if (value === "no") return no;
  return String(value);
}

function formatInternationalCups(types: string[]) {
  const counts = types.reduce<Record<string, number>>((result, type) => ({ ...result, [type]: (result[type] ?? 0) + 1 }), {});
  return Object.entries(counts).map(([type, count]) => count > 1 ? `${count}× ${type}` : type).join(", ");
}

function PlayerIdentity({ player }: { player: QuickPlayer }) {
  return <span className="football-quick-player-meta">
    <span aria-hidden="true"><NationFlag nationality={player.nationality} /></span>
    <span>{player.nationality}</span>
    <span>{player.position}</span>
  </span>;
}

export function QuickModeScreen({ leagues, clubs, isAuthenticated }: Props) {
  const ui = useTranslations("ui");
  const t = useTranslations("quick");
  const quick = useQuickMode({ leagues, clubs });
  const { state, activeWheel } = quick;
  const seenActiveRun = useRef(false);

  useEffect(() => {
    if (!quick.hydrated || !state.player.name.trim() || isAuthenticated) return;
    if (state.phase !== "complete") {
      if (!seenActiveRun.current && state.phase === "setup" && state.setupStep === 0) trackGameEntry("quick_start");
      seenActiveRun.current = true;
    } else if (seenActiveRun.current) {
      seenActiveRun.current = false;
      trackGameEntry("quick_complete");
    }
  }, [isAuthenticated, quick.hydrated, state.phase, state.player.name, state.setupStep]);

  if (!quick.hydrated) return <RouteLoading title="Quick Mode" label={ui("openingYourRun")} layout="quick" />;
  if (state.phase === "complete") return <QuickSummary quick={quick} isAuthenticated={isAuthenticated} />;

  if (!state.player.name.trim()) {
    return (
      <section className="football-quick-mode">
        <div className="football-quick-empty">
          <h1>{ui("playerSetup")}</h1>
          <Link className="football-button football-button--primary" href="/quick">{ui("backToSetup")}</Link>
        </div>
      </section>
    );
  }

  const draft = state.clubDraft;
  const context = state.phase === "career" ? draft.clubName ?? draft.leagueName : null;
  const phase = state.phase === "setup" ? ui("createPlayer") : state.phase === "career"
    ? t("clubProgress", { index: state.careerClubIndex + 1, total: state.player.clubCount ?? 0 })
    : t("careerResults");
  const wheelKey = activeWheel?.key;
  const title = draft.improvementTarget ? t("improvement-value", { stat: quick.getQuickStatLabel(draft.improvementTarget) })
    : wheelKey?.startsWith("stat-") ? quick.getQuickStatLabel(wheelKey.slice(5) as QuickStatKey)
    : wheelKey && t.has(wheelKey) ? t(wheelKey, {
        index: wheelKey === "other-award-type" ? state.finale.otherAwardTypes.length + 1
          : wheelKey === "international-cup-type" ? draft.internationalCupTypes.length + 1
          : draft.improvements.length + 1,
        total: draft.internationalCups ?? 0,
        stat: ui("stats"),
      }) : t("wheel");
  const hasOptions = Boolean((activeWheel?.spinItems ?? activeWheel?.items)?.length);

  return (
    <section className="football-quick-mode football-quick-play">
      <PageGuide id="quickPlay" paused={quick.isSpinning} />
      <QuickStatsTracker quick={quick} />
      <div className="football-quick-play__stage">
        <header className="football-quick-mode__stage-head">
          <h1 key={title} data-mount="detail">{title}</h1>
          <div className="football-quick-play__context">
            <span>{phase}</span>
            {context && <strong>{context}</strong>}
          </div>
        </header>

        <div className="football-quick-play__controls">
          <div className="football-quick-play__wheel">
            {activeWheel && hasOptions
              ? <SpinnerWheel data-guide="quick-wheel" isSpinning={quick.isSpinning} targetIndex={quick.targetIndex} onSpinComplete={() => {
                  quick.completeSpin();
                  if (!isAuthenticated && activeWheel.key === "debut-age") trackGameEntry("quick_first_spin");
                }}
                  idleLabel={null} stakes={state.phase === "finale" ? "high" : "low"}
                  items={activeWheel.items.map((item) => ({
                    label: activeWheel.key === "improvement-stat" ? item.label ?? valueLabel(item.value, t("yes"), t("no")) : valueLabel(item.value, t("yes"), t("no")),
                    value: item.value,
                    weight: activeWheel.key.startsWith("stat-") ? 1 : item.weight,
                    active: item.active,
                  }))} />
              : <p role="status">{ui("thisWheelHasNoOptions")}</p>}
          </div>
          <div className="football-quick-mode__action">
            <Button size="lg" onClick={quick.spin} disabled={!hasOptions || quick.isSpinning} aria-busy={quick.isSpinning}>
              {!quick.isSpinning && <RotateCw aria-hidden="true" size={16} />}
              {quick.isSpinning ? ui("spinning2") : ui("spin2")}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function QuickStatsTracker({ quick }: { quick: ReturnType<typeof useQuickMode> }) {
  const ui = useTranslations("ui");
  const { state, stats, statKeys } = quick;
  const { player } = state;
  const revealedStats = statKeys.filter((key) => stats[key] !== undefined);
  const yearsSpent = state.clubs.reduce((sum, club) => sum + club.seasons, 0);
  const justFinishedClub = state.phase === "career" ? state.careerStep === 0 : state.phase === "finale" && state.finaleStep === 0;
  const improvements = justFinishedClub ? state.clubs.at(-1)?.improvements ?? [] : state.clubDraft.improvements;

  return (
    <aside className="football-quick-play__tracker" data-guide="quick-tracker" data-nation={player.nationality.replace(/\s+/g, "")} aria-label={ui("playerProfileAndStats")} tabIndex={0}>
      <header className="football-quick-play__tracker-head">
        <div className="football-quick-portrait-identity">
          <PlayerPortrait portraitId={player.portraitId} loop />
          <div><strong>{player.name}</strong><PlayerIdentity player={player} /></div>
        </div>
        <div className="football-quick-play__trait" aria-live="polite" aria-atomic="true">
          {player.trait && <><span>{ui("trait")}</span><strong>{player.trait.name}</strong></>}
        </div>
      </header>
      {revealedStats.length === statKeys.length && <div className="football-quick-play__tracker-ovr"><span>OVR</span><strong>{quick.overall}</strong></div>}
      {revealedStats.length > 0 && <dl className="football-quick-play__stats" aria-label={ui("stats")}>
        {revealedStats.map((key) => {
          const delta = improvements.find((item) => item.stat === key)?.delta ?? 0;
          const label = quick.getQuickStatLabel(key);
          return <div key={key}>
            <dt>{label}</dt>
            <dd aria-live="polite" aria-atomic="true" aria-label={`${label}: ${stats[key]}${delta > 0 ? ui("up", { v0: String(delta) }) : ""}`}>
              {delta > 0 && <span className="football-quick-play__stat-gain">+{delta}</span>}
              <span>{stats[key]}</span>
            </dd>
          </div>;
        })}
      </dl>}
      {player.debutAge !== null && <dl className="football-quick-play__career-meta">
        <div><dt>{ui("debutAge2")}</dt><dd>{player.debutAge}</dd></div>
        {player.careerLength !== null && <div><dt>{state.phase === "setup" ? ui("career") : ui("seasonsPlayed")}</dt><dd>{state.phase === "setup" ? ui("seasonCount", { count: player.careerLength }) : `${yearsSpent} / ${player.careerLength}`}</dd></div>}
      </dl>}
    </aside>
  );
}

function QuickSummary({ quick, isAuthenticated }: { quick: ReturnType<typeof useQuickMode>; isAuthenticated: boolean }) {
  const ui = useTranslations("ui");
  const { state } = quick;
  const namedAwards = state.finale.otherAwardTypes;

  return (
    <section className="football-quick-mode football-quick-summary">
      <PageGuide id="quickSummary" />
      <header className="football-quick-summary__hero">
        <div className="football-quick-summary__identity" data-nation={state.player.nationality.replace(/\s+/g, "")}>
          <PlayerPortrait portraitId={state.player.portraitId} animate={false} />
          <div>
            <h1>{ui("careerComplete")}</h1>
            <div><strong>{state.player.name}</strong><PlayerIdentity player={state.player} /></div>
          </div>
        </div>
        <div className="football-quick-summary__ovr"><span>OVR</span><strong>{quick.overall}</strong></div>
      </header>
      <dl className="football-quick-summary__totals" data-guide="quick-totals">
        <div><dt>{ui("appearances")}</dt><dd>{state.finale.appearances ?? "—"}</dd></div>
        <div><dt>{ui("goals2")}</dt><dd>{state.finale.goals}</dd></div>
        <div><dt>{ui("assists2")}</dt><dd>{state.finale.assists}</dd></div>
        <div><dt>{ui("cleanSheets2")}</dt><dd>{state.finale.cleanSheets ?? "—"}</dd></div>
        <div><dt>{ui("ballonDor2")}</dt><dd>{state.finale.ballonDorWins ?? 0}</dd></div>
      </dl>
      <div className="football-quick-summary__records" data-guide="quick-records" role="region" tabIndex={0} aria-label={ui("careerDetails")}>
        <table className="football-quick-summary__journey">
          <caption>{ui("clubHistory2")}</caption>
          <thead><tr>
            <th scope="col">{ui("club")}</th><th scope="col">{ui("seasons4")}</th><th scope="col">{ui("leagueTitles")}</th><th scope="col">{ui("domesticCups")}</th><th scope="col">{ui("internationalCups")}</th>
          </tr></thead>
          <tbody>
            {state.clubs.map((club) => (
              <tr key={`${club.clubId}-${club.clubIndex}`}>
                <th scope="row"><strong>{club.clubName}</strong><small>{club.leagueName}</small></th>
                <td>{club.seasons}</td>
                <td>{club.leagueTitles}</td>
                <td>{club.domesticCups}</td>
                <td>{club.internationalCups}{club.internationalCupTypes.length > 0 && <small>{formatInternationalCups(club.internationalCupTypes)}</small>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {namedAwards.length > 0 && <div className="football-quick-summary__awards"><h2>{ui("otherIndividualAwards")}</h2><p>{namedAwards.join(", ")}</p></div>}
      </div>
      <div className="football-quick-summary__actions" data-guide="quick-replay">
        {!isAuthenticated && <Link className="football-button football-button--outline" href="/login?next=/">{ui("signInToPlayClassic")}</Link>}
        <Link className="football-button football-button--primary" href="/quick" onClick={quick.reset}><RefreshCw aria-hidden="true" size={14} /> {ui("playQuickModeAgain")}</Link>
      </div>
    </section>
  );
}
