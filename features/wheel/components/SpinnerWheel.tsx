"use client";

import { motion, useMotionValue, animate } from "framer-motion";
import { useEffect, useRef, useState, useMemo } from "react";

// ============================================================
// PROPS
// ============================================================

export interface SpinnerItem {
  label: string;
  value: any;
  weight?: number;
}

interface Props {
  isSpinning: boolean;
  items: SpinnerItem[];
  targetIndex: number;
  onSpinComplete: () => void;
}

// ============================================================
// RETRO COLOR PALETTE
// ============================================================

const SLICE_COLORS = [
  "#FF5A43", // Coral Red
  "#3B82F6", // Blue
  "#10B981", // Green
  "#F59E0B", // Yellow
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#14B8A6", // Teal
  "#6366F1", // Indigo
];

// ============================================================
// HELPERS
// ============================================================

function computeArcs(items: SpinnerItem[]) {
  const total = items.reduce((s, it) => s + (it.weight ?? 1), 0);
  const arcSizes = items.map((it) => ((it.weight ?? 1) / total) * 360);
  const startAngles: number[] = [];
  let cum = 0;
  for (const arc of arcSizes) {
    startAngles.push(cum);
    cum += arc;
  }
  return { arcSizes, startAngles };
}

function getLabelAtAngle(
  pointerAngle: number,
  items: SpinnerItem[],
  startAngles: number[],
  arcSizes: number[],
): string {
  for (let i = 0; i < items.length; i++) {
    const end = startAngles[i] + arcSizes[i];
    if (pointerAngle >= startAngles[i] && pointerAngle < end) {
      return items[i].label;
    }
  }
  // Wrap-around or rounding edge: return last item
  return items.length > 0 ? items[items.length - 1].label : "";
}

// ============================================================
// COMPONENT
// ============================================================

export function SpinnerWheel({ isSpinning, items, targetIndex, onSpinComplete }: Props) {
  const rotateValue = useMotionValue(0);
  const [activeLabel, setActiveLabel] = useState<string>(() => items[0]?.label ?? "");

  const { arcSizes, startAngles } = useMemo(() => computeArcs(items), [items]);

  const onSpinCompleteRef = useRef(onSpinComplete);
  useEffect(() => { onSpinCompleteRef.current = onSpinComplete; });

  // Sync active label on items change (substep changed)
  useEffect(() => {
    if (items.length === 0) return;
    const r = rotateValue.get();
    const pointerAngle = ((90 - (r % 360)) % 360 + 360) % 360;
    setActiveLabel(getLabelAtAngle(pointerAngle, items, startAngles, arcSizes));
  }, [items, startAngles, arcSizes]);

  // Subscribe to rotation → update live label
  useEffect(() => {
    const unsubscribe = rotateValue.on("change", (r) => {
      const pointerAngle = ((90 - (r % 360)) % 360 + 360) % 360;
      setActiveLabel(getLabelAtAngle(pointerAngle, items, startAngles, arcSizes));
    });
    return () => unsubscribe();
  }, [rotateValue, items, startAngles, arcSizes]);

  // Trigger animation
  useEffect(() => {
    if (!isSpinning || targetIndex < 0 || targetIndex >= items.length) return;

    const targetMidAngle = startAngles[targetIndex] + arcSizes[targetIndex] / 2;
    const rotationToTarget = ((90 - targetMidAngle) % 360 + 360) % 360;
    const finalRotation = 2160 + rotationToTarget;

    rotateValue.set(0);

    const anim = animate(rotateValue, finalRotation, {
      duration: 3.5,
      ease: [0.12, 0, 0.39, 1],
      onComplete: () => onSpinCompleteRef.current(),
    });

    return () => anim.stop();
  }, [isSpinning, targetIndex]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", width: "100%" }}>

      {/* ── LIVE LABEL ── */}
      <div
        aria-live="polite"
        aria-atomic="true"
        style={{
          minHeight: "38px",
          width: "100%",
          maxWidth: "340px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--white)",
          border: "2px solid var(--charcoal)",
          borderRadius: "3px",
          boxShadow: "2px 2px 0 var(--charcoal)",
          padding: "6px 16px",
          overflow: "hidden",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-headline)",
            fontSize: "0.85rem",
            fontWeight: 700,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: "var(--charcoal)",
            textAlign: "center",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "100%",
          }}
        >
          {activeLabel || "—"}
        </span>
      </div>

      {/* ── WHEEL + POINTER WRAPPER ── */}
      <div style={{ position: "relative", width: "100%", maxWidth: "340px", aspectRatio: "1 / 1", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center" }}>

        {/* ── SPINNER WHEEL (ROTATE DIV) ── */}
        <motion.div
          style={{
            rotate: rotateValue,
            width: "280px",
            height: "280px",
            borderRadius: "50%",
            overflow: "hidden",
            border: "4px solid var(--charcoal)",
            boxShadow: "4px 4px 0 var(--charcoal)",
            backgroundColor: "var(--white)",
          }}
        >
          <svg viewBox="0 0 200 200" style={{ width: "100%", height: "100%" }}>
            <g>
              {items.map((item, idx) => {
                const startAngle = startAngles[idx];
                const arcSize = arcSizes[idx];
                const endAngle = startAngle + arcSize;

                const startRad = ((startAngle - 90) * Math.PI) / 180;
                const endRad   = ((endAngle   - 90) * Math.PI) / 180;

                const R = 96;
                const x1 = 100 + R * Math.cos(startRad);
                const y1 = 100 + R * Math.sin(startRad);
                const x2 = 100 + R * Math.cos(endRad);
                const y2 = 100 + R * Math.sin(endRad);

                const largeArc = arcSize > 180 ? 1 : 0;
                const d = `M 100 100 L ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} Z`;
                const color = SLICE_COLORS[idx % SLICE_COLORS.length];

                // Text: center of arc, radial orientation
                const textAngle = startAngle + arcSize / 2;
                const showText  = arcSize >= 18;
                const fontSize  = arcSize >= 50 ? "0.72rem" : arcSize >= 30 ? "0.58rem" : "0.45rem";

                return (
                  <g key={idx}>
                    <path
                      d={d}
                      fill={color}
                      stroke="var(--charcoal)"
                      strokeWidth="1.2"
                    />
                    {showText && (
                      <g transform={`rotate(${textAngle}, 100, 100)`}>
                        <text
                          x="100"
                          y="40"
                          textAnchor="middle"
                          fill="var(--white)"
                          style={{
                            fontFamily: "var(--font-headline)",
                            fontSize,
                            fontWeight: 700,
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                            paintOrder: "stroke fill",
                            stroke: "var(--charcoal)",
                            strokeWidth: "2px",
                            strokeLinejoin: "round",
                          }}
                          transform="rotate(90, 100, 40)"
                        >
                          {item.label}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>

            {/* Center pin */}
            <circle cx="100" cy="100" r="20" fill="var(--white)" stroke="var(--charcoal)" strokeWidth="3.5" />
            <circle cx="100" cy="100" r="6"  fill="var(--charcoal)" />
          </svg>
        </motion.div>

        {/* ── POINTER (right side, 3 o'clock) ── */}
        <div
          style={{
            position: "absolute",
            right: "12px",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 10,
            pointerEvents: "none",
            filter: "drop-shadow(2px 2px 0 var(--charcoal))",
          }}
        >
          <svg width="28" height="24" viewBox="0 0 28 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polygon points="0,12 24,0 24,24" fill="#3B82F6" stroke="var(--charcoal)" strokeWidth="2.5" strokeLinejoin="round" />
            <polygon points="4,12 21,3 21,21" fill="rgba(255,255,255,0.15)" />
          </svg>
        </div>

      </div>
    </div>
  );
}
