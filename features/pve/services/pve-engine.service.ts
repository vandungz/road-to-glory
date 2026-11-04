import { resolveWeightedOutcome, type RandomSource } from "@/lib/wheel-engine/spin-resolver";
import { simulateDynamicLeagueTableService } from "@/features/season/services/table-simulator.service";
import {
  PVE_FORMATION_SLOTS,
  PVE_LINEUP_SIZE,
  PVE_ROUNDS,
  type PveCatalogPlayer,
  type PveClubInput,
  type PveMatchMoment,
  type PveOpponentPlayer,
  type PveOpponentTeam,
  type PveRound,
  type PveRoundRecord,
  type PveStatus,
  type PveTournamentState,
  type PvePlayerStats,
  type PveGroupStage,
} from "@/types/pve";
import type { Formation } from "@/types/game";

export interface PveUserPlayerInput {
  slotIndex: number;
  position: string;
  peakOvr: number;
  statsTimeline: unknown;
}

interface TeamProfile {
  overall: number;
  attack: number;
  midfield: number;
  defense: number;
  goalkeeping: number;
  balance: number;
}

interface RoundPolicy {
  label: string;
  opponentTarget: number;
  difficulty: number;
  edgeScale: number;
}

const ROUND_POLICIES: Record<PveRound, RoundPolicy> = {
  round_of_16: { label: "Vòng 1/8", opponentTarget: 82, difficulty: 0.98, edgeScale: 112 },
  quarter_final: { label: "Tứ kết", opponentTarget: 86, difficulty: 1.02, edgeScale: 108 },
  semi_final: { label: "Bán kết", opponentTarget: 90, difficulty: 1.06, edgeScale: 104 },
  final: { label: "Chung kết", opponentTarget: 94, difficulty: 1.1, edgeScale: 100 },
};

const ROUND_PRESTIGE_MULTIPLIER: Record<PveRound, number> = {
  round_of_16: 1,
  quarter_final: 1.25,
  semi_final: 1.6,
  final: 2.2,
};

const MOMENT_POLICIES = [
  { label: "Nhịp 01 · Thế trận", userMetric: "midfield", opponentMetric: "midfield", userFocus: "Khả năng thoát pressing", opponentFocus: "Cường độ áp sát" },
  { label: "Nhịp 02 · Đối đầu", userMetric: "defense", opponentMetric: "attack", userFocus: "Khối phòng ngự", opponentFocus: "Pha đi bóng quyết định" },
  { label: "Nhịp 03 · Kết liễu", userMetric: "attack", opponentMetric: "defense", userFocus: "Mũi nhọn tấn công", opponentFocus: "Hàng thủ lùi sâu" },
] as const;

const POSITION_GROUPS = {
  goalkeeper: ["GK"],
  defense: ["LB", "CB", "RB"],
  midfield: ["CDM", "CM", "CAM", "LM", "RM"],
  attack: ["LW", "RW", "ST"],
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function mean(values: number[], fallback: number): number {
  return values.length === 0 ? fallback : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function statValue(source: Record<string, unknown>, aliases: string[], fallback: number): number {
  const value = aliases.map((key) => source[key]).find((candidate) => typeof candidate === "number" && Number.isFinite(candidate));
  return typeof value === "number" ? clamp(value, 1, 99) : fallback;
}

function readTimeline(source: unknown): Record<string, unknown> {
  if (!Array.isArray(source)) return {};
  const latest = source.at(-1);
  return latest && typeof latest === "object" && !Array.isArray(latest) ? latest as Record<string, unknown> : {};
}

function profileForPlayers(players: Array<{ position: string; overall: number; stats: PvePlayerStats }>): TeamProfile {
  const overall = mean(players.map((player) => player.overall), 1);
  const attackPlayers = players.filter((player) => POSITION_GROUPS.attack.includes(player.position as never));
  const midfieldPlayers = players.filter((player) => POSITION_GROUPS.midfield.includes(player.position as never));
  const defensePlayers = players.filter((player) => POSITION_GROUPS.defense.includes(player.position as never));
  const goalkeeper = players.filter((player) => player.position === "GK");
  const lineScore = (line: typeof players) => mean(line.map((player) => (
    player.overall * 0.45 + (player.stats.pace + player.stats.shooting + player.stats.passing + player.stats.dribbling + player.stats.defending + player.stats.physical) / 6 * 0.55
  )), overall);
  const attack = lineScore(attackPlayers);
  const midfield = lineScore(midfieldPlayers);
  const defense = lineScore(defensePlayers);
  const goalkeeping = lineScore(goalkeeper);
  const balance = 100 - Math.min(100, Math.abs(attack - defense) * 0.7 + Math.abs(midfield - overall) * 0.3);
  return { overall, attack, midfield, defense, goalkeeping, balance };
}

export function buildUserTeamProfile(players: PveUserPlayerInput[]): TeamProfile {
  const mapped = players.map((player) => {
    const timeline = readTimeline(player.statsTimeline);
    const stats: PvePlayerStats = {
      pace: statValue(timeline, ["pace", "pac", "spd"], player.peakOvr),
      shooting: statValue(timeline, ["shooting", "sho"], player.peakOvr),
      passing: statValue(timeline, ["passing", "pas"], player.peakOvr),
      dribbling: statValue(timeline, ["dribbling", "dri"], player.peakOvr),
      defending: statValue(timeline, ["defending", "def"], player.peakOvr),
      physical: statValue(timeline, ["physical", "phy"], player.peakOvr),
    };
    const overall = statValue(timeline, ["ovr"], player.peakOvr);
    return { position: player.position, overall, stats };
  });
  return profileForPlayers(mapped);
}

function publicOpponentPlayer(player: PveCatalogPlayer): PveOpponentPlayer {
  return {
    id: player.id,
    name: player.name,
    nationality: player.nationality,
    position: player.position,
    overall: player.overall,
    stats: player.stats,
  };
}

function isCompatible(slotPosition: string, playerPosition: string): boolean {
  if (slotPosition === playerPosition) return true;
  if (slotPosition === "GK") return playerPosition === "GK";
  if (POSITION_GROUPS.defense.includes(slotPosition as never)) return POSITION_GROUPS.defense.includes(playerPosition as never);
  if (POSITION_GROUPS.midfield.includes(slotPosition as never)) return POSITION_GROUPS.midfield.includes(playerPosition as never);
  return POSITION_GROUPS.attack.includes(playerPosition as never);
}

function createOpponentTeam(
  round: PveRound,
  catalog: PveCatalogPlayer[],
  clubs: PveClubInput[],
  randomSource: RandomSource,
  excludedClubIds: Set<string>,
): PveOpponentTeam {
  const policy = ROUND_POLICIES[round];
  const availableClubs = clubs.filter((club) => !excludedClubIds.has(club.id) && catalog.filter((player) => player.clubId === club.id).length >= PVE_LINEUP_SIZE);
  if (availableClubs.length === 0) throw new Error("PvE opponent pool is exhausted");
  const club = resolveWeightedOutcome(
    availableClubs.map((item) => ({ value: item, weight: Math.max(1, item.prestige * ROUND_PRESTIGE_MULTIPLIER[round]) })),
    randomSource,
  );
  const clubPlayers = catalog.filter((player) => player.clubId === club.id);
  if (clubPlayers.length < PVE_FORMATION_SLOTS[club.formation].length) {
    throw new Error(`PvE catalog is missing enough players for ${club.name}`);
  }
  const used = new Set<string>();
  const players = PVE_FORMATION_SLOTS[club.formation].map((slot) => {
    const compatible = clubPlayers.filter((player) => !used.has(player.id) && isCompatible(slot.position, player.position));
    // Keep the real club roster intact when the source data has no exact position for a slot.
    const candidates = compatible.length > 0 ? compatible : clubPlayers.filter((player) => !used.has(player.id));
    if (candidates.length === 0) throw new Error(`PvE player catalog is missing enough players for ${club.name}`);
    const chosen = resolveWeightedOutcome(
      candidates.map((player) => ({
        value: player,
        weight: Math.max(1, 100 - Math.abs(player.overall - policy.opponentTarget) * 3),
      })),
      randomSource,
    );
    used.add(chosen.id);
    return chosen;
  });
  const squadOvr = Math.round(mean(players.map((player) => player.overall), policy.opponentTarget));
  return { id: `${club.id}-${round}`, clubId: club.id, name: club.name, formation: club.formation, clubPrestige: club.prestige, squadOvr, players: players.map(publicOpponentPlayer) };
}

function opponentProfile(team: PveOpponentTeam, catalog: PveCatalogPlayer[]): TeamProfile {
  const byId = new Map(catalog.map((player) => [player.id, player]));
  return profileForPlayers(team.players.map((player) => {
    const catalogPlayer = byId.get(player.id);
    return { position: player.position, overall: player.overall, stats: catalogPlayer?.stats ?? { pace: player.overall, shooting: player.overall, passing: player.overall, dribbling: player.overall, defending: player.overall, physical: player.overall } };
  }));
}

function momentStory(moment: number, winner: "user" | "opponent", opponent: PveOpponentPlayer[]): string {
  if (winner === "user") return moment === 0 ? "Đội bạn giữ bóng qua lớp pressing và chiếm nhịp trận." : moment === 1 ? "Hàng thủ đội bạn đọc đúng đường chuyền quyết định." : "Mũi nhọn đội bạn chớp thời cơ ở khoảnh khắc lớn.";
  const star = opponent[Math.min(opponent.length - 1, moment * 3)];
  return moment === 0 ? "Đối thủ bóp nghẹt tuyến giữa bằng những đường chuyền một chạm." : moment === 1 ? `${star?.name ?? "Ngôi sao đối thủ"} tạo ra pha đi bóng làm vỡ khối phòng ngự.` : `${star?.name ?? "Mũi nhọn đối thủ"} kết thúc pha phối hợp bằng cú dứt điểm lạnh lùng.`;
}

export function calculateGroupStage(profile: TeamProfile, catalog: PveCatalogPlayer[], clubs: PveClubInput[], randomSource: RandomSource): PveGroupStage {
  const tableClubs = [{ id: "user-team", name: "Đội bạn", leagueId: "UCL", prestige: 4, continentalType: "player" }, ...clubs.map((club) => ({ id: club.id, name: club.name, leagueId: "UCL", prestige: club.prestige, continentalType: "champions-league" }))];
  const userStanding = clamp(Math.round(10 - (profile.overall - 60) / 4), 1, tableClubs.length);
  const classicRows = simulateDynamicLeagueTableService(userStanding, "Đội bạn", tableClubs, { matches: 8, randomSource });
  const rows = classicRows.map((row) => ({
    clubId: row.clubId,
    clubName: row.name,
    played: row.played,
    won: row.won,
    drawn: row.drawn,
    lost: row.lost,
    goalDifference: row.won - row.lost,
    points: row.points,
    isUser: row.clubId === "user-team",
  })).sort((left, right) => right.points - left.points || right.goalDifference - left.goalDifference || left.clubName.localeCompare(right.clubName));
  const rankedTable = rows.map((row) => row);
  const rank = rankedTable.findIndex((row) => row.isUser) + 1;
  const passed = rank > 0 && rank <= 8;
  const table = rankedTable;
  return {
    passed,
    rank,
    table,
    summary: passed ? `Đội bạn đứng hạng ${rank} và giành vé vào vòng knock-out.` : `Đội bạn đứng hạng ${rank} và dừng bước ở league phase.`,
  };
}

export function createPveTournamentState(
  formation: Formation,
  players: PveUserPlayerInput[],
  catalog: PveCatalogPlayer[],
  clubs: PveClubInput[],
  randomSource: RandomSource,
): PveTournamentState {
  const group = calculateGroupStage(buildUserTeamProfile(players), catalog, clubs, randomSource);
  const firstRound = PVE_ROUNDS[0];
  const status: PveStatus = group.passed ? firstRound : "eliminated";
  const pendingOpponent = group.passed ? createOpponentTeam(firstRound, catalog, clubs, randomSource, new Set()) : undefined;
  return { version: 3, formation, status, group, rounds: [], pendingOpponent };
}

export function resolvePveRound(
  state: PveTournamentState,
  players: PveUserPlayerInput[],
  catalog: PveCatalogPlayer[],
  clubs: PveClubInput[],
  randomSource: RandomSource,
): PveTournamentState {
  if (!PVE_ROUNDS.includes(state.status as PveRound)) throw new Error("PvE tournament is not waiting for a match");
  const round = state.status as PveRound;
  const user = buildUserTeamProfile(players);
  const facedClubIds = new Set(state.rounds.map((record) => record.opponent.clubId));
  const opponent = state.pendingOpponent ?? createOpponentTeam(round, catalog, clubs, randomSource, facedClubIds);
  const computer = opponentProfile(opponent, catalog);
  const moments: PveMatchMoment[] = MOMENT_POLICIES.map((policy, index) => {
    const userMetric = user[policy.userMetric];
    const opponentMetric = computer[policy.opponentMetric] * ROUND_POLICIES[round].difficulty;
    const userChance = clamp(0.5 + (userMetric - opponentMetric) / ROUND_POLICIES[round].edgeScale, 0.12, 0.88);
    const winner = randomSource() < userChance ? "user" : "opponent";
    return { index: index + 1, label: policy.label, userFocus: policy.userFocus, opponentFocus: policy.opponentFocus, winner, story: momentStory(index, winner, opponent.players) };
  });
  const userScore = moments.filter((moment) => moment.winner === "user").length;
  const opponentScore = moments.length - userScore;
  const result: PveRoundRecord = { round, opponent, userScore, opponentScore, result: userScore >= 2 ? "win" : "loss", moments };
  const rounds = [...state.rounds, result];
  const nextRound = PVE_ROUNDS[PVE_ROUNDS.indexOf(round) + 1];
  const nextStatus: PveStatus = result.result === "loss" ? "eliminated" : nextRound ?? "champion";
  const nextPendingOpponent = result.result === "win" && nextRound
    ? createOpponentTeam(nextRound, catalog, clubs, randomSource, new Set([...facedClubIds, opponent.clubId]))
    : undefined;
  return { ...state, status: nextStatus, rounds, pendingOpponent: nextPendingOpponent };
}

export function isPveTournamentState(value: unknown): value is PveTournamentState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<PveTournamentState>;
  return (state.version === 1 || state.version === 2 || state.version === 3) && typeof state.formation === "string" && typeof state.status === "string" && !!state.group && Array.isArray(state.rounds);
}

export function isCurrentPveTournamentState(value: unknown): value is PveTournamentState {
  return isPveTournamentState(value) && value.version === 3;
}

export function roundLabel(round: PveStatus): string {
  if (round === "champion") return "Vô địch";
  if (round === "eliminated") return "Đã dừng bước";
  return ROUND_POLICIES[round].label;
}
