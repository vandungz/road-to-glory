"use client";

import { motion, type MotionValue } from "framer-motion";

export interface SpinnerWheelDiscProps {
  items: { label: string; value: unknown; weight?: number; active?: boolean }[];
  arcSizes: number[];
  startAngles: number[];
  rotateValue: MotionValue<number>;
}

const SLICE_COLORS = [
  "#E8502F", "#3D6EA8", "#2F7A5C", "#A97A18",
  "#635399", "#9C3F6E", "#25736D", "#454E96",
];

export function SpinnerWheelDisc({ items, arcSizes, startAngles, rotateValue }: SpinnerWheelDiscProps) {
  return (
    <div className="football-spinner-wheel__stage">

      {/* ── SPINNER WHEEL (ROTATE DIV) ── */}
      <motion.div
        className="football-spinner-wheel__disc"
        style={{ rotate: rotateValue }}
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
                const showText  = items.length <= 10 || arcSize >= 10;
              const fontSize  = arcSize >= 50 ? "0.72rem" : arcSize >= 30 ? "0.58rem" : arcSize >= 16 ? "0.45rem" : "0.32rem";
              const isFullCircle = arcSize >= 359.999;

              return (
                <g key={idx} className={item.active === false ? "is-inactive" : "is-active"}>
                  {arcSize > 0 && (isFullCircle ? (
                    <circle
                      cx="100"
                      cy="100"
                      r={R}
                      fill={color}
                      stroke="rgba(244,241,234,0.8)"
                      strokeWidth="0.6"
                    />
                  ) : (
                    <path
                      d={d}
                      fill={color}
                      stroke="rgba(244,241,234,0.8)"
                      strokeWidth="0.6"
                    />
                  ))}
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
        className="football-spinner-wheel__pointer"
      >
        <svg width="28" height="24" viewBox="0 0 28 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="0,12 24,0 24,24" fill="var(--football-ink)" stroke="var(--football-ink)" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      </div>

    </div>
  );
}
