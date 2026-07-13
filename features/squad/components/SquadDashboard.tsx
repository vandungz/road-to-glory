"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PitchBoard } from "./PitchBoard";
import { PlayerCareerDialog } from "@/features/player/components/PlayerCareerDialog";
import type { ClientSafePlayer, SlotConfig } from "@/types/squad";
import type { Formation } from "@/types/game";
import { completeGameSession } from "@/actions/season.actions";

interface SquadDashboardProps {
  gameId: string;
  formation: Formation;
  status: string;
  squadRating: number | null;
  players: ClientSafePlayer[];
  slots: SlotConfig[];
  inProgressSlots?: number[];
}

export function SquadDashboard({
  gameId,
  formation,
  status,
  squadRating,
  players,
  slots,
  inProgressSlots = [],
}: SquadDashboardProps) {
  const router = useRouter();
  const [selectedPlayer, setSelectedPlayer] = useState<ClientSafePlayer | null>(null);

  const startingXI = players.filter((p) => p.slotIndex >= 0 && p.slotIndex <= 10);
  const playerMap = new Map(startingXI.map((p) => [p.slotIndex, p]));

  // Tính Squad OVR trung bình từ starting XI thực tế
  const currentSquadOvr = startingXI.length > 0
    ? Math.round(startingXI.reduce((sum, p) => sum + p.peakOvr, 0) / startingXI.length)
    : 0;

  const displaySquadOvr = status === "completed" ? (squadRating ?? 0) : currentSquadOvr;

  function handleRowClick(slotIndex: number, player?: ClientSafePlayer) {
    if (player) {
      setSelectedPlayer(player);
    } else {
      if (status === "completed") return;
      router.push(`/${gameId}/draft/${slotIndex}`);
    }
  }

  return (
    <>
      {/* Layout hai cột */}
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
            status={status}
            inProgressSlots={inProgressSlots}
            onPlayerClick={(player) => setSelectedPlayer(player)}
          />
        </div>

        {/* Cột 2: Starting XI Table & Play Match Panel */}
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
                  {displaySquadOvr || "—"}
                </span>
                <span style={{ fontFamily: "var(--font-headline)", fontSize: "0.85rem", fontWeight: 700, color: "var(--ink-gray)" }}>
                  SQUAD OVR
                </span>
              </div>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", color: "var(--ink-light)", marginTop: "4px", fontStyle: "italic" }}>
                {status === "completed"
                  ? "Đội hình hoàn thành xuất sắc sự nghiệp!"
                  : startingXI.length === 11
                  ? "Đội hình đã sẵn sàng chốt sự nghiệp!"
                  : `Cần draft thêm ${11 - startingXI.length} cầu thủ`}
              </p>
            </div>

            {/* Complete / Home Buttons */}
            {status === "completed" ? (
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
              const isInProgress = !player && inProgressSlots.includes(slot.index);
              return (
                <div
                  key={slot.index}
                  onClick={() => handleRowClick(slot.index, player)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "60px 1fr 40px",
                    padding: "12px 14px",
                    borderBottom: i < slots.length - 1 ? "1px solid var(--cream-border)" : "none",
                    backgroundColor: isInProgress ? "rgba(251,191,36,0.07)" : player ? "transparent" : "rgba(0,0,0,0.01)",
                    cursor: player ? "pointer" : status === "completed" ? "default" : "pointer",
                    transition: "background-color 80ms ease",
                  }}
                  onMouseEnter={(!player && status === "completed") ? undefined : (e) => {
                    e.currentTarget.style.backgroundColor = isInProgress ? "rgba(251,191,36,0.14)" : "rgba(0, 0, 0, 0.03)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isInProgress ? "rgba(251,191,36,0.07)" : player ? "transparent" : "rgba(0,0,0,0.01)";
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
                    <span style={{ fontFamily: "var(--font-body)", fontSize: "0.9rem", fontWeight: 600, color: "var(--charcoal)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {player.name}
                    </span>
                  ) : isInProgress ? (
                    <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.72rem", color: "#d97706", fontStyle: "italic" }}>
                      ▶ Đang chơi...
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

      {/* Profile Dialog */}
      <PlayerCareerDialog
        player={selectedPlayer}
        isOpen={selectedPlayer !== null}
        onClose={() => setSelectedPlayer(null)}
      />
    </>
  );
}
