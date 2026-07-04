"use client";

import { useRouter } from "next/navigation";
import type { Formation } from "@/types/game";
import { FORMATION_SLOTS, getFlagEmoji, type ClientSafePlayer } from "@/types/squad";

// ============================================================
// PITCH SVG — retro flat 2D pitch markings
// viewBox "0 0 100 150" → 2:3 aspect ratio, matches container
// ============================================================

function PitchSVG() {
  return (
    <svg
      viewBox="0 0 100 150"
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      aria-hidden="true"
    >
      {/* Base grass */}
      <rect width="100" height="150" fill="#2E7D32" />

      {/* Alternating grass stripes — horizontal bands */}
      {[0, 2, 4, 6, 8, 10, 12, 14].map((i) => (
        <rect key={i} x="0" y={i * 10.7} width="100" height="10.7" fill="rgba(0,0,0,0.065)" />
      ))}

      {/* Pitch outer boundary */}
      <rect x="3.5" y="2.5" width="93" height="145" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="0.7" />

      {/* ── TOP HALF (opponent's side) ── */}

      {/* Top penalty area */}
      <rect x="27" y="2.5" width="46" height="17" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.6" />
      {/* Top goal area (6-yard box) */}
      <rect x="37.5" y="2.5" width="25" height="7" fill="none" stroke="rgba(255,255,255,0.38)" strokeWidth="0.55" />
      {/* Top goal */}
      <rect x="42" y="1.2" width="16" height="1.8" fill="rgba(255,255,255,0.55)" />
      {/* Top penalty spot */}
      <circle cx="50" cy="24.5" r="0.9" fill="rgba(255,255,255,0.55)" />
      {/* Top penalty arc */}
      <path d="M 37.5 19.5 A 12.5 12.5 0 0 1 62.5 19.5" fill="none" stroke="rgba(255,255,255,0.38)" strokeWidth="0.55" />

      {/* ── CENTER ── */}

      {/* Halfway line */}
      <line x1="3.5" y1="75" x2="96.5" y2="75" stroke="rgba(255,255,255,0.55)" strokeWidth="0.7" />
      {/* Center circle */}
      <circle cx="50" cy="75" r="13.5" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.65" strokeDasharray="2.2 1.8" />
      {/* Center spot */}
      <circle cx="50" cy="75" r="1.1" fill="rgba(255,255,255,0.65)" />

      {/* ── BOTTOM HALF (our goal) ── */}

      {/* Bottom penalty area */}
      <rect x="27" y="130.5" width="46" height="17" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.6" />
      {/* Bottom goal area */}
      <rect x="37.5" y="140.5" width="25" height="7" fill="none" stroke="rgba(255,255,255,0.38)" strokeWidth="0.55" />
      {/* Bottom goal */}
      <rect x="42" y="147" width="16" height="1.8" fill="rgba(255,255,255,0.55)" />
      {/* Bottom penalty spot */}
      <circle cx="50" cy="125.5" r="0.9" fill="rgba(255,255,255,0.55)" />
      {/* Bottom penalty arc */}
      <path d="M 37.5 130.5 A 12.5 12.5 0 0 0 62.5 130.5" fill="none" stroke="rgba(255,255,255,0.38)" strokeWidth="0.55" />

      {/* Corner arcs */}
      <path d="M 3.5 6.5 A 4 4 0 0 1 7.5 2.5" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.55" />
      <path d="M 92.5 2.5 A 4 4 0 0 1 96.5 6.5" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.55" />
      <path d="M 3.5 143.5 A 4 4 0 0 0 7.5 147.5" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.55" />
      <path d="M 96.5 143.5 A 4 4 0 0 1 92.5 147.5" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.55" />
    </svg>
  );
}

// ============================================================
// EMPTY SLOT CAPSULE
// ============================================================

interface EmptySlotProps {
  position: string;
  onClick: () => void;
}

function EmptySlot({ position, onClick }: EmptySlotProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Thêm cầu thủ vào vị trí ${position}`}
      className="group"
      style={{
        backgroundColor: "rgba(255,255,255,0.16)",
        border: "1.5px solid rgba(255,255,255,0.65)",
        borderRadius: "20px",
        padding: "6px 14px",
        color: "white",
        fontFamily: "var(--font-headline)",
        fontSize: "0.75rem",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        cursor: "pointer",
        backdropFilter: "blur(3px)",
        whiteSpace: "nowrap",
        transition: "background 100ms ease, border-color 100ms ease, transform 80ms ease",
        lineHeight: 1.2,
        userSelect: "none",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.backgroundColor = "rgba(255,255,255,0.30)";
        el.style.borderColor = "rgba(255,255,255,0.95)";
        el.style.transform = "scale(1.06)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.backgroundColor = "rgba(255,255,255,0.16)";
        el.style.borderColor = "rgba(255,255,255,0.65)";
        el.style.transform = "scale(1)";
      }}
    >
      {position}
    </button>
  );
}

// ============================================================
// FILLED SLOT — mini Panini sticker
// ============================================================

interface FilledSlotProps {
  player: ClientSafePlayer;
  onClick: () => void;
  disabled?: boolean;
}

function FilledSlot({ player, onClick, disabled }: FilledSlotProps) {
  const lastName = player.name.split(" ").slice(-1)[0] ?? player.name;

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      aria-label={`${player.name} — ${player.position}`}
      style={{
        width: "66px",
        backgroundColor: "var(--white)",
        border: "2px solid var(--charcoal)",
        borderRadius: "3px",
        boxShadow: "2.5px 2.5px 0 rgba(0,0,0,0.55)",
        padding: "5px 6px 4px",
        cursor: disabled ? "default" : "pointer",
        textAlign: "left",
        transition: disabled ? "none" : "transform 80ms ease, box-shadow 80ms ease",
      }}
      onMouseEnter={disabled ? undefined : (e) => {
        e.currentTarget.style.transform = "translate(-1px,-2px)";
        e.currentTarget.style.boxShadow = "3.5px 4.5px 0 rgba(0,0,0,0.55)";
      }}
      onMouseLeave={disabled ? undefined : (e) => {
        e.currentTarget.style.transform = "translate(0,0)";
        e.currentTarget.style.boxShadow = "2.5px 2.5px 0 rgba(0,0,0,0.55)";
      }}
    >
      {/* OVR */}
      <div style={{ fontFamily: "var(--font-headline)", fontSize: "1.25rem", fontWeight: 700, color: "var(--charcoal)", lineHeight: 1 }}>
        {player.peakOvr}
      </div>
      {/* Flag */}
      <div style={{ fontSize: "0.85rem", lineHeight: 1, marginTop: "2px" }}>
        {getFlagEmoji(player.nationality)}
      </div>
      {/* Name */}
      <div style={{
        fontFamily: "var(--font-headline)",
        fontSize: "0.6rem",
        letterSpacing: "0.03em",
        textTransform: "uppercase",
        color: "var(--charcoal)",
        lineHeight: 1.2,
        marginTop: "3px",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        maxWidth: "54px",
      }}>
        {lastName}
      </div>
    </button>
  );
}

// ============================================================
// MAIN COMPONENT — Client Component (router.push for navigation)
// ============================================================

interface Props {
  gameId: string;
  formation: Formation;
  players: ClientSafePlayer[]; // starting XI only (slotIndex 0–10)
  status?: string;
}

export function PitchBoard({ gameId, formation, players, status }: Props) {
  const router = useRouter();

  const slots = FORMATION_SLOTS[formation] ?? FORMATION_SLOTS["4-3-3"];
  const playerMap = new Map(players.map((p) => [p.slotIndex, p]));

  function handleSlotClick(slotIndex: number) {
    if (status === "completed") {
      console.log("Game session completed. Slot interaction disabled.");
      return;
    }
    const player = playerMap.get(slotIndex);
    if (player) {
      console.log("Slot already filled. Slot interaction disabled.");
      return;
    }
    router.push(`/${gameId}/draft/${slotIndex}`);
  }

  return (
    <div
      role="region"
      aria-label="Tactical Pitch Board"
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "2 / 3",
        maxWidth: "400px",
        margin: "0 auto",
        borderRadius: "4px",
        overflow: "hidden",
        border: "2px solid var(--charcoal)",
        boxShadow: "3px 3px 0 var(--charcoal)",
      }}
    >
      {/* SVG pitch markings */}
      <PitchSVG />

      {/* Player slot layer */}
      {slots.map((slot) => {
        const player = playerMap.get(slot.index);

        return (
          <div
            key={slot.index}
            style={{
              position: "absolute",
              left: `${slot.x}%`,
              top: `${slot.y}%`,
              transform: "translate(-50%, -50%)",
              zIndex: 2,
            }}
          >
            {player ? (
              <FilledSlot
                player={player}
                onClick={() => handleSlotClick(slot.index)}
                disabled={true}
              />
            ) : (
              <EmptySlot
                position={slot.position}
                onClick={status === "completed" ? () => {} : () => handleSlotClick(slot.index)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
