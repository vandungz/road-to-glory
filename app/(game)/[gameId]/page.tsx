import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PitchBoard } from "@/features/squad/components/PitchBoard";
import { FORMATION_SLOTS } from "@/types/squad";
import type { ClientSafePlayer } from "@/types/squad";
import type { Formation } from "@/types/game";
import { completeGameSession } from "@/actions/season.actions";

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

  const session = await prisma.gameSession.findUnique({
    where: { id: gameId },
    select: {
      id:          true,
      name:        true,
      formation:   true,
      createdAt:   true,
      status:      true,
      squadRating: true,
      players: {
        orderBy: { slotIndex: "asc" },
        select: {
          id:          true,
          slotIndex:   true,
          name:        true,
          nationality: true,
          position:    true,
          peakOvr:     true,
          cardRarity:  true,
        },
      },
    },
  });

  if (!session) notFound();

  const formation = (session.formation as Formation) ?? "4-3-3";
  const slots     = FORMATION_SLOTS[formation] ?? FORMATION_SLOTS["4-3-3"];

  const allPlayers    = session.players as ClientSafePlayer[];
  const startingXI    = allPlayers.filter((p) => p.slotIndex >= 0 && p.slotIndex <= 10);
  const playerMap     = new Map(startingXI.map((p) => [p.slotIndex, p]));

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
              {session.name}
            </div>
            <div style={{ fontFamily: "var(--font-stamp)", fontSize: "0.55rem", color: "var(--ink-gray)", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: "2px" }}>
              Classic Mode · Formation {formation}
            </div>
          </div>

        </div>
      </header>

      {/* ── NỘI DUNG CHÍNH ── */}
      <main style={{ flex: 1, maxWidth: "1100px", width: "100%", margin: "0 auto", padding: "32px 20px" }}>
        
        {/* Layout hai cột sử dụng inline Flexbox để đảm bảo tính tương thích cao và không bị cache css */}
        <div style={{
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          gap: "32px",
          alignItems: "flex-start",
          justifyContent: "center",
        }}>

          {/* Cột 1: Pitch Board (Cố định rộng 400px) */}
          <div style={{
            flex: "0 0 400px",
            width: "400px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}>
            <p style={{ fontFamily: "var(--font-stamp)", fontSize: "0.58rem", color: "var(--ink-gray)", letterSpacing: "0.15em", textTransform: "uppercase", margin: 0 }}>
              Tactical Pitch View
            </p>
            <PitchBoard
              gameId={gameId}
              formation={formation}
              players={startingXI}
              status={session.status}
            />
          </div>

          {/* Cột 2: Starting XI Table & Play Match Panel (Chiếm diện tích còn lại) */}
          <div style={{
            flex: "1 1 450px",
            minWidth: "350px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}>
            
            {/* ── PANEL MÔ PHỎNG & SQUAD INFO ── */}
            <div style={{
              backgroundColor: "var(--white)",
              border: "2px solid var(--charcoal)",
              borderRadius: "4px",
              boxShadow: "3px 3px 0 var(--charcoal)",
              padding: "16px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px",
            }}>
              <div>
                <p style={{ fontFamily: "var(--font-stamp)", fontSize: "0.58rem", color: "var(--ink-gray)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "4px" }}>
                  Chỉ số Đội hình
                </p>
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                  <span style={{ fontFamily: "var(--font-headline)", fontSize: "2rem", fontWeight: 700, color: "var(--charcoal)", lineHeight: 1 }}>
                    {session.status === "completed" 
                      ? (session.squadRating ?? 0) 
                      : (startingXI.length > 0 ? Math.round(startingXI.reduce((sum, p) => sum + p.peakOvr, 0) / startingXI.length) : "—")}
                  </span>
                  <span style={{ fontFamily: "var(--font-headline)", fontSize: "0.85rem", fontWeight: 700, color: "var(--ink-gray)" }}>
                    SQUAD OVR
                  </span>
                </div>
                <p style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", color: "var(--ink-light)", marginTop: "4px", fontStyle: "italic" }}>
                  {session.status === "completed" 
                    ? "Đội hình hoàn thành xuất sắc sự nghiệp!"
                    : startingXI.length === 11 
                    ? "Đội hình đã sẵn sàng chốt sự nghiệp!" 
                    : `Cần draft thêm ${11 - startingXI.length} cầu thủ`}
                </p>
              </div>

              {/* Complete / Home Buttons */}
              {session.status === "completed" ? (
                <Link
                  href="/"
                  className="btn-primary"
                  style={{
                    fontSize: "0.9rem",
                    padding: "10px 20px",
                    textDecoration: "none",
                    backgroundColor: "var(--charcoal)",
                    color: "var(--white)",
                  }}
                >
                  VỀ TRANG CHỦ
                </Link>
              ) : startingXI.length === 11 ? (
                <form action={async () => {
                  "use server";
                  await completeGameSession(gameId);
                }}>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{
                      fontSize: "0.9rem",
                      padding: "10px 20px",
                      backgroundColor: "var(--coral)",
                      color: "var(--white)",
                      cursor: "pointer",
                    }}
                  >
                    HOÀN THÀNH SỰ NGHIỆP
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  disabled
                  className="btn-secondary"
                  style={{
                    fontSize: "0.9rem",
                    padding: "10px 20px",
                    opacity: 0.5,
                    cursor: "not-allowed",
                  }}
                  title="Hãy draft đủ 11 cầu thủ xuất phát"
                >
                  ĐANG DRAFT ĐỘI HÌNH
                </button>
              )}
            </div>

            {/* Table title row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <p style={{ fontFamily: "var(--font-stamp)", fontSize: "0.58rem", color: "var(--ink-gray)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "4px" }}>
                  Squad Sheet
                </p>
                <h2 style={{ fontFamily: "var(--font-headline)", fontSize: "1.4rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--charcoal)", margin: 0, lineHeight: 1 }}>
                  Starting XI
                </h2>
              </div>
              <span style={{
                fontFamily: "var(--font-stamp)",
                fontSize: "0.58rem",
                color: "var(--ink-gray)",
                letterSpacing: "0.06em",
                padding: "2px 8px",
                border: "1.5px solid var(--cream-border)",
                borderRadius: "2px",
                backgroundColor: "var(--white)",
              }}>
                {startingXI.length} / 11 Drafted
              </span>
            </div>

            <div style={{
              backgroundColor: "var(--white)",
              border: "2px solid var(--charcoal)",
              borderRadius: "4px",
              boxShadow: "3px 3px 0 var(--charcoal)",
              overflow: "hidden",
            }}>
              {/* Table Header */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "60px 1fr 40px",
                padding: "10px 14px",
                borderBottom: "2px solid var(--charcoal)",
                backgroundColor: "var(--cream-dark)",
              }}>
                {["POS", "PLAYER", "OVR"].map((h) => (
                  <span key={h} style={{ fontFamily: "var(--font-headline)", fontSize: "0.7rem", color: "var(--charcoal)", letterSpacing: "0.08em", fontWeight: 700 }}>
                    {h}
                  </span>
                ))}
              </div>

              {/* Slot Rows */}
              {slots.map((slot, i) => {
                const player = playerMap.get(slot.index);
                return (
                  <div
                    key={slot.index}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "60px 1fr 40px",
                      padding: "12px 14px",
                      borderBottom: i < slots.length - 1 ? "1px solid var(--cream-border)" : "none",
                      backgroundColor: player ? "transparent" : "rgba(0,0,0,0.01)",
                    }}
                  >
                    {/* Position Label */}
                    <span style={{
                      fontFamily: "var(--font-headline)",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      letterSpacing: "0.07em",
                      color: "var(--coral)",
                      textTransform: "uppercase",
                    }}>
                      {slot.position}
                    </span>

                    {/* Player Name */}
                    {player ? (
                      <span style={{ fontFamily: "var(--font-body)", fontSize: "0.9rem", fontWeight: 500, color: "var(--charcoal)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {player.name}
                      </span>
                    ) : (
                      <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.72rem", color: "var(--ink-light)", fontStyle: "italic" }}>
                        — Empty Slot —
                      </span>
                    )}

                    {/* OVR */}
                    <span style={{
                      fontFamily: "var(--font-headline)",
                      fontSize: "0.95rem",
                      fontWeight: 700,
                      color: player ? "var(--charcoal)" : "var(--cream-border)",
                      textAlign: "right",
                    }}>
                      {player ? player.peakOvr : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

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
