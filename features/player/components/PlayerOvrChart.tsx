"use client";

import React, { useMemo } from "react";

interface PlayerOvrChartProps {
  statsTimeline: any[];
  debutAge: number;
  retireAge: number;
  peakOvr: number;
}

export function PlayerOvrChart({
  statsTimeline,
  debutAge,
  retireAge,
  peakOvr,
}: PlayerOvrChartProps) {
  const chartSvg = useMemo(() => {
    // handleNextSeason luôn push 1 entry cho nextAge trước khi biết có retire
    // hay không, nên mùa cuối cùng để lại 1 entry "ma" ở retireAge + 1 (chưa
    // từng chơi). Phải lọc bỏ để điểm/nhãn không bị vẽ tràn ra ngoài khung.
    const timeline = statsTimeline.filter((s: any) => s.age >= debutAge && s.age <= retireAge);
    if (timeline.length === 0) return null;

    const width = 500;
    const height = 220;
    const paddingLeft = 45;
    const paddingRight = 20;
    const paddingTop = 25;
    const paddingBottom = 30;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // Tìm dải OVR thực tế để co giãn trục Y tốt hơn
    const ovrs = timeline.map((s: any) => s.ovr);
    const maxOvr = Math.max(...ovrs);
    const minOvr = Math.min(...ovrs);

    // Trục Y chạy từ minOvr - 3 đến maxOvr + 3 để biểu đồ đẹp mắt
    const yMin = Math.max(10, minOvr - 3);
    const yMax = Math.min(99, maxOvr + 3);
    const yRange = yMax - yMin;

    const ageRange = retireAge - debutAge || 1;

    // Hàm lấy tọa độ X, Y
    const getX = (age: number) => paddingLeft + ((age - debutAge) / ageRange) * chartWidth;
    const getY = (ovr: number) => paddingTop + chartHeight - ((ovr - yMin) / yRange) * chartHeight;

    // Tạo các đường kẻ ô ly cổ điển (grid lines)
    const horizontalGridLines = [];
    const stepY = yRange > 15 ? 10 : 5;
    const startYValue = Math.ceil(yMin / stepY) * stepY;
    for (let val = startYValue; val <= yMax; val += stepY) {
      const y = getY(val);
      horizontalGridLines.push(
        <g key={`grid-y-${val}`}>
          <line
            x1={paddingLeft}
            y1={y}
            x2={width - paddingRight}
            y2={y}
            stroke="#D8D3C4"
            strokeWidth="0.8"
            strokeDasharray="2,2"
          />
          <text
            x={paddingLeft - 8}
            y={y + 3}
            textAnchor="end"
            fontSize="9"
            fontFamily="var(--font-headline)"
            fill="#71717a"
          >
            {val}
          </text>
        </g>
      );
    }

    const verticalGridLines = [];
    const stepX = ageRange > 12 ? 2 : 1;
    for (let age = debutAge; age <= retireAge; age += stepX) {
      const x = getX(age);
      verticalGridLines.push(
        <g key={`grid-x-${age}`}>
          <line
            x1={x}
            y1={paddingTop}
            x2={x}
            y2={height - paddingBottom}
            stroke="#D8D3C4"
            strokeWidth="0.8"
            strokeDasharray="2,2"
          />
          <text
            x={x}
            y={height - paddingBottom + 14}
            textAnchor="middle"
            fontSize="9"
            fontFamily="var(--font-headline)"
            fill="#71717a"
          >
            T{age}
          </text>
        </g>
      );
    }

    // Vẽ đường Line OVR
    const points = timeline
      .map((s: any) => ({ x: getX(s.age), y: getY(s.ovr), age: s.age, ovr: s.ovr }))
      .sort((a: any, b: any) => a.age - b.age);

    let pathD = "";
    if (points.length > 0) {
      pathD = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map((p: any) => `L ${p.x} ${p.y}`).join(" ");
    }

    return (
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" style={{ overflow: "visible" }}>
        {/* Background Vintage Lined Notebook Style */}
        <rect
          x={paddingLeft}
          y={paddingTop}
          width={chartWidth}
          height={chartHeight}
          fill="#FAF8F5"
          stroke="var(--charcoal)"
          strokeWidth="1.5"
        />

        {/* Lưới ô ly */}
        {horizontalGridLines}
        {verticalGridLines}

        {/* Vẽ Path Line OVR */}
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke="var(--coral)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Vẽ các điểm mốc chấm tròn OVR */}
        {points.map((p: any, idx: number) => (
          <g key={`point-${idx}`} className="group/dot">
            <circle
              cx={p.x}
              cy={p.y}
              r="4.5"
              fill="var(--white)"
              stroke="var(--charcoal)"
              strokeWidth="2"
            />
            <circle
              cx={p.x}
              cy={p.y}
              r="2"
              fill="var(--coral)"
            />
            {/* Tooltip nhỏ khi hover */}
            <title>{`Tuổi ${p.age}: OVR ${p.ovr}`}</title>
          </g>
        ))}
      </svg>
    );
  }, [statsTimeline, debutAge, retireAge]);

  return (
    <div style={{ width: "100%", height: "180px", position: "relative" }}>
      {chartSvg}
    </div>
  );
}
