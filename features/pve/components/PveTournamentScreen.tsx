"use client";

import { PageGuide } from "@/features/onboarding/GuideProvider";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, CircleAlert, RotateCcw, Swords } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useGameReducedMotion } from "@/features/settings/game-motion";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { getPveTournamentAction, playPveRoundAction, replayPveTournamentAction, startPveTournamentAction } from "@/actions/pve.actions";
import type { PveOpponentTeam, PveRoundRecord, PveStatus, PveTournamentState, PveUserLineupPlayer } from "@/types/pve";
import type { Formation } from "@/types/game";
import { PvePitchBoard } from "./PvePitchBoard";

interface Props {
  gameId: string;
  sessionName: string;
  formation: Formation;
  squadRating: number | null;
  userPlayers: PveUserLineupPlayer[];
  initialState: PveTournamentState | null;
}

const matchMoments = ["midfield", "defense", "attack"] as const;
const MOMENT_REVEAL_DELAY_MS = 2200;

function LeaguePhaseTable({ group, onContinue, onReplay }: { group: PveTournamentState["group"]; onContinue: () => void; onReplay: () => void }) {
  const ui = useTranslations("ui");
  const t = useTranslations("pve");
  return <section data-mount="detail" className="football-pve-league-table" aria-labelledby="pve-league-heading">
    <header className="football-pve-league-table__heading">
      <div><h2 id="pve-league-heading">{ui("leaguePhaseResults")}</h2><p>{t(group.passed ? "qualified" : "out", { rank: group.rank })}</p></div>
      {group.passed
        ? <Button onClick={onContinue}>{ui("enterTheRoundOf16")}</Button>
        : <Button variant="outline" onClick={onReplay}>{ui("replayWithThisSquad")}</Button>}
    </header>
    <div className="football-pve-league-table__scroll" role="region" aria-label={ui("leaguePhaseStandings")} tabIndex={0}>
      <table>
        <thead><tr><th scope="col">{ui("rank")}</th><th scope="col">{ui("club")}</th><th scope="col">{t("played")}</th><th scope="col">{ui("won")}</th><th scope="col">{ui("drawn")}</th><th scope="col">{t("lost")}</th><th scope="col">{ui("goalDifference")}</th><th scope="col">{ui("points")}</th></tr></thead>
        <tbody>
          {group.table.map((row, index) => <tr key={row.clubId} className={row.isUser ? "is-user" : undefined}>
            <td>{index + 1}</td><th scope="row">{row.isUser ? ui("yourTeam") : row.clubName}</th><td>{row.played}</td><td>{row.won}</td>
            <td>{row.drawn}</td><td>{row.lost}</td><td>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td><td>{row.points}</td>
          </tr>)}
        </tbody>
      </table>
    </div>
  </section>;
}

function PreviewCard({ status, opponent, onPlay, onReview, pending }: { pending: boolean; status: PveStatus; opponent: PveOpponentTeam; onPlay: () => void; onReview?: () => void }) {
  const ui = useTranslations("ui");
  const t = useTranslations("pve");
  return <section data-mount="detail" className="football-pve-preview">
    <header className="football-pve-preview__header">
      <div><span className="football-pve-round-label">{t(status)}</span><h2>{opponent.name}</h2><p>{ui("formation2")} {opponent.formation} / OVR {opponent.squadOvr}</p></div>
      <div className="football-pve-preview__actions">
        {onReview && <Button variant="quiet" onClick={onReview} disabled={pending}>{ui("viewPreviousMatch")}</Button>}
        <Button onClick={onPlay} loading={pending}>{ui("startMatch")}</Button>
      </div>
    </header>
    <div className="football-pve-lineup" role="region" tabIndex={0} aria-label={ui("playerDetailsFor", { v0: String(opponent.name) })}>
      {opponent.players.map((player) => <div className="football-pve-lineup__player" key={player.id}>
        <strong>{player.name}</strong><span>{player.position} / OVR {player.overall}</span>
        <small>PAC {player.stats.pace} / SHO {player.stats.shooting} / PAS {player.stats.passing}</small>
        <small>DRI {player.stats.dribbling} / DEF {player.stats.defending} / PHY {player.stats.physical}</small>
      </div>)}
    </div>
  </section>;
}

function LiveMatchCard({ record, formation, userPlayers, revealedCount, onContinue }: { record: PveRoundRecord; formation: Formation; userPlayers: PveUserLineupPlayer[]; revealedCount: number; onContinue: () => void }) {
  const ui = useTranslations("ui");
  const t = useTranslations("pve");
  const visibleMoments = record.moments.slice(0, revealedCount);
  const complete = revealedCount >= record.moments.length;
  const userScore = visibleMoments.filter((moment) => moment.winner === "user").length;
  return <article data-mount="detail" className="football-pve-match">
    <header className="football-pve-match__header">
      <div><span className="football-pve-round-label">{t(record.round)}</span><h2>{record.opponent.name}</h2><span className="football-pve-match__sub">{ui("formation2")} {record.opponent.formation} / OVR {record.opponent.squadOvr}</span></div>
      <div className={`football-pve-match__score ${complete ? (record.result === "win" ? "is-win" : "is-loss") : "is-live"}`}>
        <strong>{complete ? `${record.userScore} — ${record.opponentScore}` : `${userScore} — ${visibleMoments.length - userScore}`}</strong>
        <span>{complete ? (record.result === "win" ? ui("matchWon") : ui("matchLost")) : ui("rounds", { v0: String(visibleMoments.length), v1: String(record.moments.length) })}</span>
      </div>
    </header>
    <div className="football-pve-duel">
      <PvePitchBoard formation={formation} userPlayers={userPlayers} opponent={record.opponent} />
      <section className="football-pve-moments-panel" aria-labelledby="pve-moments-heading">
        <h3 className="football-pve-moments__heading" id="pve-moments-heading">{ui("matchRound")}</h3>
        <div className="football-pve-moments__list" role="region" tabIndex={0} aria-label={ui("matchEvents")} aria-live="polite">
          {visibleMoments.map((moment) => {
            const momentKey = matchMoments[moment.index - 1];
            return <div data-mount="detail" className={`football-pve-moment ${moment.winner === "user" ? "is-user" : "is-opponent"}`} key={moment.index}>
            <span className="football-pve-moment__index">{moment.index}</span>
            <div><strong>{momentKey ? t(momentKey) : moment.label}</strong><p>{momentKey ? t(momentKey + (moment.winner === "user" ? "Win" : "Loss")) : moment.story}</p></div>
            <span className="football-pve-moment__result" aria-label={moment.winner === "user" ? ui("yourTeamWinsTheRound") : ui("opponentWinsTheRound")}>{moment.winner === "user" ? <Check aria-hidden="true" size={17} /> : <Swords aria-hidden="true" size={17} />}</span>
          </div>; })}
          {!complete && <p className="football-pve-moments__empty">{ui("preparingNextRound")}</p>}
        </div>
        {complete && <div className="football-pve-moments__action"><Button size="sm" onClick={onContinue}>{ui("continue2")}</Button></div>}
      </section>
    </div>
  </article>;
}

export function PveTournamentScreen({ gameId, sessionName, formation, squadRating, userPlayers, initialState }: Props) {
  const ui = useTranslations("ui");
  const t = useTranslations("pve");
  const queryClient = useQueryClient();
  const queryKey = ["pve-tournament", gameId];
  const tournamentQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const result = await getPveTournamentAction({ gameId });
      if (!result.success) throw new Error(result.error);
      return result.state;
    },
    initialData: initialState,
    staleTime: 30_000,
  });
  const state = tournamentQuery.data ?? null;
  const reduceMotion = useGameReducedMotion();
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [revealedCount, setRevealedCount] = useState(0);
  const [matchView, setMatchView] = useState<"live" | "review" | null>(null);
  const [showLeagueResult, setShowLeagueResult] = useState(false);
  const [isReplayConfirmOpen, setIsReplayConfirmOpen] = useState(false);
  const error = actionError ?? (tournamentQuery.error ? ui("pveLoadError") : null);
  const latestMatch = state?.rounds.at(-1);
  const isFinished = state?.status === "champion" || state?.status === "eliminated";
  const openReplay = () => setIsReplayConfirmOpen(true);

  useEffect(() => {
    if (matchView !== "live" || !latestMatch || revealedCount >= latestMatch.moments.length) return;
    if (reduceMotion) {
      setRevealedCount(latestMatch.moments.length);
      return;
    }
    const timer = window.setTimeout(() => setRevealedCount((count) => count + 1), MOMENT_REVEAL_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [latestMatch, matchView, reduceMotion, revealedCount]);

  function runAction(kind: "start" | "play" | "replay") {
    if (isPending) return;
    setActionError(null);
    startTransition(async () => {
      try {
        const action = kind === "start" ? startPveTournamentAction : kind === "play" ? playPveRoundAction : replayPveTournamentAction;
        const result = await action({ gameId });
        if (!result.success) {
          setActionError(result.error);
          return;
        }
        queryClient.setQueryData(queryKey, result.state);
        setShowLeagueResult(kind === "start" && result.state?.status === "round_of_16" && result.state.rounds.length === 0);
        if (kind === "replay") setIsReplayConfirmOpen(false);
        setRevealedCount(kind === "play" ? 1 : 0);
        setMatchView(kind === "play" ? "live" : null);
      } catch {
        setActionError(ui("pveAdvanceError"));
      }
    });
  }

  return <div className="football-pve-shell">
    <PageGuide id="tournament" paused={isPending || matchView === "live"} />
    <header className="football-pve-hero" data-guide="pve-progress">
      <h1>Champions League 2026/27</h1>
      <div className="football-pve-topbar"><Link href={`/classic/${gameId}`}><ArrowLeft aria-hidden="true" size={15} /> {sessionName}</Link><span>{squadRating ?? "—"} OVR</span></div>
    </header>
    {error && !isReplayConfirmOpen && <div className="football-pve-error" role="alert"><CircleAlert aria-hidden="true" size={17} /><span>{error}</span></div>}
    <div className="football-pve-content" data-guide="pve-round">
      {!state ? (
        <section className="football-pve-start">
          <div><h2>League Phase</h2><p>{ui("finishInTheTopEightToReachTheRoundOf16")}</p></div>
          <Button onClick={() => runAction("start")} loading={isPending}>{ui("startLeaguePhase")}</Button>
        </section>
      ) : (showLeagueResult || (state.status === "eliminated" && !latestMatch)) ? (
        <LeaguePhaseTable group={state.group} onContinue={() => setShowLeagueResult(false)} onReplay={openReplay} />
      ) : matchView && latestMatch ? (
        <LiveMatchCard key={latestMatch.round} record={latestMatch} formation={formation} userPlayers={userPlayers}
          revealedCount={matchView === "review" || reduceMotion ? latestMatch.moments.length : revealedCount} onContinue={() => setMatchView(null)} />
      ) : isFinished ? (
        <section className="football-pve-terminal">
          <div><h2>{state.status === "champion" ? ui("youAreTheChampions") : ui("eliminated")}</h2>
            {latestMatch && <p>{t(latestMatch.round)} / {sessionName} {latestMatch.userScore}:{latestMatch.opponentScore} {latestMatch.opponent.name}</p>}
          </div>
          {latestMatch && <Button variant="quiet" onClick={() => setMatchView("review")}>{ui("viewFinalMatch")}</Button>}
          <Button onClick={openReplay}><RotateCcw aria-hidden="true" size={16} /> {ui("replayWithThisSquad")}</Button>
        </section>
      ) : state.pendingOpponent ? (
        <PreviewCard status={state.status} opponent={state.pendingOpponent} onPlay={() => runAction("play")} pending={isPending}
          onReview={latestMatch ? () => setMatchView("review") : undefined} />
      ) : null}
    </div>
    <ConfirmDialog open={isReplayConfirmOpen} title={ui("replayWithThisSquad2")}
      description={ui("thisReplacesYourPreviousTournamentResultsAndStartsFromTheLeaguePhase")} confirmLabel={ui("replay")}
      pending={isPending} error={error} onCancel={() => setIsReplayConfirmOpen(false)} onConfirm={() => runAction("replay")} />
  </div>;
}
