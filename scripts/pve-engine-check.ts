import assert from "node:assert/strict";
import { PVE_PLAYERS } from "../prisma/data/pve-players";
import { PVE_CLUBS } from "../prisma/data/pve-clubs";
import { FORMATION_SLOTS } from "../types/squad";
import { createPveTournamentState, resolvePveRound, type PveUserPlayerInput } from "../features/pve/services/pve-engine.service";
import type { PveClubInput } from "../types/pve";

const playableRealClubs = PVE_CLUBS.filter((club) => PVE_PLAYERS.filter((player) => player.clubId === club.id).length >= 11);
assert.equal(PVE_CLUBS.length, 36);
assert.ok(playableRealClubs.length >= 34);
assert.equal(PVE_PLAYERS.find((player) => player.name === "Ferran Torres")?.clubId, "paris_saint_germain");

const players: PveUserPlayerInput[] = FORMATION_SLOTS["4-3-3"].map((slot) => ({
  slotIndex: slot.index,
  position: slot.position,
  peakOvr: 92,
  statsTimeline: [{ ovr: 92, pac: 92, sho: 92, pas: 92, dri: 92, def: 92, phy: 92 }],
}));
for (const club of playableRealClubs) {
  const pool = [club, ...playableRealClubs.filter((item) => item.id !== club.id)].slice(0, 4);
  const tournament = createPveTournamentState("4-3-3", players, PVE_PLAYERS, pool, () => 0);
  assert.equal(tournament.pendingOpponent?.clubId, club.id);
  assert.equal(tournament.pendingOpponent?.players.length, 11);
}
const clubs: PveClubInput[] = [
  { id: "club-a", name: "Club A", prestige: 5, formation: "4-3-3" },
  { id: "club-b", name: "Club B", prestige: 4, formation: "4-2-3-1" },
  { id: "club-c", name: "Club C", prestige: 4, formation: "3-5-2" },
  { id: "club-d", name: "Club D", prestige: 3, formation: "4-4-2" },
];
const catalog = PVE_PLAYERS.map((player, index) => ({
  ...player,
  clubId: clubs[index % clubs.length].id,
  clubName: clubs[index % clubs.length].name,
}));

const state = createPveTournamentState("4-3-3", players, catalog, clubs, () => 0);
assert.equal(state.version, 3);
assert.equal(state.group.passed, true);
assert.equal(state.group.table.length, clubs.length + 1);
assert.equal(state.group.table.find((row) => row.isUser)?.clubId, "user-team");
assert.ok(state.pendingOpponent);
const resolved = resolvePveRound(state, players, catalog, clubs, () => 0);
assert.equal(resolved.rounds[0]?.moments.length, 3);
assert.equal(resolved.rounds[0]?.userScore, 3);
assert.equal(resolved.status, "quarter_final");
assert.ok(resolved.pendingOpponent);
assert.ok(resolved.pendingOpponent?.clubId !== resolved.rounds[0]?.opponent.clubId);
assert.ok(resolved.rounds[0]?.opponent.players.every((player) => catalog.find((item) => item.id === player.id)?.clubId === resolved.rounds[0]?.opponent.clubId));
console.log("PvE engine invariants passed");
