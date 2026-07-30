const fs = require("fs");
const path = require("path");

const extract = require("./ua-file-extract-results-1.json");
const input = require("./ua-file-analyzer-input-1.json");
const bi = input.batchImportData;

const META = {
  "features/season/services/season-simulator.service.ts": {
    summary:
      "Simulates a full player season including league apps, goals, assists, cups, trophies, and Ballon d'Or eligibility from OVR, position, and club prestige.",
    tags: ["service", "season-simulation", "probability", "awards"],
    complexity: "complex",
    languageNotes:
      "Deterministic RNG only via resolveRandom/resolveRandomFloat from spin-resolver.",
  },
  "features/wheel/components/SeasonProfile.tsx": {
    summary:
      "Career season profile UI showing year-by-year competition results with selectable age and clickable status rows that open stats modals.",
    tags: ["component", "season", "ui", "career"],
    complexity: "complex",
  },
  "features/wheel/components/SeasonStatsModal.tsx": {
    summary:
      "Modal presenting detailed season statistics across league, domestic cup, continental, and national competitions for a selected year.",
    tags: ["component", "modal", "season", "stats"],
    complexity: "moderate",
  },
  "features/wheel/hooks/useCareerStats.ts": {
    summary:
      "Manages career player state including club, OVR, season records, transfers, and next-season progression with continental cup sync.",
    tags: ["hook", "career", "state-management", "season"],
    complexity: "complex",
    languageNotes:
      "Enforces setClubAndContinental invariant when changing clubs.",
  },
  "features/wheel/hooks/useCareerWheelItems.ts": {
    summary:
      "Builds weighted wheel item pools for each career sub-step based on age progress, growth tiers, club standing, and competition context.",
    tags: ["hook", "wheel", "weights", "career"],
    complexity: "complex",
  },
  "features/wheel/hooks/useCompetitionFlow.ts": {
    summary:
      "Orchestrates competition spin flow: triggers season simulation, league/cup generation, and advances career sub-steps after spin completion.",
    tags: ["hook", "competition", "season", "wheel"],
    complexity: "complex",
  },
  "features/wheel/hooks/useDraftDrum.ts": {
    summary:
      "Top-level career drum hook composing setup, stats, wheel items, competition, and stat evolution flows into the draft/career UI orchestration.",
    tags: ["hook", "orchestration", "career", "entry-point"],
    complexity: "complex",
  },
  "features/wheel/hooks/useSetupStage.ts": {
    summary:
      "Handles player creation setup spins for nationality, physique, debut stats, league, and club using weighted pools from the wheel engine.",
    tags: ["hook", "setup", "wheel", "draft"],
    complexity: "moderate",
  },
  "features/wheel/lib/career-wheel-resolver.ts": {
    summary:
      "Resolves career wheel pools and outcome values per sub-step, combining growth gates, standing pools, and competition labels.",
    tags: ["utility", "wheel", "resolver", "career"],
    complexity: "complex",
  },
  "features/wheel/lib/simulation-helpers.ts": {
    summary:
      "Pure helpers for continental qualification, standing pools, growth/magnitude tiers, age progress, and cup naming used across career simulation.",
    tags: ["utility", "simulation", "probability", "helpers"],
    complexity: "complex",
  },
  "features/wheel/stores/useWheelUiStore.ts": {
    summary:
      "Zustand store for wheel UI state such as active modal, career sub-step, spin animation phase, and selector index.",
    tags: ["store", "ui-state", "zustand", "wheel"],
    complexity: "moderate",
  },
  "lib/wheel-engine/weight-calculator.ts": {
    summary:
      "Core weight pools and OVR formulas for leagues, clubs, debut stats, nationality tiers, physique modifiers, and position-based ratings.",
    tags: ["wheel-engine", "weights", "ovr", "probability"],
    complexity: "complex",
    languageNotes:
      "Pure TypeScript with no Math.random; delegates randomness to spin-resolver.",
  },
};

const FN_META = {
  "features/season/services/season-simulator.service.ts:calcAttackStats": {
    summary:
      "Computes goals and assists from position, OVR, play factor, and appearances using weighted random rolls.",
    tags: ["stats", "goals", "simulation"],
    complexity: "moderate",
  },
  "features/season/services/season-simulator.service.ts:calcCleanSheets": {
    summary:
      "Estimates clean sheets for defensive and GK positions from OVR, club prestige, and match load.",
    tags: ["stats", "defense", "simulation"],
    complexity: "moderate",
  },
  "features/season/services/season-simulator.service.ts:calcRating": {
    summary:
      "Derives average match rating from position, OVR, luck, competition stats, and league standing bonus.",
    tags: ["rating", "simulation"],
    complexity: "moderate",
  },
  "features/season/services/season-simulator.service.ts:calcTrophyScore": {
    summary:
      "Scores trophy haul across league, domestic cup, continental, and national results weighted by club prestige.",
    tags: ["trophies", "awards"],
    complexity: "moderate",
  },
  "features/season/services/season-simulator.service.ts:calcBallonDorEligibility": {
    summary:
      "Evaluates Ballon d'Or nomination and rank weights from OVR, goals, rating, and major trophies.",
    tags: ["ballon-dor", "awards"],
    complexity: "complex",
  },
  "features/season/services/season-simulator.service.ts:calcRankTrophyBonus": {
    summary:
      "Adds rank-score bonuses for continental and national cup success plus league standing prestige.",
    tags: ["awards", "ranking"],
    complexity: "simple",
  },
  "features/season/services/season-simulator.service.ts:simulatePlayerSeasonService": {
    summary:
      "Main season simulation entry that aggregates league/cup stats, ratings, trophies, and award eligibility into a season result.",
    tags: ["service", "entry-point", "season"],
    complexity: "complex",
  },
  "features/wheel/components/SeasonProfile.tsx:SeasonProfile": {
    summary:
      "Renders the season timeline and competition status grid for the selected career age.",
    tags: ["component", "ui", "season"],
    complexity: "complex",
  },
  "features/wheel/components/SeasonProfile.tsx:StatusRow": {
    summary:
      "Clickable competition status row showing result label and champion styling.",
    tags: ["component", "ui"],
    complexity: "moderate",
  },
  "features/wheel/components/SeasonProfile.tsx:StatusRowInactive": {
    summary:
      "Inactive competition row with a note when the player did not enter that competition.",
    tags: ["component", "ui"],
    complexity: "simple",
  },
  "features/wheel/components/SeasonStatsModal.tsx:CompRow": {
    summary:
      "Displays per-competition apps, goals, assists, and rating inside the season stats modal.",
    tags: ["component", "stats"],
    complexity: "moderate",
  },
  "features/wheel/components/SeasonStatsModal.tsx:SeasonStatsModal": {
    summary:
      "Full-screen modal summarizing year simulation results across all competitions.",
    tags: ["component", "modal", "season"],
    complexity: "complex",
  },
  "features/wheel/hooks/useCareerStats.ts:useCareerStats": {
    summary:
      "Career stats hook owning player persistence, club/continental sync, season records, and next-season transitions.",
    tags: ["hook", "career", "state"],
    complexity: "complex",
  },
  "features/wheel/hooks/useCareerWheelItems.ts:useCareerWheelItems": {
    summary:
      "Memoizes and refreshes wheel item lists for the current career sub-step and player context.",
    tags: ["hook", "wheel", "items"],
    complexity: "complex",
  },
  "features/wheel/hooks/useCompetitionFlow.ts:useCompetitionFlow": {
    summary:
      "Competition flow hook wiring spin completion to server actions and season result UI updates.",
    tags: ["hook", "competition", "flow"],
    complexity: "complex",
  },
  "features/wheel/hooks/useDraftDrum.ts:useDraftDrum": {
    summary:
      "Composes all career-stage hooks and exposes handlers for setup, spins, and career start.",
    tags: ["hook", "orchestration", "career"],
    complexity: "complex",
  },
  "features/wheel/hooks/useSetupStage.ts:useSetupStage": {
    summary:
      "Setup-stage hook managing draft spin steps and weighted outcome application for new players.",
    tags: ["hook", "setup", "draft"],
    complexity: "moderate",
  },
  "features/wheel/lib/career-wheel-resolver.ts:getCareerWheelPoolAndValue": {
    summary:
      "Selects the weighted pool for a career sub-step and resolves a concrete outcome value.",
    tags: ["resolver", "wheel", "outcome"],
    complexity: "complex",
  },
  "features/wheel/lib/simulation-helpers.ts:calculateContinentalQualification": {
    summary:
      "Maps league standing and cup results to next-season continental cup qualification by confederation.",
    tags: ["continental", "qualification"],
    complexity: "moderate",
  },
  "features/wheel/lib/simulation-helpers.ts:getContinentalCupLabel": {
    summary: "Returns a display label for a continental cup type string.",
    tags: ["label", "continental"],
    complexity: "simple",
  },
  "features/wheel/lib/simulation-helpers.ts:getSeasonYearString": {
    summary: "Formats a season year label from current age and debut age.",
    tags: ["formatting", "season"],
    complexity: "simple",
  },
  "features/wheel/lib/simulation-helpers.ts:getStandingWheelPool": {
    summary:
      "Builds weighted league-standing outcome pool from prestige, OVR, apps, and prior standing.",
    tags: ["weights", "standing", "wheel"],
    complexity: "moderate",
  },
  "features/wheel/lib/simulation-helpers.ts:getGrowthTier": {
    summary:
      "Maps a rating value to a discrete growth tier used by gate and pool helpers.",
    tags: ["growth", "tier"],
    complexity: "simple",
  },
  "features/wheel/lib/simulation-helpers.ts:getIncreaseGateWeight": {
    summary:
      "Returns the weight for rolling a stat increase at a given growth tier.",
    tags: ["growth", "weights"],
    complexity: "simple",
  },
  "features/wheel/lib/simulation-helpers.ts:getDecreaseGateWeight": {
    summary:
      "Returns the weight for rolling a stat decrease at a given growth tier.",
    tags: ["growth", "weights"],
    complexity: "simple",
  },
  "features/wheel/lib/simulation-helpers.ts:getCountPool": {
    summary:
      "Provides weighted counts of how many stats change for a growth tier and direction.",
    tags: ["growth", "weights", "pool"],
    complexity: "simple",
  },
  "features/wheel/lib/simulation-helpers.ts:getMagnitudePool": {
    summary:
      "Provides weighted magnitude steps for a single stat change at a growth tier.",
    tags: ["growth", "weights", "pool"],
    complexity: "simple",
  },
  "features/wheel/lib/simulation-helpers.ts:getMagnitudeTierForDirection": {
    summary:
      "Chooses magnitude tier based on current rating and whether the change is an increase.",
    tags: ["growth", "tier"],
    complexity: "simple",
  },
  "features/wheel/lib/simulation-helpers.ts:getCareerProgress": {
    summary:
      "Computes normalized career progress from age, debut age, and career length.",
    tags: ["career", "progress"],
    complexity: "simple",
  },
  "features/wheel/lib/simulation-helpers.ts:getAgeProgressThresholds": {
    summary:
      "Returns young/peak age progress thresholds by player position.",
    tags: ["career", "age", "position"],
    complexity: "simple",
  },
  "features/wheel/lib/simulation-helpers.ts:getGrowthBoost": {
    summary:
      "Derives a growth boost factor when career progress is still in the young window.",
    tags: ["growth", "boost"],
    complexity: "simple",
  },
  "features/wheel/lib/simulation-helpers.ts:blendPools": {
    summary: "Linearly blends two weighted pools by interpolation factor t.",
    tags: ["weights", "pool", "utility"],
    complexity: "simple",
  },
  "features/wheel/lib/simulation-helpers.ts:getCountPoolBoosted": {
    summary:
      "Returns a count pool optionally shifted upward by growth boost.",
    tags: ["growth", "weights", "boost"],
    complexity: "simple",
  },
  "features/wheel/lib/simulation-helpers.ts:getMagnitudePoolBoosted": {
    summary:
      "Returns a magnitude pool optionally shifted upward by growth boost.",
    tags: ["growth", "weights", "boost"],
    complexity: "simple",
  },
  "features/wheel/lib/simulation-helpers.ts:getDomesticCupName": {
    summary:
      "Maps league name to the corresponding domestic cup competition name.",
    tags: ["label", "cup", "league"],
    complexity: "simple",
  },
  "lib/wheel-engine/weight-calculator.ts:getStatKeys": {
    summary:
      "Returns the ordered stat key list for outfield or goalkeeper positions.",
    tags: ["stats", "position"],
    complexity: "simple",
  },
  "lib/wheel-engine/weight-calculator.ts:getMainStatsByPosition": {
    summary:
      "Returns the primary contributing stats for OVR by position group.",
    tags: ["stats", "ovr", "position"],
    complexity: "simple",
  },
  "lib/wheel-engine/weight-calculator.ts:getStatLabel": {
    summary:
      "Formats a human-readable label for a position-specific stat key.",
    tags: ["label", "stats"],
    complexity: "simple",
  },
  "lib/wheel-engine/weight-calculator.ts:getDefaultStats": {
    summary: "Builds a default zeroed stats object for the given position.",
    tags: ["stats", "defaults"],
    complexity: "simple",
  },
  "lib/wheel-engine/weight-calculator.ts:getLeagueWeights": {
    summary:
      "Assigns draft league weights boosted by nationality region affinity.",
    tags: ["weights", "league", "draft"],
    complexity: "moderate",
  },
  "lib/wheel-engine/weight-calculator.ts:getClubWeights": {
    summary: "Assigns draft club weights from club prestige and tier.",
    tags: ["weights", "club", "draft"],
    complexity: "simple",
  },
  "lib/wheel-engine/weight-calculator.ts:generateContinuousWeights": {
    summary:
      "Generates a continuous integer weight pool between min and max inclusive.",
    tags: ["weights", "pool", "utility"],
    complexity: "simple",
  },
  "lib/wheel-engine/weight-calculator.ts:getDebutStatWeights": {
    summary:
      "Builds per-stat debut weight distributions shaped by position and stat role.",
    tags: ["weights", "debut", "stats"],
    complexity: "complex",
  },
  "lib/wheel-engine/weight-calculator.ts:getNationalTier": {
    summary: "Maps nationality to a national-team strength tier.",
    tags: ["nationality", "tier"],
    complexity: "simple",
  },
  "lib/wheel-engine/weight-calculator.ts:getNationalContinentalCup": {
    summary:
      "Returns the continental cup type associated with a nationality region.",
    tags: ["continental", "nationality"],
    complexity: "moderate",
  },
  "lib/wheel-engine/weight-calculator.ts:calculateOvrByPosition": {
    summary:
      "Computes overall rating from position-weighted stats using the official OVR formula.",
    tags: ["ovr", "formula", "stats"],
    complexity: "moderate",
  },
  "lib/wheel-engine/weight-calculator.ts:getHeightWeights": {
    summary:
      "Returns weighted height outcomes for a position during physique setup.",
    tags: ["physique", "weights"],
    complexity: "simple",
  },
  "lib/wheel-engine/weight-calculator.ts:getWeightRangeFromHeight": {
    summary:
      "Derives a plausible weight range in kg from height in centimeters.",
    tags: ["physique", "utility"],
    complexity: "simple",
  },
  "lib/wheel-engine/weight-calculator.ts:getWeightWeights": {
    summary: "Builds weighted body-weight outcomes constrained by height.",
    tags: ["physique", "weights"],
    complexity: "simple",
  },
  "lib/wheel-engine/weight-calculator.ts:getPhysiqueModifier": {
    summary:
      "Computes position-aware physique modifiers from height and weight.",
    tags: ["physique", "modifier"],
    complexity: "moderate",
  },
  "lib/wheel-engine/weight-calculator.ts:applyPhysiqueModifier": {
    summary:
      "Applies physique modifiers onto a stats object and returns the updated stats.",
    tags: ["physique", "stats"],
    complexity: "simple",
  },
};

function keepFn(f, fn) {
  const lines = fn.endLine - fn.startLine + 1;
  const exp = (f.exports || []).some((e) => e.name === fn.name);
  return exp || lines >= 10;
}

const PARENT = {
  "features/season/services/season-simulator.service.ts":
    "simulatePlayerSeasonService",
  "features/wheel/components/SeasonProfile.tsx": "SeasonProfile",
  "features/wheel/components/SeasonStatsModal.tsx": "SeasonStatsModal",
  "features/wheel/hooks/useCareerStats.ts": "useCareerStats",
  "features/wheel/hooks/useCareerWheelItems.ts": "useCareerWheelItems",
  "features/wheel/hooks/useCompetitionFlow.ts": "useCompetitionFlow",
  "features/wheel/hooks/useDraftDrum.ts": "useDraftDrum",
  "features/wheel/hooks/useSetupStage.ts": "useSetupStage",
  "features/wheel/lib/career-wheel-resolver.ts": "getCareerWheelPoolAndValue",
};

const CALL_TARGETS = {
  resolveRandom: "function:lib/wheel-engine/spin-resolver.ts:resolveRandom",
  resolveRandomFloat:
    "function:lib/wheel-engine/spin-resolver.ts:resolveRandomFloat",
  resolveRandomInt:
    "function:lib/wheel-engine/spin-resolver.ts:resolveRandomInt",
  resolveWeightedOutcome:
    "function:lib/wheel-engine/spin-resolver.ts:resolveWeightedOutcome",
  calculateContinentalQualification:
    "function:features/wheel/lib/simulation-helpers.ts:calculateContinentalQualification",
  getContinentalCupLabel:
    "function:features/wheel/lib/simulation-helpers.ts:getContinentalCupLabel",
  getSeasonYearString:
    "function:features/wheel/lib/simulation-helpers.ts:getSeasonYearString",
  getStandingWheelPool:
    "function:features/wheel/lib/simulation-helpers.ts:getStandingWheelPool",
  getGrowthTier:
    "function:features/wheel/lib/simulation-helpers.ts:getGrowthTier",
  getIncreaseGateWeight:
    "function:features/wheel/lib/simulation-helpers.ts:getIncreaseGateWeight",
  getDecreaseGateWeight:
    "function:features/wheel/lib/simulation-helpers.ts:getDecreaseGateWeight",
  getCountPool:
    "function:features/wheel/lib/simulation-helpers.ts:getCountPool",
  getMagnitudePool:
    "function:features/wheel/lib/simulation-helpers.ts:getMagnitudePool",
  getMagnitudeTierForDirection:
    "function:features/wheel/lib/simulation-helpers.ts:getMagnitudeTierForDirection",
  getCareerProgress:
    "function:features/wheel/lib/simulation-helpers.ts:getCareerProgress",
  getAgeProgressThresholds:
    "function:features/wheel/lib/simulation-helpers.ts:getAgeProgressThresholds",
  getGrowthBoost:
    "function:features/wheel/lib/simulation-helpers.ts:getGrowthBoost",
  getCountPoolBoosted:
    "function:features/wheel/lib/simulation-helpers.ts:getCountPoolBoosted",
  getMagnitudePoolBoosted:
    "function:features/wheel/lib/simulation-helpers.ts:getMagnitudePoolBoosted",
  getDomesticCupName:
    "function:features/wheel/lib/simulation-helpers.ts:getDomesticCupName",
  getNationalContinentalCup:
    "function:lib/wheel-engine/weight-calculator.ts:getNationalContinentalCup",
  getLeagueWeights:
    "function:lib/wheel-engine/weight-calculator.ts:getLeagueWeights",
  getClubWeights:
    "function:lib/wheel-engine/weight-calculator.ts:getClubWeights",
  getDebutStatWeights:
    "function:lib/wheel-engine/weight-calculator.ts:getDebutStatWeights",
  getMainStatsByPosition:
    "function:lib/wheel-engine/weight-calculator.ts:getMainStatsByPosition",
  getHeightWeights:
    "function:lib/wheel-engine/weight-calculator.ts:getHeightWeights",
  getWeightWeights:
    "function:lib/wheel-engine/weight-calculator.ts:getWeightWeights",
  getCareerWheelPoolAndValue:
    "function:features/wheel/lib/career-wheel-resolver.ts:getCareerWheelPoolAndValue",
  saveCareerPlayer: "function:actions/player.actions.ts:saveCareerPlayer",
  simulatePlayerSeasonAction:
    "function:actions/season.actions.ts:simulatePlayerSeasonAction",
  generateLeagueTableAction:
    "function:actions/season.actions.ts:generateLeagueTableAction",
  generateCupJourneyAction:
    "function:actions/season.actions.ts:generateCupJourneyAction",
  startPlayerCareerAction:
    "function:actions/season.actions.ts:startPlayerCareerAction",
  getFlagEmoji: "function:types/squad.ts:getFlagEmoji",
};

const HOOK_DEPS = new Set([
  "useWheelUiStore",
  "useCareerStats",
  "useCareerWheelItems",
  "useCompetitionFlow",
  "useSetupStage",
  "useStatEvolutionFlow",
]);

const HOOK_DEP_FILES = {
  useWheelUiStore: "features/wheel/stores/useWheelUiStore.ts",
  useCareerStats: "features/wheel/hooks/useCareerStats.ts",
  useCareerWheelItems: "features/wheel/hooks/useCareerWheelItems.ts",
  useCompetitionFlow: "features/wheel/hooks/useCompetitionFlow.ts",
  useSetupStage: "features/wheel/hooks/useSetupStage.ts",
  useStatEvolutionFlow: "features/wheel/hooks/useStatEvolutionFlow.ts",
};

const nodes = [];
const edges = [];

for (const f of extract.results) {
  const meta = META[f.path];
  const name = path.basename(f.path);
  const node = {
    id: `file:${f.path}`,
    type: "file",
    name,
    filePath: f.path,
    summary: meta.summary,
    tags: meta.tags,
    complexity: meta.complexity,
  };
  if (meta.languageNotes) node.languageNotes = meta.languageNotes;
  nodes.push(node);

  for (const fn of f.functions || []) {
    if (!keepFn(f, fn)) continue;
    const key = `${f.path}:${fn.name}`;
    const fm = FN_META[key] || {
      summary: `Function ${fn.name} in ${name}.`,
      tags: ["function"],
      complexity:
        fn.endLine - fn.startLine + 1 > 50
          ? "complex"
          : fn.endLine - fn.startLine + 1 > 15
            ? "moderate"
            : "simple",
    };
    const isExp = (f.exports || []).some((e) => e.name === fn.name);
    nodes.push({
      id: `function:${f.path}:${fn.name}`,
      type: "function",
      name: fn.name,
      filePath: f.path,
      lineRange: [fn.startLine, fn.endLine],
      summary: fm.summary,
      tags: fm.tags,
      complexity: fm.complexity,
    });
    edges.push({
      source: `file:${f.path}`,
      target: `function:${f.path}:${fn.name}`,
      type: "contains",
      direction: "forward",
      weight: 1.0,
    });
    if (isExp) {
      edges.push({
        source: `file:${f.path}`,
        target: `function:${f.path}:${fn.name}`,
        type: "exports",
        direction: "forward",
        weight: 0.8,
      });
    }
  }
}

let importCount = 0;
for (const [fp, targets] of Object.entries(bi)) {
  for (const t of targets) {
    edges.push({
      source: `file:${fp}`,
      target: `file:${t}`,
      type: "imports",
      direction: "forward",
      weight: 0.7,
    });
    importCount++;
  }
}

const nodeIds = new Set(nodes.map((n) => n.id));
const byPath = Object.fromEntries(extract.results.map((r) => [r.path, r]));

function resolveCaller(filePath, caller) {
  const exact = `function:${filePath}:${caller}`;
  if (nodeIds.has(exact)) return exact;
  const parent = PARENT[filePath];
  if (parent) return `function:${filePath}:${parent}`;
  return null;
}

function targetPathOf(targetId) {
  if (targetId.startsWith("file:")) return targetId.slice(5);
  const m = targetId.match(/^function:(.+):([^:]+)$/);
  return m ? m[1] : null;
}

const callSeen = new Set();
const depSeen = new Set();

for (const f of extract.results) {
  for (const c of f.callGraph || []) {
    if (HOOK_DEPS.has(c.callee)) {
      const tp = HOOK_DEP_FILES[c.callee];
      if (!tp || tp === f.path) continue;
      const key = `dep|${f.path}|${tp}`;
      if (depSeen.has(key)) continue;
      depSeen.add(key);
      edges.push({
        source: `file:${f.path}`,
        target: `file:${tp}`,
        type: "depends_on",
        direction: "forward",
        weight: 0.6,
      });
      continue;
    }

    const targetId = CALL_TARGETS[c.callee];
    if (!targetId) continue;
    const tp = targetPathOf(targetId);
    if (tp === f.path) continue;

    const sourceId = resolveCaller(f.path, c.caller);
    if (!sourceId) continue;

    const key = `${sourceId}|${targetId}`;
    if (callSeen.has(key)) continue;
    callSeen.add(key);
    edges.push({
      source: sourceId,
      target: targetId,
      type: "calls",
      direction: "forward",
      weight: 0.8,
    });
  }
}

// Internal calls among kept functions in season-simulator
for (const f of extract.results) {
  if (f.path !== "features/season/services/season-simulator.service.ts")
    continue;
  for (const c of f.callGraph || []) {
    const src = resolveCaller(f.path, c.caller);
    const tgt = `function:${f.path}:${c.callee}`;
    if (!src || !nodeIds.has(tgt) || src === tgt) continue;
    if (!nodeIds.has(src)) continue;
    const key = `int|${src}|${tgt}`;
    if (callSeen.has(key)) continue;
    callSeen.add(key);
    edges.push({
      source: src,
      target: tgt,
      type: "calls",
      direction: "forward",
      weight: 0.8,
    });
  }
}

console.log("nodes", nodes.length, "edges", edges.length, "imports", importCount);
console.log(
  "file nodes",
  nodes.filter((n) => n.type === "file").length
);
console.log(
  "function nodes",
  nodes.filter((n) => n.type === "function").length
);

const nodeCount = nodes.length;
const edgeCount = edges.length;
const outDir = path.join(__dirname, "..", "intermediate");
fs.mkdirSync(outDir, { recursive: true });

const neighborMap = {
  "lib/wheel-engine/spin-resolver.ts": true,
  "actions/season.actions.ts": true,
  "actions/player.actions.ts": true,
  "types/game.ts": true,
  "types/squad.ts": true,
  "features/wheel/hooks/useStatEvolutionFlow.ts": true,
  "features/wheel/components/DraftDrumScreen.tsx": true,
  "features/wheel/components/CareerActionsPanel.tsx": true,
  "features/wheel/components/SeasonResultModal.tsx": true,
  "features/player/services/stats-evolution.service.ts": true,
};

function validatePart(partNodes, partEdges, allBatchPaths) {
  const ids = new Set(partNodes.map((n) => n.id));
  const importTargets = new Set();
  for (const arr of Object.values(bi)) for (const p of arr) importTargets.add(p);
  const failures = [];
  for (const e of partEdges) {
    const okSource =
      ids.has(e.source) ||
      (e.source.startsWith("file:") &&
        (allBatchPaths.has(e.source.slice(5)) ||
          neighborMap[e.source.slice(5)] ||
          importTargets.has(e.source.slice(5))));
    if (!ids.has(e.source)) {
      // source must be in this part's nodes per Step C
      failures.push(`source missing in part: ${e.source} -> ${e.target} (${e.type})`);
      continue;
    }
    if (ids.has(e.target)) continue;
    if (e.target.startsWith("file:")) {
      const p = e.target.slice(5);
      if (allBatchPaths.has(p) || neighborMap[p] || importTargets.has(p)) continue;
      failures.push(`bad file target: ${e.target}`);
      continue;
    }
    if (e.target.startsWith("function:") || e.target.startsWith("class:")) {
      const m = e.target.match(/^(?:function|class):(.+):([^:]+)$/);
      if (m && (allBatchPaths.has(m[1]) || neighborMap[m[1]] || importTargets.has(m[1])))
        continue;
      // Allow cross-batch function targets from neighbor symbols / known CALL_TARGETS
      if (Object.values(CALL_TARGETS).includes(e.target)) continue;
      failures.push(`bad fn target: ${e.target}`);
      continue;
    }
    failures.push(`unknown target: ${e.target}`);
  }
  return failures;
}

const allBatchPaths = new Set(extract.results.map((r) => r.path));

if (nodeCount <= 60 && edgeCount <= 120) {
  const outPath = path.join(outDir, "batch-1.json");
  fs.writeFileSync(outPath, JSON.stringify({ nodes, edges }, null, 2));
  const fails = validatePart(nodes, edges, allBatchPaths);
  console.log("Wrote batch-1.json", fails.length ? fails.slice(0, 5) : "OK");
} else {
  const parts = Math.ceil(Math.max(nodeCount / 60, edgeCount / 120));
  const files = [...allBatchPaths].sort();
  const chunkSize = Math.ceil(files.length / parts);
  console.log("parts", parts, "chunkSize", chunkSize);

  let totalN = 0;
  let totalE = 0;
  for (let k = 0; k < parts; k++) {
    const partFiles = new Set(files.slice(k * chunkSize, (k + 1) * chunkSize));
    const partNodes = nodes.filter((n) => partFiles.has(n.filePath));
    const partIds = new Set(partNodes.map((n) => n.id));
    const partEdges = edges.filter((e) => partIds.has(e.source));
    const outPath = path.join(outDir, `batch-1-part-${k + 1}.json`);
    fs.writeFileSync(
      outPath,
      JSON.stringify({ nodes: partNodes, edges: partEdges }, null, 2)
    );
    const fails = validatePart(partNodes, partEdges, allBatchPaths);
    totalN += partNodes.length;
    totalE += partEdges.length;
    console.log(
      "Wrote",
      path.basename(outPath),
      "nodes",
      partNodes.length,
      "edges",
      partEdges.length,
      fails.length ? fails.slice(0, 8) : "OK"
    );
  }
  console.log("TOTAL", totalN, totalE);
}
