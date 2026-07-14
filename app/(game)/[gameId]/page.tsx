import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/features/auth/components/LogoutButton";
import { SquadDashboard } from "@/features/squad/components/SquadDashboard";
import { FORMATION_SLOTS } from "@/types/squad";
import type { ClientSafePlayer } from "@/types/squad";
import type { Formation } from "@/types/game";

// ============================================================
// PARAMS
// ============================================================

interface Props {
  params: Promise<{ gameId: string }>;
}

// ============================================================
// METADATA
// ============================================================

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { gameId } = await params;
  const session = await prisma.gameSession.findUnique({
    where: { id: gameId },
    select: { name: true },
  });
  return {
    title: session ? `${session.name} — Squad Board | Football Life` : "Squad Board | Football Life",
  };
}

// ============================================================
// PAGE — Server Component
// ============================================================

export default async function SquadBoardPage({ params }: Props) {
  const { gameId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const session = await prisma.gameSession.findUnique({
    where: { id: gameId },
    select: {
      id:          true,
      name:        true,
      formation:   true,
      createdAt:   true,
      status:      true,
      squadRating: true,
      userId:      true,
      players: {
        where: { isRetired: true },
        orderBy: { slotIndex: "asc" },
        select: {
          id:                true,
          slotIndex:         true,
          name:              true,
          nationality:       true,
          position:          true,
          peakOvr:           true,
          cardRarity:        true,
          height:            true,
          preferredFoot:     true,
          debutAge:          true,
          retireAge:         true,
          careerLengthYears: true,
          statsTimeline:     true,
          clubStints:        true,
          achievements:      true,
        },
      },
    },
  });

  if (!session) notFound();
  if (session.userId !== user!.id) notFound();

  const formation = (session.formation as Formation) ?? "4-3-3";
  const slots     = FORMATION_SLOTS[formation] ?? FORMATION_SLOTS["4-3-3"];

  const allPlayers    = session.players as ClientSafePlayer[];
  const startingXI    = allPlayers.filter((p) => p.slotIndex >= 0 && p.slotIndex <= 10);
  const playerMap     = new Map(startingXI.map((p) => [p.slotIndex, p]));

  const inProgressPlayers = await prisma.careerPlayer.findMany({
    where: { gameSessionId: gameId, isRetired: false },
    select: { slotIndex: true },
  });
  const inProgressSlots = inProgressPlayers.map((p) => p.slotIndex);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--cream)",
        backgroundImage:
          "repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(0,0,0,0.018) 28px, rgba(0,0,0,0.018) 29px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── HEADER TỐI GIẢN ── */}
      <header style={{ borderBottom: "3px solid var(--charcoal)", backgroundColor: "var(--cream)" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          
          {/* Logo */}
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
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
          </Link>

          {/* Right side */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              border: "2px solid var(--charcoal)",
              borderRadius: "3px",
              padding: "5px 12px",
              backgroundColor: "var(--white)",
              boxShadow: "2px 2px 0 var(--charcoal)",
              textAlign: "right",
            }}>
              <div style={{ fontFamily: "var(--font-headline)", fontSize: "0.9rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--charcoal)", lineHeight: 1 }}>
                {session.name}
              </div>
              <div style={{ fontFamily: "var(--font-stamp)", fontSize: "0.55rem", color: "var(--ink-gray)", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: "2px" }}>
                Classic Mode · Formation {formation}
              </div>
            </div>
            <LogoutButton />
          </div>

        </div>
      </header>

      {/* ── NỘI DUNG CHÍNH ── */}
      <main style={{ flex: 1, maxWidth: "1100px", width: "100%", margin: "0 auto", padding: "32px 20px" }}>
        <SquadDashboard
          gameId={gameId}
          formation={formation}
          status={session.status}
          squadRating={session.squadRating}
          players={allPlayers}
          slots={slots}
          inProgressSlots={inProgressSlots}
        />
      </main>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "2px solid var(--charcoal)", padding: "16px 20px", textAlign: "center", backgroundColor: "var(--cream)" }}>
        <p style={{ fontFamily: "var(--font-stamp)", fontSize: "0.6rem", color: "var(--ink-gray)", letterSpacing: "0.14em", textTransform: "uppercase", margin: 0 }}>
          Football Life © Road to Glory — Season 2025/26
        </p>
      </footer>
    </div>
  );
}
