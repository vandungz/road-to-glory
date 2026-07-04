"use client";

import { motion, useAnimation } from "framer-motion";
import { useEffect } from "react";

// ============================================================
// PROPS
// ============================================================

interface SpinnerItem {
  label: string;
  value: any;
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
// COMPONENT
// ============================================================

export function SpinnerWheel({ isSpinning, items, targetIndex, onSpinComplete }: Props) {
  const controls = useAnimation();
  const N = items.length;
  const sliceAngle = 360 / N;

  useEffect(() => {
    if (isSpinning && targetIndex >= 0) {
      // 1. Tính toán góc quay
      // Múi targetIndex có góc trung tâm là: targetIndex * sliceAngle + sliceAngle / 2
      // Để xoay múi này về vị trí kim chỉ bên phải (0 độ):
      // Góc xoay cần thiết = (450 - targetMiddleAngle) % 360
      const targetMiddleAngle = targetIndex * sliceAngle + sliceAngle / 2;
      const rotationToTarget = (450 - targetMiddleAngle) % 360;
      
      // Quay 6 vòng (2160 độ) để tạo quán tính mượt mà
      const finalRotation = 2160 + rotationToTarget;

      // 2. Chạy animation
      controls.start({
        rotate: [0, finalRotation],
        transition: {
          duration: 3.5,
          ease: [0.12, 0, 0.39, 1], // ease-out chậm dần mượt mà
        },
      }).then(() => {
        onSpinComplete();
      });
    }
  }, [isSpinning, targetIndex, controls, N, sliceAngle, onSpinComplete]);

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: "340px", aspectRatio: "1 / 1", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
      
      {/* ── SPINNER WHEEL CONTAINER (ROTATE DIV) ── */}
      <motion.div
        animate={controls}
        style={{
          width: "280px",
          height: "280px",
          borderRadius: "50%",
          overflow: "hidden",
          border: "4px solid var(--charcoal)",
          boxShadow: "4px 4px 0 var(--charcoal)",
          backgroundColor: "var(--white)",
        }}
      >
        <svg
          viewBox="0 0 200 200"
          style={{ width: "100%", height: "100%" }}
        >
          <g>
            {items.map((item, idx) => {
              const startAngle = idx * sliceAngle;
              const endAngle = (idx + 1) * sliceAngle;
              
              // Chuyển sang radian để tính tọa độ
              const startRad = ((startAngle - 90) * Math.PI) / 180;
              const endRad = ((endAngle - 90) * Math.PI) / 180;

              const R = 96; // Bán kính vòng quay gần sát biên
              const x1 = 100 + R * Math.cos(startRad);
              const y1 = 100 + R * Math.sin(startRad);
              const x2 = 100 + R * Math.cos(endRad);
              const y2 = 100 + R * Math.sin(endRad);

              // SVG Path cho múi hình quạt
              const d = `M 100 100 L ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2} Z`;
              const color = SLICE_COLORS[idx % SLICE_COLORS.length];

              // Góc text xoay dọc theo tâm
              const textAngle = startAngle + sliceAngle / 2;

              return (
                <g key={idx}>
                  {/* Múi */}
                  <path
                    d={d}
                    fill={color}
                    stroke="var(--charcoal)"
                    strokeWidth="1.2"
                  />
                  
                  {/* Chữ Label chạy dọc theo múi */}
                  <g transform={`rotate(${textAngle}, 100, 100)`}>
                    <text
                      x="100"
                      y="40"
                      textAnchor="middle"
                      fill="var(--white)"
                      style={{
                        fontFamily: "var(--font-headline)",
                        fontSize: N > 12 ? "0.48rem" : N > 8 ? "0.58rem" : "0.72rem",
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        paintOrder: "stroke fill",
                        stroke: "var(--charcoal)",
                        strokeWidth: "2px",
                        strokeLinejoin: "round",
                      }}
                      // Xoay text đứng lên dọc theo bán kính
                      transform="rotate(90, 100, 40)"
                    >
                      {item.label}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>

          {/* Vòng tròn nhỏ đè lên tâm */}
          <circle
            cx="100"
            cy="100"
            r="20"
            fill="var(--white)"
            stroke="var(--charcoal)"
            strokeWidth="3.5"
          />
          <circle
            cx="100"
            cy="100"
            r="6"
            fill="var(--charcoal)"
          />
        </svg>
      </motion.div>

      {/* ── KIM CHỈ KẾT QUẢ BÊN PHẢI (POINTER) ── */}
      <div
        style={{
          position: "absolute",
          right: "12px", // Chỉ ngay vào viền bên phải của bánh xe
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 10,
          pointerEvents: "none",
          filter: "drop-shadow(2px 2px 0 var(--charcoal))",
        }}
      >
        <svg
          width="28"
          height="24"
          viewBox="0 0 28 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Mũi tên xanh lam chỉ sang bên trái */}
          <polygon
            points="0,12 24,0 24,24"
            fill="#3B82F6"
            stroke="var(--charcoal)"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Đốm sáng phản chiếu 3D retro */}
          <polygon
            points="4,12 21,3 21,21"
            fill="rgba(255,255,255,0.15)"
          />
        </svg>
      </div>

    </div>
  );
}
