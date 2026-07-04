"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Trophy, Users, Calendar, ChevronRight } from "lucide-react";
import type { GameSessionSummary } from "@/types/game";

// ============================================================
// HELPERS
// ============================================================

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

// ============================================================
// EMPTY STATE
// ============================================================

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-20 gap-5"
    >
      {/* Vintage sticker placeholder */}
      <div
        className="w-24 h-32 flex flex-col items-center justify-center gap-2"
        style={{
          border: "2px dashed var(--cream-border)",
          borderRadius: "var(--radius-card)",
          backgroundColor: "rgba(0,0,0,0.03)",
        }}
      >
        <span style={{ fontSize: "2rem" }}>⚽</span>
        <div
          style={{
            width: "60%",
            height: "6px",
            borderRadius: "2px",
            backgroundColor: "var(--cream-border)",
          }}
        />
        <div
          style={{
            width: "40%",
            height: "6px",
            borderRadius: "2px",
            backgroundColor: "var(--cream-border)",
          }}
        />
      </div>

      <div className="text-center">
        <p
          className="font-headline text-lg font-bold uppercase"
          style={{ fontFamily: "var(--font-headline)", color: "var(--charcoal)" }}
        >
          No Squads Yet
        </p>
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "0.9rem",
            color: "var(--ink-gray)",
            marginTop: "4px",
          }}
        >
          Tạo squad đầu tiên của bạn để bắt đầu hành trình.
        </p>
      </div>
    </motion.div>
  );
}

// ============================================================
// SQUAD CARD
// ============================================================

interface SquadCardProps {
  session: GameSessionSummary;
  index: number;
}

function SquadCard({ session, index }: SquadCardProps) {
  const router = useRouter();

  return (
    <motion.button
      type="button"
      id={`squad-card-${session.id}`}
      onClick={() => router.push(`/${session.id}`)}
      className="card-retro w-full text-left group cursor-pointer"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.06, ease: "easeOut" }}
      whileHover={{ y: -2 }}
    >
      {/* Card top strip — coral accent */}
      <div
        style={{
          height: "6px",
          backgroundColor: "var(--coral)",
          borderBottom: "2px solid var(--charcoal)",
        }}
      />

      {/* Card body */}
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            {/* Squad name */}
            <h3
              className="font-headline text-lg font-bold leading-tight truncate"
              style={{
                fontFamily: "var(--font-headline)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "var(--charcoal)",
              }}
            >
              {session.name}
            </h3>

            {/* Status badge */}
            <span
              className={`badge-status mt-1 inline-flex ${
                session.status === "completed" ? "badge-completed" : "badge-in-progress"
              }`}
            >
              {session.status === "completed" ? "✓ Completed" : "● In Progress"}
            </span>
          </div>

          {/* OVR Rating bubble */}
          <div
            className="flex-shrink-0 flex flex-col items-center justify-center"
            style={{
              width: "52px",
              height: "52px",
              border: "2px solid var(--charcoal)",
              borderRadius: "50%",
              backgroundColor: session.squadRating
                ? "var(--charcoal)"
                : "var(--cream-dark)",
            }}
          >
            {session.squadRating ? (
              <>
                <span
                  className="font-headline font-bold"
                  style={{
                    fontFamily: "var(--font-headline)",
                    fontSize: "1rem",
                    color: "var(--white)",
                    lineHeight: 1,
                  }}
                >
                  {session.squadRating}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-stamp)",
                    fontSize: "0.5rem",
                    color: "rgba(255,255,255,0.7)",
                    letterSpacing: "0.1em",
                  }}
                >
                  OVR
                </span>
              </>
            ) : (
              <span
                style={{
                  fontFamily: "var(--font-stamp)",
                  fontSize: "0.55rem",
                  color: "var(--ink-gray)",
                  textAlign: "center",
                  lineHeight: 1.2,
                }}
              >
                NO OVR
              </span>
            )}
          </div>
        </div>

        {/* Meta row */}
        <div
          className="flex items-center gap-4 pt-3"
          style={{ borderTop: "1px solid var(--cream-border)" }}
        >
          <div className="flex items-center gap-1.5">
            <Users size={12} style={{ color: "var(--ink-gray)" }} />
            <span
              style={{
                fontFamily: "var(--font-stamp)",
                fontSize: "0.72rem",
                color: "var(--ink-gray)",
                letterSpacing: "0.05em",
              }}
            >
              {session.playerCount}/11 players
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Calendar size={12} style={{ color: "var(--ink-gray)" }} />
            <span
              style={{
                fontFamily: "var(--font-stamp)",
                fontSize: "0.72rem",
                color: "var(--ink-gray)",
                letterSpacing: "0.05em",
              }}
            >
              {formatDate(session.createdAt)}
            </span>
          </div>

          <div className="ml-auto">
            <ChevronRight
              size={16}
              style={{ color: "var(--charcoal)" }}
              className="group-hover:translate-x-0.5 transition-transform"
            />
          </div>
        </div>
      </div>
    </motion.button>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

interface GameListProps {
  sessions: GameSessionSummary[];
}

export function GameList({ sessions }: GameListProps) {
  if (sessions.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {sessions.map((session, i) => (
        <SquadCard key={session.id} session={session} index={i} />
      ))}
    </div>
  );
}
