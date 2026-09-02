"use client";

import { useMemo } from "react";
import type { StatSnapshot } from "@/types/domain";

interface PlayerOvrChartProps {
  statsTimeline: StatSnapshot[];
  debutAge: number;
  retireAge: number;
}

const WIDTH = 620;
const HEIGHT = 180;
const LEFT = 42;
const RIGHT = 0;
const TOP = 12;
const BOTTOM = 21;
const GRID_VALUES = [90, 82, 74, 66];

export function PlayerOvrChart({ statsTimeline, debutAge, retireAge }: PlayerOvrChartProps) {
  const chart = useMemo(() => {
    const timeline = statsTimeline
      .filter((snapshot) => snapshot.age >= debutAge && snapshot.age <= retireAge)
      .sort((a, b) => a.age - b.age);
    if (timeline.length === 0) return null;

    const xRange = Math.max(1, retireAge - debutAge);
    const plotWidth = WIDTH - LEFT - RIGHT;
    const plotHeight = HEIGHT - TOP - BOTTOM;
    const x = (age: number) => LEFT + ((age - debutAge) / xRange) * plotWidth;
    const y = (ovr: number) => TOP + ((90 - Math.max(66, Math.min(90, ovr))) / 24) * plotHeight;
    const points = timeline.map((snapshot) => ({ age: snapshot.age, ovr: snapshot.ovr, x: x(snapshot.age), y: y(snapshot.ovr) }));
    const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
    const labelAges = [...new Set([debutAge, Math.round(debutAge + xRange * 0.28), Math.round(debutAge + xRange * 0.56), Math.round(debutAge + xRange * 0.82), retireAge])];

    return { points, path, x, labelAges };
  }, [statsTimeline, debutAge, retireAge]);

  if (!chart) return <div className="rtg-career-dialog__chart-empty">Chưa có dữ liệu OVR.</div>;

  return (
    <svg className="rtg-career-dialog__chart-svg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Biểu đồ phát triển OVR theo tuổi">
      {GRID_VALUES.map((value, index) => {
        const y = TOP + (index / (GRID_VALUES.length - 1)) * (HEIGHT - TOP - BOTTOM);
        return <g key={value}><line x1={LEFT} y1={y} x2={WIDTH - RIGHT} y2={y} className={index === GRID_VALUES.length - 1 ? "is-axis" : "is-grid"} /><text x={LEFT - 8} y={y + 3} textAnchor="end">{value}</text></g>;
      })}
      <path d={chart.path} className="rtg-career-dialog__chart-line" />
      {chart.points.map((point) => <circle key={point.age} cx={point.x} cy={point.y} r={point.ovr === Math.max(...chart.points.map((item) => item.ovr)) ? 4.5 : 3} className={point.ovr === Math.max(...chart.points.map((item) => item.ovr)) ? "is-peak" : "is-point"}><title>{`Tuổi ${point.age}: OVR ${point.ovr}`}</title></circle>)}
      {chart.points.length > 0 && <text x={chart.points.reduce((peak, point) => point.ovr > peak.ovr ? point : peak).x} y={chart.points.reduce((peak, point) => point.ovr > peak.ovr ? point : peak).y - 9} className="rtg-career-dialog__chart-peak" textAnchor="middle">{chart.points.reduce((peak, point) => point.ovr > peak.ovr ? point : peak).ovr}</text>}
      {chart.labelAges.map((age) => <text key={age} x={chart.x(age)} y={HEIGHT - 5} textAnchor="middle" className="rtg-career-dialog__chart-age">{age}</text>)}
    </svg>
  );
}
