const fs = require("fs");
const out = { nodes: [], edges: [] };

function addNode(n) {
  out.nodes.push(n);
}
function addEdge(e) {
  out.edges.push(e);
}
function contains(file, fn) {
  addEdge({
    source: "file:" + file,
    target: "function:" + file + ":" + fn,
    type: "contains",
    direction: "forward",
    weight: 1.0,
  });
}
function exportsEdge(file, fn) {
  addEdge({
    source: "file:" + file,
    target: "function:" + file + ":" + fn,
    type: "exports",
    direction: "forward",
    weight: 0.8,
  });
}
function imports(from, to) {
  addEdge({
    source: "file:" + from,
    target: "file:" + to,
    type: "imports",
    direction: "forward",
    weight: 0.7,
  });
}
function calls(src, tgt) {
  addEdge({
    source: src,
    target: tgt,
    type: "calls",
    direction: "forward",
    weight: 0.8,
  });
}

addNode({
  id: "file:actions/player.actions.ts",
  type: "file",
  name: "player.actions.ts",
  filePath: "actions/player.actions.ts",
  summary:
    "Server Actions for career player init, fetch, and save with auth ownership checks, Zod validation, and rate limiting.",
  tags: ["api-handler", "server-action", "auth", "validation"],
  complexity: "complex",
});
addNode({
  id: "file:actions/season.actions.ts",
  type: "file",
  name: "season.actions.ts",
  filePath: "actions/season.actions.ts",
  summary:
    "Thin Server Actions that orchestrate season simulation, league tables, transfers, cup journeys, and stat evolution via domain services.",
  tags: ["api-handler", "server-action", "auth", "service"],
  complexity: "complex",
});
addNode({
  id: "file:features/career/services/career-setup.service.ts",
  type: "file",
  name: "career-setup.service.ts",
  filePath: "features/career/services/career-setup.service.ts",
  summary:
    "Builds the initial career player snapshot from draft wheel data, fictional name generation, and randomized hidden stats.",
  tags: ["service", "career", "factory"],
  complexity: "moderate",
});
addNode({
  id: "file:features/player/services/stats-evolution.service.ts",
  type: "file",
  name: "stats-evolution.service.ts",
  filePath: "features/player/services/stats-evolution.service.ts",
  summary:
    "Applies yearly stat deltas and recalculates overall rating server-side by position.",
  tags: ["service", "player", "stats"],
  complexity: "simple",
});
addNode({
  id: "file:features/season/services/cup-journey.service.ts",
  type: "file",
  name: "cup-journey.service.ts",
  filePath: "features/season/services/cup-journey.service.ts",
  summary:
    "Simulates domestic, continental, and national-team cup knockout journeys with prestige-weighted scores.",
  tags: ["service", "season", "cup", "simulation"],
  complexity: "complex",
});
addNode({
  id: "file:features/season/services/table-simulator.service.ts",
  type: "file",
  name: "table-simulator.service.ts",
  filePath: "features/season/services/table-simulator.service.ts",
  summary:
    "Generates a dynamic league table placing the player club and jittering other clubs by prestige.",
  tags: ["service", "season", "simulation"],
  complexity: "moderate",
});
addNode({
  id: "file:features/transfer/services/transfer.service.ts",
  type: "file",
  name: "transfer.service.ts",
  filePath: "features/transfer/services/transfer.service.ts",
  summary:
    "Selects a prestige-matched transfer destination club using weighted random resolution.",
  tags: ["service", "transfer", "simulation"],
  complexity: "moderate",
});
addNode({
  id: "file:features/wheel/hooks/useStatEvolutionFlow.ts",
  type: "file",
  name: "useStatEvolutionFlow.ts",
  filePath: "features/wheel/hooks/useStatEvolutionFlow.ts",
  summary:
    "Client hook that drives post-season spin completion into stat selection, server-side evolution, and transfer-offer checks.",
  tags: ["hook", "career", "wheel"],
  complexity: "moderate",
});
addNode({
  id: "file:lib/name-gen.ts",
  type: "file",
  name: "name-gen.ts",
  filePath: "lib/name-gen.ts",
  summary:
    "Generates nationality-aware fictional player names from curated first and last name pools.",
  tags: ["utility", "name-generation", "career"],
  complexity: "simple",
});
addNode({
  id: "file:lib/rate-limit.ts",
  type: "file",
  name: "rate-limit.ts",
  filePath: "lib/rate-limit.ts",
  summary:
    "Upstash Redis sliding-window rate limiter used by Server Actions to throttle authenticated requests.",
  tags: ["utility", "security", "middleware"],
  complexity: "simple",
  languageNotes:
    "Fails open with a console warning when UPSTASH env vars are missing so local dev stays usable.",
});
addNode({
  id: "file:lib/wheel-engine/spin-resolver.ts",
  type: "file",
  name: "spin-resolver.ts",
  filePath: "lib/wheel-engine/spin-resolver.ts",
  summary:
    "Sole Math.random entry point providing resolveRandom helpers and weighted outcome selection for the wheel engine.",
  tags: ["utility", "wheel-engine", "probability", "singleton"],
  complexity: "simple",
  languageNotes: "Project invariant: Math.random must only appear in this file.",
});

const fns = [
  [
    "actions/player.actions.ts",
    "verifyGameOwnership",
    [97, 110],
    "Confirms the authenticated user owns the game session before write operations.",
    ["auth", "ownership", "validation"],
    "simple",
    false,
  ],
  [
    "actions/player.actions.ts",
    "initCareerPlayerAction",
    [112, 158],
    "Creates or upserts a draft career player after Zod validation and ownership checks.",
    ["server-action", "career", "validation"],
    "moderate",
    true,
  ],
  [
    "actions/player.actions.ts",
    "getCareerPlayerAction",
    [160, 188],
    "Fetches a career player by id for the authenticated owner with rate limiting.",
    ["server-action", "career", "fetch"],
    "moderate",
    true,
  ],
  [
    "actions/player.actions.ts",
    "saveCareerPlayer",
    [190, 262],
    "Persists completed career player data, assigns card rarity from peak OVR, and redirects to the squad board.",
    ["server-action", "career", "persistence"],
    "complex",
    true,
  ],
  [
    "actions/season.actions.ts",
    "verifyGameOwnership",
    [177, 188],
    "Auth helper that rate-limits and verifies game session ownership for mutating season actions.",
    ["auth", "ownership", "validation"],
    "simple",
    false,
  ],
  [
    "actions/season.actions.ts",
    "saveSeasonProgress",
    [200, 221],
    "Transactionally updates career players after a season and revalidates the game path.",
    ["server-action", "season", "persistence"],
    "moderate",
    true,
  ],
  [
    "actions/season.actions.ts",
    "updateSeasonProgressAction",
    [223, 247],
    "Updates a single career player season progress record for the authenticated owner.",
    ["server-action", "season", "persistence"],
    "moderate",
    true,
  ],
  [
    "actions/season.actions.ts",
    "completeGameSession",
    [249, 274],
    "Marks a game session complete and aggregates peak ratings across career players.",
    ["server-action", "season", "lifecycle"],
    "moderate",
    true,
  ],
  [
    "actions/season.actions.ts",
    "simulatePlayerSeasonAction",
    [276, 303],
    "Validates input and delegates league season simulation to the season simulator service.",
    ["server-action", "season", "simulation"],
    "moderate",
    true,
  ],
  [
    "actions/season.actions.ts",
    "generateLeagueTableAction",
    [305, 325],
    "Loads league clubs from Prisma and builds a dynamic league table via the table simulator.",
    ["server-action", "season", "simulation"],
    "moderate",
    true,
  ],
  [
    "actions/season.actions.ts",
    "startPlayerCareerAction",
    [327, 341],
    "Loads debut club prestige and starts a career via the career-setup service.",
    ["server-action", "career", "factory"],
    "moderate",
    true,
  ],
  [
    "actions/season.actions.ts",
    "generateTransferOfferAction",
    [343, 377],
    "Queries eligible clubs and generates a prestige-matched transfer offer through the transfer service.",
    ["server-action", "transfer", "simulation"],
    "moderate",
    true,
  ],
  [
    "actions/season.actions.ts",
    "generateCupJourneyAction",
    [379, 441],
    "Routes domestic, continental, or national cup generation to the matching cup-journey service.",
    ["server-action", "cup", "simulation"],
    "complex",
    true,
  ],
  [
    "actions/season.actions.ts",
    "evolvePlayerStatsAction",
    [443, 447],
    "Thin authenticated wrapper that applies yearly stat evolution via the player service.",
    ["server-action", "player", "stats"],
    "simple",
    true,
  ],
  [
    "features/career/services/career-setup.service.ts",
    "startPlayerCareerService",
    [55, 101],
    "Assembles initial CareerState fields including name, age, OVR, hidden stats, and continental cup from club type.",
    ["service", "career", "factory"],
    "moderate",
    true,
  ],
  [
    "features/player/services/stats-evolution.service.ts",
    "evolvePlayerStatsService",
    [15, 37],
    "Clamps evolved stats and recomputes OVR with calculateOvrByPosition.",
    ["service", "player", "stats"],
    "simple",
    true,
  ],
  [
    "features/season/services/cup-journey.service.ts",
    "generateCupScore",
    [12, 42],
    "Produces a prestige-weighted cup match score favoring the designated winner.",
    ["service", "cup", "probability"],
    "moderate",
    true,
  ],
  [
    "features/season/services/cup-journey.service.ts",
    "generateDomesticCupJourneyService",
    [44, 114],
    "Builds a domestic cup knockout path by randomly picking unused opponents and scores.",
    ["service", "cup", "simulation"],
    "complex",
    true,
  ],
  [
    "features/season/services/cup-journey.service.ts",
    "generateContinentalCupJourneyService",
    [116, 182],
    "Simulates continental cup progression with group-stage placeholders and knockout rounds.",
    ["service", "cup", "simulation"],
    "complex",
    true,
  ],
  [
    "features/season/services/cup-journey.service.ts",
    "generateNationalTeamJourneyService",
    [192, 250],
    "Simulates a national-team tournament journey against randomized nation opponents.",
    ["service", "cup", "simulation"],
    "complex",
    true,
  ],
  [
    "features/season/services/table-simulator.service.ts",
    "simulateDynamicLeagueTableService",
    [21, 94],
    "Places the player club at the spun standing and fills remaining ranks with prestige-jittered clubs.",
    ["service", "season", "simulation"],
    "moderate",
    true,
  ],
  [
    "features/transfer/services/transfer.service.ts",
    "generateTransferOfferService",
    [21, 80],
    "Filters clubs near player prestige and randomly selects one transfer destination offer.",
    ["service", "transfer", "probability"],
    "moderate",
    true,
  ],
  [
    "features/wheel/hooks/useStatEvolutionFlow.ts",
    "useStatEvolutionFlow",
    [40, 154],
    "Handles wheel spin completion for year evolution, stat picking, server OVR update, and transfer checks.",
    ["hook", "career", "wheel"],
    "moderate",
    true,
  ],
  [
    "lib/name-gen.ts",
    "generateFictionalName",
    [34, 42],
    "Picks first and last names from nationality pools via resolveRandomInt.",
    ["utility", "name-generation", "career"],
    "simple",
    true,
  ],
  [
    "lib/rate-limit.ts",
    "checkRateLimit",
    [42, 58],
    "Enforces Upstash rate limits for a user identifier, failing open when Redis is unconfigured.",
    ["utility", "security", "rate-limiting"],
    "simple",
    true,
  ],
  [
    "lib/wheel-engine/spin-resolver.ts",
    "resolveRandom",
    [13, 15],
    "Returns Math.random in [0,1); the project-wide randomness primitive.",
    ["utility", "probability", "wheel-engine"],
    "simple",
    true,
  ],
  [
    "lib/wheel-engine/spin-resolver.ts",
    "resolveRandomFloat",
    [18, 20],
    "Returns a random float in the inclusive [min, max] range.",
    ["utility", "probability", "wheel-engine"],
    "simple",
    true,
  ],
  [
    "lib/wheel-engine/spin-resolver.ts",
    "resolveRandomInt",
    [23, 25],
    "Returns a random integer in the inclusive [min, max] range.",
    ["utility", "probability", "wheel-engine"],
    "simple",
    true,
  ],
  [
    "lib/wheel-engine/spin-resolver.ts",
    "resolveWeightedOutcome",
    [30, 55],
    "Selects one item from a weighted pool using a single Math.random draw.",
    ["utility", "probability", "wheel-engine"],
    "simple",
    true,
  ],
];

for (const [file, name, lr, summary, tags, complexity, isExport] of fns) {
  addNode({
    id: "function:" + file + ":" + name,
    type: "function",
    name,
    filePath: file,
    lineRange: lr,
    summary,
    tags,
    complexity,
  });
  contains(file, name);
  if (isExport) exportsEdge(file, name);
}

const batchImportData = {
  "actions/player.actions.ts": [
    "lib/name-gen.ts",
    "lib/prisma.ts",
    "lib/rate-limit.ts",
    "lib/supabase/server.ts",
  ],
  "actions/season.actions.ts": [
    "features/career/services/career-setup.service.ts",
    "features/player/services/stats-evolution.service.ts",
    "features/season/services/cup-journey.service.ts",
    "features/season/services/season-simulator.service.ts",
    "features/season/services/table-simulator.service.ts",
    "features/transfer/services/transfer.service.ts",
    "lib/prisma.ts",
    "lib/rate-limit.ts",
    "lib/supabase/server.ts",
  ],
  "features/career/services/career-setup.service.ts": [
    "lib/name-gen.ts",
    "lib/wheel-engine/spin-resolver.ts",
  ],
  "features/player/services/stats-evolution.service.ts": [
    "lib/wheel-engine/weight-calculator.ts",
  ],
  "features/season/services/cup-journey.service.ts": [
    "lib/wheel-engine/spin-resolver.ts",
  ],
  "features/season/services/table-simulator.service.ts": [
    "lib/wheel-engine/spin-resolver.ts",
  ],
  "features/transfer/services/transfer.service.ts": [
    "lib/wheel-engine/spin-resolver.ts",
  ],
  "features/wheel/hooks/useStatEvolutionFlow.ts": ["actions/season.actions.ts"],
  "lib/name-gen.ts": ["lib/wheel-engine/spin-resolver.ts"],
  "lib/rate-limit.ts": [],
  "lib/wheel-engine/spin-resolver.ts": [],
};

let importCount = 0;
for (const [src, targets] of Object.entries(batchImportData)) {
  for (const t of targets) {
    imports(src, t);
    importCount++;
  }
}

calls(
  "function:actions/player.actions.ts:verifyGameOwnership",
  "function:lib/rate-limit.ts:checkRateLimit"
);
calls(
  "function:actions/player.actions.ts:verifyGameOwnership",
  "function:lib/supabase/server.ts:createClient"
);
calls(
  "function:actions/player.actions.ts:getCareerPlayerAction",
  "function:lib/rate-limit.ts:checkRateLimit"
);
calls(
  "function:actions/player.actions.ts:getCareerPlayerAction",
  "function:lib/supabase/server.ts:createClient"
);
calls(
  "function:actions/season.actions.ts:verifyGameOwnership",
  "function:lib/rate-limit.ts:checkRateLimit"
);
calls(
  "function:actions/season.actions.ts:verifyGameOwnership",
  "function:lib/supabase/server.ts:createClient"
);
calls(
  "function:actions/season.actions.ts:simulatePlayerSeasonAction",
  "function:features/season/services/season-simulator.service.ts:simulatePlayerSeasonService"
);
calls(
  "function:actions/season.actions.ts:generateLeagueTableAction",
  "function:features/season/services/table-simulator.service.ts:simulateDynamicLeagueTableService"
);
calls(
  "function:actions/season.actions.ts:startPlayerCareerAction",
  "function:features/career/services/career-setup.service.ts:startPlayerCareerService"
);
calls(
  "function:actions/season.actions.ts:generateTransferOfferAction",
  "function:features/transfer/services/transfer.service.ts:generateTransferOfferService"
);
calls(
  "function:actions/season.actions.ts:generateCupJourneyAction",
  "function:features/season/services/cup-journey.service.ts:generateDomesticCupJourneyService"
);
calls(
  "function:actions/season.actions.ts:generateCupJourneyAction",
  "function:features/season/services/cup-journey.service.ts:generateContinentalCupJourneyService"
);
calls(
  "function:actions/season.actions.ts:generateCupJourneyAction",
  "function:features/season/services/cup-journey.service.ts:generateNationalTeamJourneyService"
);
calls(
  "function:actions/season.actions.ts:evolvePlayerStatsAction",
  "function:features/player/services/stats-evolution.service.ts:evolvePlayerStatsService"
);
calls(
  "function:features/career/services/career-setup.service.ts:startPlayerCareerService",
  "function:lib/name-gen.ts:generateFictionalName"
);
calls(
  "function:features/career/services/career-setup.service.ts:startPlayerCareerService",
  "function:lib/wheel-engine/spin-resolver.ts:resolveRandom"
);
calls(
  "function:features/career/services/career-setup.service.ts:startPlayerCareerService",
  "function:lib/wheel-engine/spin-resolver.ts:resolveRandomInt"
);
calls(
  "function:features/player/services/stats-evolution.service.ts:evolvePlayerStatsService",
  "function:lib/wheel-engine/weight-calculator.ts:calculateOvrByPosition"
);
calls(
  "function:features/season/services/cup-journey.service.ts:generateCupScore",
  "function:lib/wheel-engine/spin-resolver.ts:resolveRandomInt"
);
calls(
  "function:features/season/services/cup-journey.service.ts:generateCupScore",
  "function:lib/wheel-engine/spin-resolver.ts:resolveRandom"
);
calls(
  "function:features/season/services/table-simulator.service.ts:simulateDynamicLeagueTableService",
  "function:lib/wheel-engine/spin-resolver.ts:resolveRandomFloat"
);
calls(
  "function:features/season/services/table-simulator.service.ts:simulateDynamicLeagueTableService",
  "function:lib/wheel-engine/spin-resolver.ts:resolveRandomInt"
);
calls(
  "function:features/transfer/services/transfer.service.ts:generateTransferOfferService",
  "function:lib/wheel-engine/spin-resolver.ts:resolveRandom"
);
calls(
  "function:features/transfer/services/transfer.service.ts:generateTransferOfferService",
  "function:lib/wheel-engine/spin-resolver.ts:resolveRandomInt"
);
calls(
  "function:features/wheel/hooks/useStatEvolutionFlow.ts:useStatEvolutionFlow",
  "function:actions/season.actions.ts:generateTransferOfferAction"
);
calls(
  "function:features/wheel/hooks/useStatEvolutionFlow.ts:useStatEvolutionFlow",
  "function:actions/season.actions.ts:evolvePlayerStatsAction"
);
calls(
  "function:lib/name-gen.ts:generateFictionalName",
  "function:lib/wheel-engine/spin-resolver.ts:resolveRandomInt"
);

addEdge({
  source: "file:features/wheel/hooks/useStatEvolutionFlow.ts",
  target: "file:actions/season.actions.ts",
  type: "depends_on",
  direction: "forward",
  weight: 0.6,
});

const ids = new Set();
for (const n of out.nodes) {
  if (ids.has(n.id)) throw new Error("dup " + n.id);
  ids.add(n.id);
}
for (const e of out.edges) {
  if (e.source === e.target) throw new Error("self " + e.source);
}

fs.mkdirSync("D:/road-to-glory/.ua/intermediate", { recursive: true });
fs.writeFileSync(
  "D:/road-to-glory/.ua/intermediate/batch-2.json",
  JSON.stringify(out, null, 2)
);
console.log(
  JSON.stringify({
    nodes: out.nodes.length,
    edges: out.edges.length,
    imports: importCount,
    files: 11,
  })
);
