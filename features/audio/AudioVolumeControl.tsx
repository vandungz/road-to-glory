"use client";

import { useId, type CSSProperties } from "react";

export function AudioVolumeControl({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  const id = useId();
  const percent = Math.round(value * 100);
  return <div className="football-audio-volume">
    <label htmlFor={id}>{label}</label>
    <input id={id} type="range" min="0" max="100" step="1" value={percent} aria-valuetext={`${percent}%`} style={{ "--audio-volume": `${percent}%` } as CSSProperties}
      onChange={(event) => onChange(Number(event.target.value) / 100)} />
    <output htmlFor={id}>{percent}%</output>
  </div>;
}
