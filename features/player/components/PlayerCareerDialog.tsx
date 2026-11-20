"use client";

import { useAwardCopy } from "@/features/wheel/components/useAwardCopy";
import { useTranslations } from "next-intl";
import React, { useMemo, useState, useTransition } from "react";
import { RotateCcw, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { manageSquadPlayerAction } from "@/actions/squad.actions";
import { Button } from "@/components/ui/Button";
import type { SeasonAwardRecord } from "@/types/domain";
import type { ClientSafePlayer } from "@/types/squad";
import { getHonourResultLabel, getSpecificHonourLabel } from "@/features/career/lib/honour-display";
import { getHonourRows } from "@/features/player/lib/honour-summary";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialogContent } from "@/components/ui/ConfirmDialog";
import {
  aggregateCareerStats,
  buildCareerArchiveTimeline,
  normalizeClubStints,
  type CareerArchiveSnapshot,
} from "@/features/career/services/career-summary.service";
import { PlayerOvrChart } from "./PlayerOvrChart";
import { PlayerStickerCard } from "./PlayerStickerCard";

interface PlayerCareerDialogProps {
  player: ClientSafePlayer | null;
  isOpen: boolean;
  onClose: () => void;
  gameId?: string;
  canManage?: boolean;
}

interface SeasonRow {
  age: number;
  clubName: string;
  leagueName: string;
  snap: CareerArchiveSnapshot;
  awards: SeasonAwardRecord[];
  isDebut: boolean;
  isTransfer: boolean;
  isFinal: boolean;
}

export function PlayerCareerDialog({ player, isOpen, onClose, gameId, canManage = false }: PlayerCareerDialogProps) {
  const ui = useTranslations("ui");
  const awardCopy = useAwardCopy();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [managementMode, setManagementMode] = useState<"replace" | "delete" | null>(null);
  const debutAge = player?.debutAge ?? 18;
  const retireAge = player?.retireAge ?? 35;
  const statsTimeline = useMemo(() => buildCareerArchiveTimeline({
    seasonHistory: player?.seasonHistory,
    statsTimeline: player?.statsTimeline ?? [],
    debutAge,
    retireAge,
    legacyOvrByAge: player?.archiveOvrByAge,
  }), [player?.seasonHistory, player?.statsTimeline, player?.archiveOvrByAge, debutAge, retireAge]);
  const clubStints = useMemo(
    () => normalizeClubStints(player?.clubStints ?? [], player?.seasonHistory),
    [player?.clubStints, player?.seasonHistory],
  );
  const careerLength = statsTimeline.length || player?.careerLengthYears || Math.max(1, retireAge - debutAge + 1);

  const summaryStats = useMemo(() => {
    let ratingSum = 0;
    let ratingCount = 0;
    for (const snap of statsTimeline) {
      if (snap.age < debutAge || snap.age > retireAge) continue;
      if (snap.matchRating != null) {
        ratingSum += snap.matchRating;
        ratingCount += 1;
      }
    }
    const totals = aggregateCareerStats({ seasonHistory: player?.seasonHistory, statsTimeline });
    return { ...totals, avgRating: ratingCount > 0 ? (ratingSum / ratingCount).toFixed(2) : "—" };
  }, [player?.seasonHistory, statsTimeline, debutAge, retireAge]);

  const minOvr = useMemo(() => {
    const knownOvr = statsTimeline
      .filter((snap) => snap.age >= debutAge && snap.age <= retireAge)
      .map((snap) => snap.ovr)
      .filter((ovr): ovr is number => typeof ovr === "number");
    return knownOvr.length > 0 ? Math.min(...knownOvr) : player?.peakOvr ?? 0;
  }, [statsTimeline, debutAge, retireAge, player?.peakOvr]);

  const finalClub = clubStints.at(-1)?.clubName ?? ui("freeAgent");
  const honours = useMemo(
    () => getHonourRows(player?.achievements, player?.seasonHistory, player?.honours),
    [player?.achievements, player?.seasonHistory, player?.honours],
  );
  const clubHonours = honours.filter((honour) => honour.category === "club");
  const individualHonours = honours.filter((honour) => honour.category === "individual");
  const clubRunnerUps = clubHonours.filter((honour) => honour.result === "runner_up");
  const individualRunnerUps = individualHonours.filter((honour) => honour.result === "runner_up");

  function managePlayer(mode: "replace" | "delete") {
    if (!player || !gameId) return;
    if (isPending) return;
    setActionError(null);
    startTransition(async () => {
      try {
        const result = await manageSquadPlayerAction({ gameId, playerId: player.id, mode });
        if (!result.success) {
          setActionError(result.error);
          return;
        }
        setManagementMode(null);
        onClose();
        if (mode === "replace") router.push(`/classic/${gameId}/draft/${result.slotIndex}`);
        else router.refresh();
      } catch {
        setActionError(ui("squadUpdateError"));
      }
    });
  }

  const seasonRows = useMemo<SeasonRow[]>(() => {
    const seasonAwards = player?.honours && player.honours.length > 0
      ? player.honours.map((honour) => {
          const rawRecord = player.seasonHistory && typeof player.seasonHistory === "object" && !Array.isArray(player.seasonHistory)
            ? (player.seasonHistory as Record<string, unknown>)[String(honour.age)]
            : null;
          const record = rawRecord && typeof rawRecord === "object" && !Array.isArray(rawRecord)
            ? rawRecord as Record<string, unknown>
            : {};
          const continental = record.continentalCup && typeof record.continentalCup === "object"
            ? record.continentalCup as Record<string, unknown>
            : {};
          const national = record.nationalTeam && typeof record.nationalTeam === "object"
            ? record.nationalTeam as Record<string, unknown>
            : {};
          const label = getSpecificHonourLabel(honour.awardKey, honour.label, {
            leagueId: typeof record.leagueId === "string" ? record.leagueId : honour.scopeKey,
            leagueName: typeof record.leagueName === "string" ? record.leagueName : null,
            continentalType: typeof continental.type === "string" ? continental.type : null,
            nationalTeamType: typeof national.type === "string" ? national.type : null,
          });
          return { type: honour.awardKey, label: `${getHonourResultLabel(label, honour.result)}${honour.rank && honour.rank > 1 ? ` · hạng ${honour.rank}` : ""}`, age: honour.age };
        })
      : player?.achievements?.seasonAwards ?? [];
    return statsTimeline
      .filter((snap) => snap.age >= debutAge && snap.age <= retireAge)
      .map((snap) => {
        const stint = clubStints.find((item) => snap.age >= item.startAge && snap.age <= item.endAge);
        const previousStint = clubStints.find((item) => snap.age - 1 >= item.startAge && snap.age - 1 <= item.endAge);
        return {
          age: snap.age,
          clubName: stint?.clubName ?? "—",
          leagueName: stint?.leagueName ?? "—",
          snap,
          awards: seasonAwards.filter((award) => award.age === snap.age),
          isDebut: snap.age === debutAge,
          isTransfer: Boolean(stint && previousStint && stint.clubId !== previousStint.clubId),
          isFinal: snap.age === retireAge,
        };
      })
      .sort((a, b) => a.age - b.age);
  }, [statsTimeline, clubStints, player?.achievements, player?.honours, player?.seasonHistory, debutAge, retireAge]);

  if (!isOpen || !player) return null;

  const cancelManagement = () => { setManagementMode(null); setActionError(null); };

  return (
    <Modal
      open={isOpen}
      title={managementMode ? ui(managementMode === "replace" ? "replacePlayer" : "removeFromSquad") : ui("sCareerRecord", { v0: String(player.name) })}
      onClose={managementMode ? () => { if (!isPending) cancelManagement(); } : onClose}
      closeOnBackdrop={!isPending}
      className={managementMode ? "football-confirm-dialog" : "football-career-modal"}
      size={managementMode ? "sm" : "md"}
      transitionKey={managementMode ?? "archive"}
      mobileSheet={false}
      style={managementMode ? undefined : { width: "min(1056px, calc(100% - 32px))", maxWidth: "1056px", height: "min(700px, calc(100dvh - 40px))", padding: 0, overflow: "hidden" }}
    >
      {managementMode ? <ConfirmDialogContent title={ui(managementMode === "replace" ? "replacePlayer" : "removeFromSquad")}
        description={ui(managementMode === "replace" ? "replacePlayerConfirmation" : "removePlayerConfirmation", { name: player.name })}
        confirmLabel={ui(managementMode === "replace" ? "replacePlayer" : "removeFromSquad")} pending={isPending} error={actionError}
        onCancel={cancelManagement} onConfirm={() => managePlayer(managementMode)} /> : <div className="football-career-dialog">
        <aside className="football-career-dialog__sidebar">
          <PlayerStickerCard player={player} finalClub={finalClub} debutAge={debutAge} retireAge={retireAge} careerLength={careerLength} />

          {canManage && gameId && <section className="football-career-dialog__management" aria-labelledby="squad-management-title">
            <span className="football-career-dialog__eyebrow">{ui("manageSquad")}</span>
            <h3 id="squad-management-title">{ui("manageThisSlot")}</h3>
            <p>{ui("replacingThePlayerReopensThisSlotAndResetsPveResultsForThisSquad")}</p>
            <div className="football-career-dialog__management-actions">
              <Button variant="outline" size="sm" onClick={() => { setActionError(null); setManagementMode("replace"); }} disabled={isPending}><RotateCcw aria-hidden="true" size={14} /> {ui("replacePlayer")}</Button>
              <Button variant="quiet" size="sm" className="football-career-dialog__danger-button" onClick={() => { setActionError(null); setManagementMode("delete"); }} disabled={isPending}><Trash2 aria-hidden="true" size={14} /> {ui("removeFromSquad")}</Button>
            </div>
            {actionError && <p className="football-career-dialog__action-error" role="alert">{actionError}</p>}
          </section>}

          <section className="football-career-dialog__section" aria-labelledby="career-total-title">
            <h3 id="career-total-title">{ui("careerTotals2")}</h3>
            <div className="football-career-dialog__metric"><span>{ui("appearances2")}</span><strong>{summaryStats.apps}</strong></div>
            <div className="football-career-dialog__metric"><span>{ui("goals2")}</span><strong>{summaryStats.goals}</strong></div>
            <div className="football-career-dialog__metric"><span>{ui("assists2")}</span><strong>{summaryStats.assists}</strong></div>
            <div className="football-career-dialog__metric"><span>{ui("averageMatchRating")}</span><strong className="is-positive">{summaryStats.avgRating}</strong></div>
          </section>

          <section className="football-career-dialog__section" aria-labelledby="club-honours-title">
            <h3 id="club-honours-title">{ui("clubHonours")}</h3>
            {clubHonours.filter((honour) => honour.result === "winner").length === 0 ? <p className="football-career-dialog__empty">{ui("noClubHonours")}</p> : clubHonours.filter((honour) => honour.result === "winner").map((honour) => (
              <div className="football-career-dialog__metric" key={`club:${honour.label}`}>
                <span>{awardCopy(honour.label)}</span>
                <strong>{honour.count}</strong>
              </div>
            ))}
            {clubRunnerUps.length > 0 && <>
              <h3 className="football-career-dialog__subheading">{ui("runnerupFinishes")}</h3>
              {clubRunnerUps.map((honour) => <div className="football-career-dialog__metric" key={`${honour.label}:runner-up`}><span>{awardCopy(honour.label)}</span><strong>{honour.count}</strong></div>)}
            </>}
          </section>

          <section className="football-career-dialog__section" aria-labelledby="individual-honours-title">
            <h3 id="individual-honours-title">{ui("individualAwards")}</h3>
            {individualHonours.filter((honour) => honour.result === "winner").length === 0 ? <p className="football-career-dialog__empty">{ui("noIndividualAwards")}</p> : individualHonours.filter((honour) => honour.result === "winner").map((honour) => (
              <div className="football-career-dialog__metric" key={`individual:${honour.label}`}>
                <span className={honour.accent ? "is-honour" : undefined}>{awardCopy(honour.label)}</span>
                <strong className={honour.accent ? "is-honour" : undefined}>{honour.count}</strong>
              </div>
            ))}
            {individualRunnerUps.length > 0 && <>
              <h3 className="football-career-dialog__subheading">{ui("runnerupFinishes")}</h3>
              {individualRunnerUps.map((honour) => <div className="football-career-dialog__metric" key={`${honour.label}:runner-up`}><span>{awardCopy(honour.label)}</span><strong>{honour.count}</strong></div>)}
            </>}
          </section>
        </aside>

        <main className="football-career-dialog__main">
          <header className="football-career-dialog__heading">
            <div>
              <span className="football-career-dialog__eyebrow">{ui("careerArchivePosition")} {player.position} {ui("squad")} {finalClub}</span>
              <h2>{ui("careerProgress")}</h2>
            </div>
            <button type="button" className="football-career-dialog__close" onClick={onClose} aria-label={ui("closeCareerRecord")}><X size={18} strokeWidth={1.5} aria-hidden="true" /></button>
          </header>

          <section className="football-career-dialog__chart" aria-labelledby="ovr-chart-title">
            <div className="football-career-dialog__section-heading"><h3 id="ovr-chart-title">{ui("ovrHistory")}</h3><span>{ui("lowest")} {minOvr} {ui("peak")} {player.peakOvr}</span></div>
            <PlayerOvrChart statsTimeline={statsTimeline} debutAge={debutAge} retireAge={retireAge} />
          </section>

          <section className="football-career-dialog__seasons" aria-labelledby="season-stats-title">
            <h3 id="season-stats-title">{ui("seasonbyseasonStats")}</h3>
            <div className="football-career-dialog__table-wrap">
              <table>
                <thead><tr><th>{ui("age")}</th><th>{ui("club")}</th><th>{ui("league")}</th><th>OVR</th><th>{ui("apps2")}</th><th>{ui("goals3")}</th><th>{ui("assists3")}</th><th>{ui("rating")}</th></tr></thead>
                <tbody>
                  {seasonRows.length === 0 ? <tr><td className="football-career-dialog__empty" colSpan={8}>{ui("noSeasonDataYet")}</td></tr> : seasonRows.map((row) => (
                    <React.Fragment key={row.age}>
                      <tr>
                        <td className={row.isDebut ? "is-debut" : undefined}>{row.age}</td>
                        <td>{row.clubName} <small>{row.isDebut ? ui("debut") : row.isTransfer ? ui("transfer") : row.isFinal ? ui("finalSeason2") : ""}</small></td>
                        <td>{row.leagueName}</td>
                        <td className={row.snap.ovr === player.peakOvr ? "is-peak" : undefined}>{row.snap.ovr ?? "—"}</td>
                        <td>{row.snap.apps ?? "—"}</td><td>{row.snap.goals ?? "—"}</td><td>{row.snap.assists ?? "—"}</td>
                        <td className={(row.snap.matchRating ?? 0) >= 7.8 ? "is-positive" : undefined}>{row.snap.matchRating != null ? row.snap.matchRating.toFixed(2) : "—"}</td>
                      </tr>
                      {row.awards.length > 0 && <tr className="football-career-dialog__award-row"><td colSpan={8}>{row.awards.map((award) => awardCopy(award.label)).join(" · ")}</td></tr>}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>}
    </Modal>
  );
}
