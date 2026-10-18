import type { AchievementRecord } from "@/types/domain";
import type { ClientSafePlayer } from "@/types/squad";
import { isDeprecatedAwardKey } from "@/types/awards";
import {
  getHonourDisplayCategory,
  getHonourResultLabel,
  getSpecificHonourLabel,
  normalizeHonourResult,
  type HonourDisplayCategory,
  type HonourResult,
} from "@/features/career/lib/honour-display";

export interface HonourRow {
  label: string;
  count: number;
  category: HonourDisplayCategory;
  result: HonourResult;
  accent?: boolean;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function historyContext(record: Record<string, unknown>) {
  const continental = asRecord(record.continentalCup);
  const national = asRecord(record.nationalTeam);
  return {
    leagueId: typeof record.leagueId === "string" ? record.leagueId : null,
    leagueName: typeof record.leagueName === "string" ? record.leagueName : null,
    continentalType: typeof continental.type === "string" ? continental.type : null,
    nationalTeamType: typeof national.type === "string" ? national.type : null,
  };
}

function addRow(grouped: Map<string, HonourRow>, row: HonourRow): void {
  const key = `${row.category}:${row.result}:${row.label}`;
  const current = grouped.get(key);
  grouped.set(key, current ? { ...current, count: current.count + 1 } : row);
}

function addHistoryHonours(
  grouped: Map<string, HonourRow>,
  history: Record<string, unknown>,
  canonicalTeamKeys: Set<string>,
): void {
  Object.entries(history).forEach(([age, value]) => {
    const record = asRecord(value);
    const context = historyContext(record);
    const add = (awardKey: string, rawResult: unknown, fallback: string) => {
      const result = normalizeHonourResult(rawResult);
      if (canonicalTeamKeys.has(`${age}:${awardKey}:${result}`)) return;
      addRow(grouped, {
        label: getHonourResultLabel(getSpecificHonourLabel(awardKey, fallback, context), result),
        category: "club",
        result,
        count: 1,
      });
    };

    if (record.standing === 1 || record.standing === 2) {
      add("league_title", record.standing === 2 ? "runner_up" : "winner", "Vô địch giải quốc gia");
    }
    if (record.domesticCup === "Winner" || record.domesticCup === "Runner-Up") {
      add("domestic_cup_title", record.domesticCup, "Vô địch Cúp quốc gia");
    }
    const continental = asRecord(record.continentalCup);
    if (continental.result === "Winner" || continental.result === "Runner-Up") {
      add("continental_title", continental.result, "Vô địch cúp châu lục");
    }
    const national = asRecord(record.nationalTeam);
    if (national.result === "Winner" || national.result === "Runner-Up") {
      add("national_team_title", national.result, "Vô địch giải quốc tế");
    }
  });
}

export function getHonourRows(
  achievements?: AchievementRecord,
  seasonHistory?: unknown,
  canonicalHonours?: ClientSafePlayer["honours"],
): HonourRow[] {
  const history = asRecord(seasonHistory);
  const grouped = new Map<string, HonourRow>();

  if (canonicalHonours && canonicalHonours.length > 0) {
    const canonicalTeamKeys = new Set<string>();
    for (const honour of canonicalHonours.filter((item) => !isDeprecatedAwardKey(item.awardKey))) {
      const record = asRecord(history[String(honour.age)]);
      const context = historyContext(record);
      const category = getHonourDisplayCategory(honour.awardKey, honour.category);
      const result = normalizeHonourResult(honour.result);
      const label = getHonourResultLabel(
        getSpecificHonourLabel(honour.awardKey, honour.label, {
          ...context,
          leagueId: context.leagueId ?? honour.scopeKey,
        }),
        result,
      );
      if (category === "club") canonicalTeamKeys.add(`${honour.age}:${honour.awardKey}:${result}`);
      const rankLabel = honour.rank && honour.rank > 1 ? ` · hạng ${honour.rank}` : "";
      addRow(grouped, { label: label + rankLabel, category, result, count: 1, accent: honour.awardKey === "ballon_dor" });
    }
    // Canonical honours are authoritative, but old season records can contain
    // team outcomes written before the canonical pipeline existed.
    addHistoryHonours(grouped, history, canonicalTeamKeys);
    return [...grouped.values()];
  }

  if (achievements?.ballonDor && achievements.ballonDor > 0) {
    addRow(grouped, { label: "Quả bóng vàng", category: "individual", result: "winner", count: achievements.ballonDor, accent: true });
  }

  const persistedLabels = new Set<string>();
  for (const trophy of achievements?.trophies ?? []) {
    const result = normalizeHonourResult(trophy.result ?? (/^Á quân\s+/i.test(trophy.name) ? "runner_up" : "winner"));
    const baseLabel = trophy.type === "league" ? `Vô địch ${trophy.name.replace(/^Vô địch\s+/i, "")}` : trophy.name;
    const label = getHonourResultLabel(baseLabel, result);
    const isGenericTeamLabel = /(?:vô địch\s+|á quân\s+)?(?:cúp quốc gia|cúp châu lục|giải quốc gia)$/i.test(label.trim());
    if (Object.keys(history).length > 0 && isGenericTeamLabel) continue;
    persistedLabels.add(label.trim().toLocaleLowerCase());
    addRow(grouped, { label, category: "club", result, count: 1 });
  }

  for (const award of achievements?.seasonAwards ?? []) {
    const result = normalizeHonourResult(award.result ?? (/^Á quân\s+/i.test(award.label) ? "runner_up" : "winner"));
    const label = getHonourResultLabel(award.label + (award.type === "ballon_dor" && !/hạng|quả bóng vàng/i.test(award.label) ? " · Quả bóng vàng" : ""), result);
    addRow(grouped, { label, category: "individual", result, count: 1, accent: award.type === "ballon_dor" });
  }

  const derived = new Map<string, HonourRow>();
  addHistoryHonours(derived, history, new Set());
  for (const row of derived.values()) {
    if (!persistedLabels.has(row.label.trim().toLocaleLowerCase())) addRow(grouped, row);
  }
  return [...grouped.values()];
}
