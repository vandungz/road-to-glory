"use client";

import { motion, useMotionValue, animate } from "framer-motion";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";

// ============================================================
// PROPS
// ============================================================

export interface SpinnerItem {
  label: string;
  value: unknown;
  weight?: number;
}

interface Props {
  isSpinning: boolean;
  items: SpinnerItem[];
  targetIndex: number;
  onSpinComplete: () => void;
  stakes?: "low" | "mid" | "high";
}

// ============================================================
// RETRO COLOR PALETTE
// ============================================================

const SLICE_COLORS = [
  "#E8502F", "#3D6EA8", "#2F7A5C", "#A97A18",
  "#635399", "#9C3F6E", "#25736D", "#454E96",
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

export function SpinnerWheel({ isSpinning, items, targetIndex, onSpinComplete, stakes = "low" }: Props) {
  const rotateValue = useMotionValue(0);
  const itemSignature = useMemo(
    () => items.map((item) => `${item.label}\u0000${item.weight ?? 1}`).join("\u0001"),
    [items],
  );
  const stableItemsRef = useRef(items);
  const stableSignatureRef = useRef(itemSignature);
  if (stableSignatureRef.current !== itemSignature) {
    stableSignatureRef.current = itemSignature;
    stableItemsRef.current = items;
  }
  const stableItems = stableItemsRef.current;
  const [activeLabel, setActiveLabel] = useState<string>(() => stableItems[0]?.label ?? "");
  const activeLabelRef = useRef(activeLabel);

  const { arcSizes, startAngles } = useMemo(() => computeArcs(stableItems), [stableItems]);
  const setLiveLabel = useCallback((nextLabel: string) => {
    if (activeLabelRef.current === nextLabel) return;
    activeLabelRef.current = nextLabel;
    setActiveLabel(nextLabel);
  }, []);

  const onSpinCompleteRef = useRef(onSpinComplete);
  useEffect(() => { onSpinCompleteRef.current = onSpinComplete; });

  // Sync active label on items change (substep changed)
  useEffect(() => {
    if (stableItems.length === 0) return;
    const r = rotateValue.get();
    const pointerAngle = ((90 - (r % 360)) % 360 + 360) % 360;
    setLiveLabel(getLabelAtAngle(pointerAngle, stableItems, startAngles, arcSizes));
  }, [stableItems, startAngles, arcSizes, rotateValue, setLiveLabel]);

  // Subscribe to rotation → update live label
  useEffect(() => {
    const unsubscribe = rotateValue.on("change", (r) => {
      const pointerAngle = ((90 - (r % 360)) % 360 + 360) % 360;
      setLiveLabel(getLabelAtAngle(pointerAngle, stableItems, startAngles, arcSizes));
    });
    return () => unsubscribe();
  }, [rotateValue, stableItems, startAngles, arcSizes, setLiveLabel]);

  // Trigger animation
  useEffect(() => {
    if (!isSpinning || targetIndex < 0 || targetIndex >= stableItems.length) return;

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
  }, [isSpinning, targetIndex, startAngles, arcSizes, stableItems.length, rotateValue]);

  return (
    <div className={`rtg-spinner-wheel rtg-spinner-wheel--${stakes}`}>

      {/* ── LIVE LABEL ── */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="rtg-spinner-wheel__label"
      >
        <span
          className="rtg-spinner-wheel__label-text"
        >
          {activeLabel || "—"}
        </span>
      </div>

      {/* ── WHEEL + POINTER WRAPPER ── */}
      <div className="rtg-spinner-wheel__stage">

        {/* ── SPINNER WHEEL (ROTATE DIV) ── */}
        <motion.div
          className="rtg-spinner-wheel__disc"
          style={{ rotate: rotateValue }}
        >
          <svg viewBox="0 0 200 200" style={{ width: "100%", height: "100%" }}>
            <g>
              {stableItems.map((item, idx) => {
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
                const showText  = stableItems.length <= 10 || arcSize >= 10;
                const fontSize  = arcSize >= 50 ? "0.72rem" : arcSize >= 30 ? "0.58rem" : arcSize >= 16 ? "0.45rem" : "0.32rem";

                return (
                  <g key={idx}>
                    <path
                      d={d}
                      fill={color}
                      stroke="rgba(244,241,234,0.8)"
                      strokeWidth="0.6"
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
            <circle cx="100" cy="100" r="18" fill="#F4F1EA" stroke="#21201D" strokeWidth="1.2" />
            <circle cx="100" cy="100" r="5" fill="#21201D" />
          </svg>
        </motion.div>

        {/* ── POINTER (right side, 3 o'clock) ── */}
        <div
          className="rtg-spinner-wheel__pointer"
        >
          <svg width="28" height="24" viewBox="0 0 28 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polygon points="0,12 24,0 24,24" fill="var(--rtg-ink)" stroke="var(--rtg-ink)" strokeWidth="1.2" strokeLinejoin="round" />
          </svg>
        </div>

      </div>
    </div>
  );
}
