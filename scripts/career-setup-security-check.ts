import assert from "node:assert/strict";
import "dotenv/config";

// This is a pure token-boundary check; no database connection or career row is
// touched. A test-only secret is isolated from the project environment.
process.env.CAREER_SETUP_TOKEN_SECRET = "career-setup-check-secret";

import {
  createCareerSetupToken,
  setupDataForInit,
  verifyCareerSetupToken,
} from "@/features/career/services/career-setup-token.service";

const setup = {
  playerName: "Test Player",
  preferredFoot: "Right",
  debutOvr: 68,
  initStint: {
    clubId: "club-a",
    clubName: "Test Club",
    leagueId: "league-a",
    leagueName: "Test League",
    startAge: 19,
    endAge: 19,
    yearsAtClub: 1,
    ovrAtJoining: 68,
    ovrAtLeaving: 68,
  },
  initStats: { pac: 68, sho: 68, pas: 68, dri: 68, def: 60, phy: 68 },
  initTimeline: [{ age: 19, ovr: 68, pac: 68, sho: 68, pas: 68, dri: 68, def: 60, phy: 68 }],
  contractYearsTotal: 3,
  contractYearsRemaining: 3,
  currentWageAnnual: 500,
  marketValue: 3500,
};

const token = createCareerSetupToken({
  userId: "user-a",
  gameId: "00000000-0000-4000-8000-000000000001",
  slotIndex: 0,
  position: "CM",
  nationality: "England",
  debutAge: 19,
  careerLength: 15,
  height: 180,
  weight: 75,
  currentContinentalCup: "none",
  setup,
});

const verified = verifyCareerSetupToken({
  token,
  userId: "user-a",
  gameId: "00000000-0000-4000-8000-000000000001",
  slotIndex: 0,
});
assert.deepEqual(setupDataForInit(verified), {
  name: "Test Player",
  preferredFoot: "Right",
  debutOvr: 68,
  statsTimeline: setup.initTimeline,
  clubStints: [setup.initStint],
  contractYearsTotal: 3,
  contractYearsRemaining: 3,
  currentWageAnnual: 500,
  marketValue: 3500,
});

assert.throws(() => verifyCareerSetupToken({
  token: `${token.slice(0, -1)}x`,
  userId: "user-a",
  gameId: "00000000-0000-4000-8000-000000000001",
  slotIndex: 0,
}));
assert.throws(() => verifyCareerSetupToken({
  token,
  userId: "user-b",
  gameId: "00000000-0000-4000-8000-000000000001",
  slotIndex: 0,
}));

console.log("career-setup-security-check: passed");
