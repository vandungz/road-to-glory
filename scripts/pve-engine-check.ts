import assert from "node:assert/strict";
import { PVE_PLAYERS } from "../prisma/data/pve-players";
import { FORMATION_SLOTS } from "../types/squad";
import { createPveTournamentState, resolvePveRound, type PveClubInput, type PveUserPlayerInput } from "../features/pve/services/pve-engine.service";

const players: PveUserPlayerInput[] = FORMATION_SLOTS["4-3-3"].map((slot) => ({
  slotIndex: slot.index,
  position: slot.position,
  peakOvr: 92,
  statsTimeline: [{ ovr: 92, pac: 92, sho: 92, pas: 92, dri: 92, def: 92, phy: 92 }],
}));
const clubs: PveClubInput[] = [
  { id: "club-a", name: "Club A", prestige: 5 },
  { id: "club-b", name: "Club B", prestige: 4 },
  { id: "club-c", name: "Club C", prestige: 4 },
  { id: "club-d", name: "Club D", prestige: 3 },
];

const state = createPveTournamentState("4-3-3", players, PVE_PLAYERS, clubs, () => 0);
assert.equal(state.version, 1);
assert.equal(state.group.passed, true);
const resolved = resolvePveRound(state, players, PVE_PLAYERS, clubs, () => 0);
assert.equal(resolved.rounds[0]?.moments.length, 3);
assert.equal(resolved.rounds[0]?.userScore, 3);
assert.equal(resolved.status, "quarter_final");
console.log("PvE engine invariants passed");
