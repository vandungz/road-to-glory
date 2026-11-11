"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { GameSessionSummary } from "@/types/game";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(date));
}

function SessionMeta({ session, active = false }: { session: GameSessionSummary; active?: boolean }) {
  return (
    <div className="football-classic-lobby__session-meta">
      <span>{session.formation}</span>
      <span>{formatDate(session.createdAt)}</span>
      {!active && <span>{session.status === "completed" ? "Đã hoàn thành" : "Đang draft"}</span>}
    </div>
  );
}

function ActiveSession({ session }: { session: GameSessionSummary }) {
  return (
    <article className="football-classic-lobby__active">
      <Link href={`/classic/${session.id}`} className="football-classic-lobby__active-link" aria-label={`Tiếp tục draft đội hình ${session.name}`}>
        <div className="football-classic-lobby__active-copy">
          <h2>{session.name}</h2>
          <SessionMeta session={session} active />
        </div>
        <div className="football-classic-lobby__active-action">
          <span className="football-classic-lobby__active-label">Đã draft</span>
          <strong>{session.playerCount} / 11</strong>
          <span className="football-button football-button--primary">Tiếp tục draft</span>
        </div>
      </Link>
    </article>
  );
}

function SessionRow({ session }: { session: GameSessionSummary }) {
  return (
    <div>
      <Link href={`/classic/${session.id}`} className="football-classic-lobby__row" aria-label={`Mở đội hình ${session.name}`}>
        <div className="football-classic-lobby__row-copy">
          <h3>{session.name}</h3>
          <SessionMeta session={session} />
        </div>
        <span className="football-classic-lobby__count">{session.playerCount}/11</span>
        <span className="football-classic-lobby__ovr">{session.squadRating !== null && <><strong>{session.squadRating}</strong><small>OVR</small></>}</span>
        <ChevronRight className="football-classic-lobby__chevron" aria-hidden="true" size={18} strokeWidth={1.5} />
      </Link>
    </div>
  );
}

function EmptyState() {
  return <div className="football-classic-lobby__empty"><h2>Chưa có đội hình</h2></div>;
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
          <div className="football-classic-lobby__other-heading"><span id="other-squads-title">{activeSession ? "Đội hình khác" : "Đội hình đã lưu"}</span></div>
          <div className="football-classic-lobby__other-list" role="region" aria-label="Danh sách đội hình khác" tabIndex={0}>
            {otherSessions.map((session) => <SessionRow key={session.id} session={session} />)}
          </div>
        </section>
      )}
    </div>
  );
}
