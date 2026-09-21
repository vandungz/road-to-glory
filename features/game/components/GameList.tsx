"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import type { GameSessionSummary } from "@/types/game";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(date));
}

function ProgressTicks({ playerCount, completed = false }: { playerCount: number; completed?: boolean }) {
  return (
    <span className="football-classic-lobby__ticks" aria-label={`${playerCount} trên 11 cầu thủ`}>
      {Array.from({ length: 11 }, (_, index) => <i key={index} className={index < playerCount ? (completed ? "is-complete" : "is-filled") : undefined} aria-hidden="true" />)}
    </span>
  );
}

function SessionMeta({ session, active = false }: { session: GameSessionSummary; active?: boolean }) {
  const status = session.status === "completed" ? "đã hoàn thành" : "đang tiến hành";
  return <span className="football-classic-lobby__session-meta">Sơ đồ {session.formation}{active ? "" : ` · ${status}`} · tạo {formatDate(session.createdAt)}</span>;
}

function ActiveSession({ session }: { session: GameSessionSummary }) {
  return (
    <motion.article className="football-classic-lobby__active" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <Link href={`/classic/${session.id}`} className="football-classic-lobby__active-link" aria-label={`Tiếp tục draft đội hình ${session.name}`}>
        <div className="football-classic-lobby__active-copy">
          <h2>{session.name}</h2>
          <SessionMeta session={session} active />
          <ProgressTicks playerCount={session.playerCount} />
        </div>
        <div className="football-classic-lobby__active-action">
          <span className="football-classic-lobby__active-label">Đã draft</span>
          <strong>{session.playerCount} / 11</strong>
          <span className="football-button football-button--primary">Tiếp tục draft</span>
          <ChevronRight aria-hidden="true" size={18} strokeWidth={1.5} />
        </div>
      </Link>
    </motion.article>
  );
}

function SessionRow({ session, index }: { session: GameSessionSummary; index: number }) {
  const completed = session.status === "completed";
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2, delay: index * 0.04 }}>
      <Link href={`/classic/${session.id}`} className="football-classic-lobby__row" aria-label={`Mở đội hình ${session.name}`}>
        <div className="football-classic-lobby__row-copy">
          <h3>{session.name}</h3>
          <SessionMeta session={session} />
        </div>
        <ProgressTicks playerCount={session.playerCount} completed={completed} />
        <span className="football-classic-lobby__count">{session.playerCount} / 11</span>
        <span className="football-classic-lobby__ovr"><strong>{session.squadRating ?? "—"}</strong><small>Squad OVR</small></span>
        <ChevronRight className="football-classic-lobby__chevron" aria-hidden="true" size={18} strokeWidth={1.5} />
      </Link>
    </motion.div>
  );
}

function EmptyState() {
  return <div className="football-classic-lobby__empty"><h2>Chưa có đội hình</h2><p>Tạo đội hình đầu tiên, chọn sơ đồ, rồi draft mười một sự nghiệp — mỗi vị trí là một cầu thủ với hành trình riêng.</p></div>;
}

export function GameList({ sessions }: { sessions: GameSessionSummary[] }) {
  if (sessions.length === 0) return <EmptyState />;
  const activeSession = sessions.find((session) => session.status === "in_progress");
  const otherSessions = sessions.filter((session) => session.id !== activeSession?.id);

  return (
    <div className="football-classic-lobby__list">
      {activeSession && <ActiveSession session={activeSession} />}
      {otherSessions.length > 0 && (
        <section className="football-classic-lobby__other" aria-labelledby="other-squads-title">
          <div className="football-classic-lobby__other-heading"><span id="other-squads-title">Đội hình khác</span><small>{otherSessions.length} đội hình · xếp mới nhất</small></div>
          {otherSessions.map((session, index) => <SessionRow key={session.id} session={session} index={index} />)}
        </section>
      )}
    </div>
  );
}
