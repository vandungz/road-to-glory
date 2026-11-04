"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, CircleAlert, Crown, RotateCcw, Swords } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/Modal";
import { getPveTournamentAction, playPveRoundAction, replayPveTournamentAction, startPveTournamentAction } from "@/actions/pve.actions";
import { type PveOpponentTeam, type PveRoundRecord, type PveTournamentState, type PveUserLineupPlayer } from "@/types/pve";
import type { Formation } from "@/types/game";
import { roundLabel } from "@/features/pve/services/pve-engine.service";
import { PvePitchBoard } from "./PvePitchBoard";

interface Props {
  gameId: string;
  sessionName: string;
  formation: Formation;
  squadRating: number | null;
  userPlayers: PveUserLineupPlayer[];
  initialState: PveTournamentState | null;
}

const MOMENT_REVEAL_DELAY_MS = 2200;

function SkeletonMatch() {
  return <div className="football-pve-match football-pve-match--loading" aria-busy="true" role="status" aria-label="Đang chuẩn bị trận đấu"><div className="football-pve-match__header"><span className="football-pve-skeleton football-pve-skeleton--title" /><span className="football-pve-skeleton football-pve-skeleton--score" /></div><div className="football-pve-loading-duel"><span className="football-pve-skeleton football-pve-skeleton--pitch" /><span className="football-pve-skeleton football-pve-skeleton--moments" /></div></div>;
}

function LeaguePhaseTable({ state }: { state: PveTournamentState }) {
  return <section className="football-pve-league-table">
    <div className="football-pve-league-table__heading"><div><span className="football-pve-eyebrow">League phase</span><p>{state.group.summary}</p></div><strong className={state.group.passed ? "is-pass" : "is-out"}>{state.group.passed ? "PASS" : "OUT"}</strong></div>
    <div className="football-pve-league-table__scroll" role="table" aria-label="Bảng xếp hạng PvE league phase">
      <div className="football-pve-league-table__row football-pve-league-table__row--head" role="row"><span>#</span><span>CLB</span><span>MP</span><span>W</span><span>D</span><span>L</span><span>GD</span><span>PTS</span></div>
      {state.group.table.map((row, index) => <div className={`football-pve-league-table__row ${row.isUser ? "is-user" : ""}`} role="row" key={row.clubId}><span>{index + 1}</span><strong>{row.clubName}</strong><span>{row.played}</span><span>{row.won}</span><span>{row.drawn}</span><span>{row.lost}</span><span>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</span><strong>{row.points}</strong></div>)}
    </div>
  </section>;
}

function PreviewCard({ opponent, onPlay, isPending }: { opponent: PveOpponentTeam; onPlay: () => void; isPending: boolean }) {
  return <motion.section className="football-pve-preview" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
    <div className="football-pve-preview__header"><div><span className="football-pve-eyebrow">Trận đấu tiếp theo</span><h2>{opponent.name}</h2><p>{opponent.formation} · OVR {opponent.squadOvr}</p></div><Button onClick={onPlay} disabled={isPending} loading={isPending}>{isPending ? "Đang chuẩn bị" : "Bắt đầu trận đấu"}</Button></div>
    <div className="football-pve-lineup" aria-label={`Thông tin cầu thủ ${opponent.name}`}>
      {opponent.players.map((player) => <div className="football-pve-lineup__player" key={player.id}><strong>{player.name}</strong><span>{player.position} · OVR {player.overall}</span><small>PAC {player.stats.pace} · SHO {player.stats.shooting} · PAS {player.stats.passing}</small><small>DRI {player.stats.dribbling} · DEF {player.stats.defending} · PHY {player.stats.physical}</small></div>)}
    </div>
  </motion.section>;
}

function LiveMatchCard({ record, formation, userPlayers, revealedCount, onContinue }: { record: PveRoundRecord; formation: Formation; userPlayers: PveUserLineupPlayer[]; revealedCount: number; onContinue: () => void }) {
  const visibleMoments = record.moments.slice(0, revealedCount);
  const complete = revealedCount >= record.moments.length;
  const isGenerating = !complete;
  const userScore = visibleMoments.filter((moment) => moment.winner === "user").length;
  return <motion.article className="football-pve-match" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
    <div className="football-pve-match__header"><div><span className="football-pve-eyebrow">{roundLabel(record.round)}</span><h2>{record.opponent.name}</h2><span className="football-pve-match__sub">{record.opponent.formation} · OVR {record.opponent.squadOvr}</span></div><div className={`football-pve-match__score ${complete ? (record.result === "win" ? "is-win" : "is-loss") : "is-live"}`}><strong>{complete ? `${record.userScore} — ${record.opponentScore}` : `${userScore} — ${visibleMoments.length - userScore}`}</strong><span>{complete ? "Trận đấu kết thúc" : `${visibleMoments.length}/3 nhịp`}</span></div></div>
    <div className="football-pve-duel"><PvePitchBoard formation={formation} userPlayers={userPlayers} opponent={record.opponent} /><div className="football-pve-moments-panel" aria-live="polite"><div className="football-pve-moments__heading"><span>Nhịp trận đấu</span><small>{visibleMoments.length}/3</small></div>{visibleMoments.length === 0 && <p className="football-pve-moments__empty">Trận đấu đang bắt đầu.</p>}{visibleMoments.map((moment) => <motion.div className={`football-pve-moment ${moment.winner === "user" ? "is-user" : "is-opponent"}`} key={moment.index} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}><span className="football-pve-moment__index">0{moment.index}</span><div><strong>{moment.label}</strong><p>{moment.story}</p><small>{moment.winner === "user" ? `${moment.userFocus} thắng nhịp` : `${moment.opponentFocus} thắng nhịp`}</small></div><span className="football-pve-moment__result" aria-label={moment.winner === "user" ? "Đội bạn thắng nhịp" : "Đối thủ thắng nhịp"}>{moment.winner === "user" ? <Check aria-hidden="true" size={17} /> : <Swords aria-hidden="true" size={17} />}</span></motion.div>)}{isGenerating && <div className="football-pve-moment football-pve-moment--loading" aria-busy="true"><span className="football-pve-moment__index">0{visibleMoments.length + 1}</span><div><strong>Đang sinh nhịp trận đấu…</strong><span className="football-pve-skeleton football-pve-skeleton--moment-line" /><span className="football-pve-skeleton football-pve-skeleton--moment-line football-pve-skeleton--moment-line-short" /></div><span className="football-pve-moment__result" aria-hidden="true" /></div>}{complete && <div className="football-pve-moments__action"><Button size="sm" onClick={onContinue}>Tiếp tục</Button></div>}</div></div>
  </motion.article>;
}

export function PveTournamentScreen({ gameId, sessionName, formation, squadRating, userPlayers, initialState }: Props) {
  const queryClient = useQueryClient();
  const tournamentQuery = useQuery({ queryKey: ["pve-tournament", gameId], queryFn: async () => { const result = await getPveTournamentAction({ gameId }); if (!result.success) throw new Error(result.error); return result.state; }, initialData: initialState ?? undefined, staleTime: 30_000 });
  const state = tournamentQuery.data ?? null;
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [revealedCount, setRevealedCount] = useState(0);
  const [showNextPreview, setShowNextPreview] = useState(false);
  const [isReplayConfirmOpen, setIsReplayConfirmOpen] = useState(false);
  const error = actionError ?? (tournamentQuery.error ? "Không thể tải trạng thái giải PvE." : null);
  const latestMatch = state?.rounds.at(-1) ?? null;
  const showLiveMatch = Boolean(latestMatch && !showNextPreview);
  const terminalVisible = Boolean(state && (state.status === "champion" || state.status === "eliminated") && (!latestMatch || (showNextPreview && revealedCount >= latestMatch.moments.length)));

  useEffect(() => {
    setRevealedCount(0);
    setShowNextPreview(false);
    if (!latestMatch) return;
    let count = 0;
    const timer = window.setInterval(() => {
      count += 1;
      setRevealedCount(count);
      if (count >= latestMatch.moments.length) window.clearInterval(timer);
    }, MOMENT_REVEAL_DELAY_MS);
    return () => window.clearInterval(timer);
  }, [latestMatch]);

  function runAction(action: typeof startPveTournamentAction | typeof playPveRoundAction) {
    setActionError(null);
    startTransition(async () => { try { const result = await action({ gameId }); if (result.success) queryClient.setQueryData(["pve-tournament", gameId], result.state); else setActionError(result.error); } catch { setActionError("Không thể hoàn tất lượt PvE. Vui lòng thử lại."); } });
  }

  function confirmReplay() {
    setIsReplayConfirmOpen(false);
    setActionError(null);
    startTransition(async () => { try { const result = await replayPveTournamentAction({ gameId }); if (result.success) queryClient.setQueryData(["pve-tournament", gameId], result.state); else setActionError(result.error); } catch { setActionError("Không thể mở lại giải PvE. Vui lòng thử lại."); } });
  }

  return <div className="football-pve-shell">
    <div className="football-pve-topbar"><Link href={`/classic/${gameId}`}><ArrowLeft aria-hidden="true" size={15} /> {sessionName}</Link><span>{squadRating ?? "—"} OVR</span></div>
    <header className="football-pve-hero"><div><span className="football-pve-eyebrow">PvE · Champions League 2026/27</span><h1>Con đường đến trận chung kết</h1></div><div className="football-pve-hero__stamp" aria-hidden="true"><Crown size={28} strokeWidth={1.4} /><span>Road</span><strong>to Glory</strong></div></header>
    {error && <div className="football-pve-error" role="alert"><CircleAlert aria-hidden="true" size={17} /><span>{error}</span></div>}
    <main className="football-pve-content">
      {!state ? <section className="football-pve-start"><span className="football-pve-start__number">01</span><div><h2>Đội hình đã sẵn sàng</h2><p>Vòng bảng sẽ được tính một lần ở server.</p></div><Button onClick={() => runAction(startPveTournamentAction)} disabled={isPending} loading={isPending}>{isPending ? "Đang bốc thăm giải" : "Bắt đầu giải PvE"}</Button></section> : <>
        <LeaguePhaseTable state={state} />
        <AnimatePresence mode="wait">{isPending ? <SkeletonMatch key="loading-match" /> : showLiveMatch && latestMatch ? <LiveMatchCard key={`${latestMatch.round}-${latestMatch.opponent.id}`} record={latestMatch} formation={formation} userPlayers={userPlayers} revealedCount={revealedCount} onContinue={() => setShowNextPreview(true)} /> : state.pendingOpponent ? <PreviewCard key={`${state.status}-${state.pendingOpponent.id}`} opponent={state.pendingOpponent} onPlay={() => runAction(playPveRoundAction)} isPending={isPending} /> : null}</AnimatePresence>
        {terminalVisible && <section className={`football-pve-terminal ${state.status === "champion" ? "is-champion" : "is-eliminated"}`}>{state.status === "champion" ? <Crown aria-hidden="true" size={26} /> : <CircleAlert aria-hidden="true" size={26} />}<div><span className="football-pve-eyebrow">Kết quả giải đấu</span><h2>{state.status === "champion" ? "Bạn là nhà vô địch" : "Hành trình khép lại"}</h2><p>{state.status === "champion" ? `Đội hình ${sessionName} đã đi hết con đường đến chiếc cúp.` : "Một trận thua không xóa được những khoảnh khắc đội bạn đã tạo ra."}</p></div><Button variant="outline" onClick={() => setIsReplayConfirmOpen(true)} disabled={isPending} loading={isPending}><RotateCcw aria-hidden="true" size={16} /> Chơi lại với đội hình này</Button></section>}
      </>}
    </main>
    <Modal open={isReplayConfirmOpen} title="Xác nhận chơi lại giải PvE" onClose={() => setIsReplayConfirmOpen(false)} size="sm">
      <ModalHeader eyebrow="PvE Tournament" onClose={() => setIsReplayConfirmOpen(false)}>Chơi lại với đội hình này?</ModalHeader>
      <ModalBody><p className="football-pve-confirm-copy">Kết quả hiện tại sẽ được thay bằng một hành trình mới, vẫn giữ nguyên đội hình Classic.</p></ModalBody>
      <ModalFooter><Button variant="quiet" onClick={() => setIsReplayConfirmOpen(false)}>Hủy</Button><Button onClick={confirmReplay} loading={isPending}>Chơi lại</Button></ModalFooter>
    </Modal>
  </div>;
}
