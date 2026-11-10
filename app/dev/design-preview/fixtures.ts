import { FORMATION_SLOTS, type ClientSafePlayer } from "@/types/squad";
import type { PveSessionCard } from "@/types/pve";
import type { GameSessionSummary } from "@/types/game";
import type { ClubStint } from "@/types/domain";

// Synthetic display fixtures. These records never reach a server mutation.
const NATIONALITIES = [
  "Brazil", "France", "Argentina", "Germany", "Japan", "Portugal",
  "Spain", "England", "Nigeria", "Netherlands", "Sweden",
];

export const previewPlayers: ClientSafePlayer[] = FORMATION_SLOTS["4-3-3"].map((slot, index) => ({
  id: `design-preview-player-${index}`,
  slotIndex: slot.index,
  name: index === 0 ? "Cầu thủ thử nghiệm tên dài Nguyễn" : `Cầu thủ thử nghiệm ${index + 1}`,
  nationality: NATIONALITIES[index],
  position: slot.position,
  peakOvr: 78 + index,
  cardRarity: "gold",
  debutAge: 18,
  retireAge: 34,
  careerLengthYears: 17,
}));

export const previewSessions: PveSessionCard[] = [
  {
    gameId: "design-preview-unstarted", name: "Đội hình thử nghiệm chưa bắt đầu",
    formation: "4-3-3", squadRating: 83, playerCount: 11, tournamentStatus: null,
  },
  {
    gameId: "design-preview-champion", name: "Đội hình thử nghiệm vô địch",
    formation: "4-4-2", squadRating: 86, playerCount: 11, tournamentStatus: "champion",
  },
];

export const previewClassicSessions: GameSessionSummary[] = Array.from({ length: 6 }, (_, index) => ({
  id: `preview-session-${index}`, name: `Đội hình thử nghiệm ${index + 1}`,
  formation: "4-3-3", createdAt: new Date("2026-10-01T00:00:00Z"),
  squadRating: index === 0 ? null : 79, status: index === 0 ? "in_progress" : "completed",
  playerCount: index === 0 ? 5 : 11,
}));

export const previewClubStints: ClubStint[] = Array.from({ length: 7 }, (_, index) => ({
  clubId: `preview-club-${index}`, clubName: `Câu lạc bộ thử nghiệm ${index + 1}`,
  leagueId: "preview-league", leagueName: "Giải vô địch thử nghiệm",
  startAge: 18 + index * 2, endAge: 19 + index * 2, yearsAtClub: 2,
  ovrAtJoining: 78, ovrAtLeaving: 80,
}));
