"use client";

import type { Formation } from "@/types/game";
import { FORMATION_SLOTS } from "@/types/squad";
import type { AwardRankingEntry, AwardRankingSnapshotInput } from "@/types/awards";

interface Props {
  snapshot: AwardRankingSnapshotInput;
}

function isFormation(value: string | undefined): value is Formation {
  return value === "4-3-3" || value === "4-4-2" || value === "3-5-2";
}

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0][0]}. ${parts.at(-1)}` : name;
}

function entryBySlot(snapshot: AwardRankingSnapshotInput): Map<string, AwardRankingEntry> {
  return new Map(
    snapshot.entries
      .filter((entry): entry is AwardRankingEntry & { slotKey: string } => typeof entry.slotKey === "string")
      .map((entry) => [entry.slotKey, entry]),
  );
}

export function AwardBestXiPitch({ snapshot }: Props) {
  const formation = isFormation(snapshot.formation) ? snapshot.formation : "4-3-3";
  const entries = entryBySlot(snapshot);
  const slots = FORMATION_SLOTS[formation];

  return (
    <div className="football-award-xi-pitch" role="img" aria-label={`Đội hình tiêu biểu ${formation}`}>
      <span className="football-award-xi-pitch__outline" aria-hidden="true" />
      <span className="football-award-xi-pitch__halfway" aria-hidden="true" />
      <span className="football-award-xi-pitch__circle" aria-hidden="true" />
      <span className="football-award-xi-pitch__box football-award-xi-pitch__box--top" aria-hidden="true" />
      <span className="football-award-xi-pitch__box football-award-xi-pitch__box--bottom" aria-hidden="true" />
      <span className="football-award-xi-pitch__formation">{formation}</span>
      {slots.map((slot) => {
        const entry = entries.get(`${slot.position}:${slot.index}`);
        const rating = typeof entry?.metrics.rating === "number" ? entry.metrics.rating.toFixed(2) : "—";
        return (
          <div
            key={slot.index}
            className={`football-award-xi-pitch__slot${entry?.isCareerPlayer ? " is-player" : ""}`}
            style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
          >
            <span>{slot.position}</span>
            <strong>{entry ? shortName(entry.name) : "Chưa có"}</strong>
            <small>{entry ? `Rating ${rating}` : "Đang cập nhật"}</small>
          </div>
        );
      })}
    </div>
  );
}
