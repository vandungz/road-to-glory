import assert from "node:assert/strict";
import { getPerAppRates } from "@/lib/season-stat-rates";
import { rollCompetitionOutput } from "@/features/season/services/season-simulator-calculations";

function seededSource(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const fieldLow = { pac: 45, sho: 45, pas: 45, dri: 45, def: 45, phy: 45 };
const fieldHigh = { pac: 95, sho: 95, pas: 95, dri: 95, def: 95, phy: 95 };
const gkStats = { div: 85, han: 85, kic: 85, ref: 85, spd: 75, pos: 90 };

const lowRates = getPerAppRates("ST", 78, "league", fieldLow);
const highRates = getPerAppRates("ST", 78, "league", fieldHigh);
assert.ok(highRates.goals > lowRates.goals, "ST SHO/PAC/DRI must affect goal rate");
assert.ok(highRates.assists > lowRates.assists, "ST PAS/DRI must affect assist rate");

const cbBase = getPerAppRates("CB", 78, "league", fieldLow);
const cbAerial = getPerAppRates("CB", 78, "league", {
  ...fieldLow,
  phy: 95,
  def: 95,
  sho: 95,
});
assert.ok(cbAerial.goals > cbBase.goals, "CB aerial/set-piece proxy must affect goals");

const fullbackBase = getPerAppRates("LB", 78, "league", fieldLow);
const fullbackCreator = getPerAppRates("LB", 78, "league", {
  ...fieldLow,
  pas: 95,
  pac: 95,
  dri: 95,
});
assert.ok(fullbackCreator.assists > fullbackBase.assists, "LB PAS/PAC/DRI proxy must affect assists");

const cdmBase = getPerAppRates("CDM", 78, "league", fieldLow);
const cdmDefensive = getPerAppRates("CDM", 78, "league", {
  ...fieldLow,
  def: 95,
  phy: 95,
  pas: 95,
});
assert.ok(cdmDefensive.cleanSheets > cdmBase.cleanSheets, "CDM DEF/PHY/PAS proxy must affect clean sheets");

const clubAttackLow = rollCompetitionOutput("ST", 78, 1, 100, "league", fieldHigh, undefined, () => 0.5);
const clubAttackHigh = rollCompetitionOutput("ST", 78, 5, 100, "league", fieldHigh, undefined, () => 0.5);
assert.ok(clubAttackHigh.goals > clubAttackLow.goals, "club attacking context must have a bounded effect");
const nationalLow = rollCompetitionOutput("ST", 78, 1, 100, "national", fieldHigh, undefined, () => 0.5);
const nationalHigh = rollCompetitionOutput("ST", 78, 5, 100, "national", fieldHigh, undefined, () => 0.5);
assert.equal(nationalHigh.goals, nationalLow.goals, "club prestige must not affect national attacking output");

const positions = ["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST", "LM", "RM"];
for (const position of positions) {
  const currentStats = position === "GK" ? gkStats : fieldHigh;
  for (let seed = 1; seed <= 500; seed += 1) {
    const stats = rollCompetitionOutput(
      position.toLowerCase(),
      78,
      3,
      34,
      "league",
      currentStats,
      20,
      seededSource(seed),
    );
    assert.ok(stats.goals >= 0 && stats.goals <= 34, `${position}: goals outside apps`);
    assert.ok(stats.assists >= 0 && stats.assists <= 34, `${position}: assists outside apps`);
    assert.ok(stats.cleanSheets >= 0 && stats.cleanSheets <= 20, `${position}: clean sheets outside team bound`);
    const gaCap = position === "ST" ? Math.floor(34 * 1.5) : Math.max(34, Math.floor(34 * 1.25));
    assert.ok(stats.goals + stats.assists <= gaCap, `${position}: G+A cap violated`);
  }
}

console.log("season stat rates checks passed");
