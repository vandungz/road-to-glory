"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, CircleAlert, Crown, Loader2, Swords } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { getPveTournamentAction, playPveRoundAction, startPveTournamentAction } from "@/actions/pve.actions";
import { PVE_ROUNDS, type PveRoundRecord, type PveTournamentState } from "@/types/pve";
import { roundLabel } from "@/features/pve/services/pve-engine.service";

interface Props {
  gameId: string;
  sessionName: string;
  formation: string;
  squadRating: number | null;
  initialState: PveTournamentState | null;
}

function SkeletonMatch() {
  return <div className="football-pve-match football-pve-match--loading" aria-busy="true" role="status"><span className="football-pve-skeleton football-pve-skeleton--title" /><span className="football-pve-skeleton football-pve-skeleton--line" /><span className="football-pve-skeleton football-pve-skeleton--line" /><span className="football-pve-skeleton football-pve-skeleton--line" /><span className="football-pve-skeleton football-pve-skeleton--line" /><span className="football-pve-skeleton football-pve-skeleton--line" /><span className="football-pve-skeleton football-pve-skeleton--line" /><span className="football-pve-skeleton football-pve-skeleton--line" /><span className="football-pve-skeleton football-pve-skeleton--line" /></div>;
}

function GroupStage({ state }: { state: PveTournamentState }) {
  return <section className={`football-pve-group ${state.group.passed ? "is-passed" : "is-eliminated"}`}>
    <div className="football-pve-group__heading"><span>Vòng bảng</span><strong>{state.group.passed ? "PASS" : "OUT"}</strong></div>
    <p>{state.group.summary}</p>
    <div className="football-pve-group__meta"><span>Hạng {state.group.rank}</span><span>Khả năng đi tiếp {state.group.passChance}%</span></div>
    <div className="football-pve-group__opponents"><small>Những đội cùng bảng</small><div>{state.group.opponents.map((opponent) => <span key={opponent}>{opponent}</span>)}</div></div>
  </section>;
}

function MatchCard({ record }: { record: PveRoundRecord }) {
  return <motion.article className="football-pve-match" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
    <div className="football-pve-match__header"><div><span className="football-pve-eyebrow">{roundLabel(record.round)}</span><h2>{record.opponent.name}</h2><span className="football-pve-match__sub">Đội hình {record.opponent.formation} · OVR {record.opponent.squadOvr}</span></div><div className={`football-pve-match__score ${record.result === "win" ? "is-win" : "is-loss"}`}><strong>{record.userScore} — {record.opponentScore}</strong><span>{record.result === "win" ? "Đi tiếp" : "Dừng bước"}</span></div></div>
    <div className="football-pve-lineup" aria-label={`Đội hình ${record.opponent.name}`}>
      {record.opponent.players.map((player) => <div className="football-pve-lineup__player" key={player.id}><strong>{player.name}</strong><span>{player.position} · {player.overall}</span><small>{player.eraLabel}</small></div>)}
    </div>
    <div className="football-pve-moments"><div className="football-pve-moments__heading"><span>Ba nhịp trận đấu</span><small>Thắng 2 / 3 để đi tiếp</small></div>{record.moments.map((moment) => <div className={`football-pve-moment ${moment.winner === "user" ? "is-user" : "is-opponent"}`} key={moment.index}><span className="football-pve-moment__index">0{moment.index}</span><div><strong>{moment.label}</strong><p>{moment.story}</p><small>{moment.winner === "user" ? `${moment.userFocus} thắng nhịp` : `${moment.opponentFocus} thắng nhịp`}</small></div><span className="football-pve-moment__result" aria-label={moment.winner === "user" ? "Đội bạn thắng nhịp" : "Đối thủ thắng nhịp"}>{moment.winner === "user" ? <Check aria-hidden="true" size={17} /> : <Swords aria-hidden="true" size={17} />}</span></div>)}</div>
  </motion.article>;
}

export function PveTournamentScreen({ gameId, sessionName, formation, squadRating, initialState }: Props) {
  const queryClient = useQueryClient();
  const tournamentQuery = useQuery({
    queryKey: ["pve-tournament", gameId],
    queryFn: async () => {
      const result = await getPveTournamentAction({ gameId });
      if (!result.success) throw new Error(result.error);
      return result.state;
    },
    initialData: initialState ?? undefined,
    staleTime: 30_000,
  });
  const state = tournamentQuery.data ?? null;
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const error = actionError ?? (tournamentQuery.error ? "Không thể tải trạng thái giải PvE." : null);
  const latestMatch = state?.rounds.at(-1) ?? null;
  const isPlayable = Boolean(state && PVE_ROUNDS.includes(state.status as (typeof PVE_ROUNDS)[number]));

  function runAction(action: typeof startPveTournamentAction | typeof playPveRoundAction) {
    setActionError(null);
    startTransition(async () => {
      try {
        const result = await action({ gameId });
        if (result.success) queryClient.setQueryData(["pve-tournament", gameId], result.state);
        else setActionError(result.error);
      } catch {
        setActionError("Không thể hoàn tất lượt PvE. Vui lòng thử lại.");
      }
    });
  }

  return <div className="football-pve-shell">
    <div className="football-pve-topbar"><Link href={`/classic/${gameId}`}><ArrowLeft aria-hidden="true" size={15} /> {sessionName}</Link><span>{formation} · {squadRating ?? "—"} OVR</span></div>
    <header className="football-pve-hero"><div><span className="football-pve-eyebrow">PvE · European tournament</span><h1>Con đường đến trận chung kết</h1><p>Một đội hình Classic. Bốn vòng knock-out. Mỗi trận là ba khoảnh khắc được quyết định từ OVR và profile thực tế của từng cầu thủ.</p></div><div className="football-pve-hero__stamp" aria-hidden="true"><Crown size={28} strokeWidth={1.4} /><span>Road</span><strong>to Glory</strong></div></header>
    {error && <div className="football-pve-error" role="alert"><CircleAlert aria-hidden="true" size={17} /><span>{error}</span></div>}
    <main className="football-pve-content">
      {!state ? <section className="football-pve-start"><span className="football-pve-start__number">01</span><div><h2>Đội hình đã sẵn sàng</h2><p>Vòng bảng sẽ được tính một lần ở server. Nếu vượt qua, bạn sẽ lần lượt gặp các đội hình huyền thoại ở Vòng 1/8, Tứ kết, Bán kết và Chung kết.</p></div><Button onClick={() => runAction(startPveTournamentAction)} disabled={isPending} loading={isPending}>{isPending ? "Đang bốc thăm giải" : "Bắt đầu giải PvE"}</Button></section> : <>
        <GroupStage state={state} />
        <AnimatePresence mode="wait">
          {isPending ? <SkeletonMatch key="loading-match" /> : latestMatch && <MatchCard key={`${latestMatch.round}-${latestMatch.opponent.id}`} record={latestMatch} />}
        </AnimatePresence>
        {state.status === "champion" && <section className="football-pve-terminal is-champion"><Crown aria-hidden="true" size={26} /><div><span className="football-pve-eyebrow">Tournament complete</span><h2>Bạn là nhà vô địch</h2><p>Đội hình {sessionName} đã đi hết con đường đến chiếc cúp.</p></div></section>}
        {state.status === "eliminated" && <section className="football-pve-terminal is-eliminated"><CircleAlert aria-hidden="true" size={26} /><div><span className="football-pve-eyebrow">Tournament complete</span><h2>Hành trình khép lại</h2><p>Một trận thua không xóa được những khoảnh khắc đội bạn đã tạo ra.</p></div></section>}
        {isPlayable && <section className="football-pve-next"><div><span className="football-pve-eyebrow">Next fixture</span><h2>{roundLabel(state.status)}</h2><p>Đội hình đối thủ và ba nhịp trận sẽ được bốc thăm ngay khi bạn bắt đầu vòng đấu.</p></div><Button onClick={() => runAction(playPveRoundAction)} disabled={isPending} loading={isPending}>{isPending ? <><Loader2 aria-hidden="true" size={16} className="animate-spin" /> Đang mô phỏng</> : "Bắt đầu trận đấu"}</Button></section>}
      </>}
    </main>
  </div>;
}
