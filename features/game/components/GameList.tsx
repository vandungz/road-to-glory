"use client";
import { ScrollArea } from "@/components/ui/ScrollArea";


import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { GameSessionSummary } from "@/types/game";

function SessionMeta({ session, active = false }: { session: GameSessionSummary; active?: boolean }) {
  const ui = useTranslations("ui");
  const format = useFormatter();
  return (
    <div className="football-classic-lobby__session-meta">
      <span>{session.formation}</span>
      <span>{format.dateTime(new Date(session.createdAt), { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" })}</span>
      {!active && <span>{session.status === "completed" ? ui("completed") : ui("draftInProgress")}</span>}
    </div>
  );
}

function ActiveSession({ session }: { session: GameSessionSummary }) {
  const ui = useTranslations("ui");
  return (
    <article className="football-classic-lobby__active">
      <Link href={`/classic/${session.id}`} className="football-classic-lobby__active-link" aria-label={ui("resumeDrafting3", { v0: String(session.name) })}>
        <div className="football-classic-lobby__active-copy">
          <h2>{session.name}</h2>
          <SessionMeta session={session} active />
        </div>
        <div className="football-classic-lobby__active-action">
          <span className="football-classic-lobby__active-label">{ui("drafted")}</span>
          <strong>{session.playerCount} / 11</strong>
          <span className="football-button football-button--primary">{ui("resumeDraft")}</span>
        </div>
      </Link>
    </article>
  );
}

function SessionRow({ session }: { session: GameSessionSummary }) {
  const ui = useTranslations("ui");
  return (
    <div>
      <Link href={`/classic/${session.id}`} className="football-classic-lobby__row" aria-label={ui("open", { v0: String(session.name) })}>
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
  const ui = useTranslations("ui");
  return <div className="football-classic-lobby__empty"><h2>{ui("noSquadsYet")}</h2></div>;
}

export function GameList({ sessions }: { sessions: GameSessionSummary[] }) {
  const ui = useTranslations("ui");
  if (sessions.length === 0) return <EmptyState />;
  const activeSession = sessions.find((session) => session.status === "in_progress");
  const otherSessions = sessions.filter((session) => session.id !== activeSession?.id);

  return (
    <div className="football-classic-lobby__list">
      {activeSession && <ActiveSession session={activeSession} />}
      {otherSessions.length > 0 && (
        <section className="football-classic-lobby__other" aria-labelledby="other-squads-title">
          <div className="football-classic-lobby__other-heading"><span id="other-squads-title">{activeSession ? ui("otherSquads") : ui("savedSquads")}</span></div>
          <ScrollArea className="football-classic-lobby__other-list" role="region" aria-label={ui("otherSquadsList")} tabIndex={0}>
            {otherSessions.map((session) => <SessionRow key={session.id} session={session} />)}
          </ScrollArea>
        </section>
      )}
    </div>
  );
}
