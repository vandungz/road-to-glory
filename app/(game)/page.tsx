import { prisma } from "@/lib/prisma";
import { GameList } from "@/features/game/components/GameList";
import { CreateGameDialog } from "@/features/game/components/CreateGameDialog";
import type { GameSessionSummary } from "@/types/game";
import { Trophy, Star } from "lucide-react";

// ============================================================
// DATA FETCHING
// ============================================================

async function getGameSessions(): Promise<GameSessionSummary[]> {
  const sessions = await prisma.gameSession.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { players: true },
      },
    },
  });

  return sessions.map((s) => ({
    id: s.id,
    name: s.name,
    createdAt: s.createdAt,
    squadRating: s.squadRating,
    status: s.status as "in_progress" | "completed",
    playerCount: s._count.players,
  }));
}

// ============================================================
// LOBBY PAGE — Server Component
// ============================================================

export default async function LobbyPage() {
  const sessions = await getGameSessions();

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--cream)",
        backgroundImage:
          "repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(0,0,0,0.018) 28px, rgba(0,0,0,0.018) 29px)",
      }}
    >
      {/* ── HEADER TỐI GIẢN ĐỒNG BỘ ── */}
      <header style={{ borderBottom: "3px solid var(--charcoal)", backgroundColor: "var(--cream)" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "34px", height: "34px",
              backgroundColor: "var(--charcoal)",
              border: "2px solid var(--charcoal)",
              borderRadius: "3px",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Trophy size={16} color="var(--coral)" />
            </div>
            <div style={{ lineHeight: 1 }}>
              <div style={{ fontFamily: "var(--font-headline)", fontSize: "0.9rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--charcoal)" }}>
                Road to Glory
              </div>
              <div style={{ fontFamily: "var(--font-stamp)", fontSize: "0.5rem", color: "var(--ink-gray)", letterSpacing: "0.14em", textTransform: "uppercase", marginTop: "2px" }}>
                Football Life
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div style={{
            border: "2px solid var(--charcoal)",
            borderRadius: "3px",
            padding: "5px 12px",
            backgroundColor: "var(--white)",
            boxShadow: "2px 2px 0 var(--charcoal)",
            textAlign: "right",
          }}>
            <div style={{ fontFamily: "var(--font-headline)", fontSize: "0.9rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--charcoal)", lineHeight: 1 }}>
              Classic Lobby
            </div>
            <div style={{ fontFamily: "var(--font-stamp)", fontSize: "0.55rem", color: "var(--ink-gray)", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: "2px" }}>
              Season 2025/26
            </div>
          </div>

        </div>
      </header>

      {/* ── NỘI DUNG CHÍNH ── */}
      <main
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "40px 20px 80px",
        }}
      >

        {/* ── MY SQUADS SECTION ── */}
        <section id="my-squads">
          {/* Section header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "24px",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2
                style={{
                  fontFamily: "var(--font-headline)",
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--charcoal)",
                  margin: 0,
                }}
              >
                My Squads
              </h2>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "0.85rem",
                  color: "var(--ink-gray)",
                  marginTop: "4px",
                  fontStyle: "italic",
                }}
              >
                {sessions.length === 0
                  ? "Bắt đầu hành trình của bạn"
                  : `${sessions.length} squad đang chờ bạn`}
              </p>
            </div>

            {/* New Squad button */}
            <CreateGameDialog />
          </div>

          {/* Game list */}
          <GameList sessions={sessions} />
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer
        style={{
          borderTop: "2px solid var(--charcoal)",
          padding: "16px 24px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-stamp)",
            fontSize: "0.65rem",
            color: "var(--ink-gray)",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          Football Life © Road to Glory — Season 2025/26 — All Rights Reserved
        </p>
      </footer>
    </div>
  );
}
