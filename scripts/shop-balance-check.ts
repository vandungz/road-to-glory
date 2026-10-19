import assert from "node:assert/strict";
import {
  getNationalCallupWeights,
} from "@/features/wheel/lib/simulation-helpers";
import { buildNationalCallupPool } from "@/features/wheel/lib/wheel-team-params";
import {
  getEffectiveMagnitudePool,
} from "@/features/wheel/lib/growth-balance";
import { getMagnitudePool, getMagnitudeTierForDirection } from "@/features/wheel/lib/growth-pools";
import {
  NATIONAL_CALLUP_WEIGHT_BONUS,
  SHOP_CATALOG,
  TRAINING_CAMP_RATING_BONUS,
  TRAINING_CAMP_STAT_BONUS,
  isShopItemAvailableForSeason,
} from "@/lib/shop-catalog";
import { simulatePlayerSeasonService } from "@/features/season/services/season-simulator.service";

const item = (id: string) => SHOP_CATALOG.find((entry) => entry.id === id)!;
assert.equal(item("training_camp").priceThousands, 1700);
assert.equal(item("appearance_pack").priceThousands, 400);
assert.equal(item("elite_development_program").priceThousands, 6000);
assert.equal(TRAINING_CAMP_RATING_BONUS, 0.8);
assert.equal(TRAINING_CAMP_STAT_BONUS, 5);

const callupBase = getNationalCallupWeights(75, 80, 1, 20, "CM");
const callupBoosted = buildNationalCallupPool({
  effPositionOvr: 75,
  prestige: 3,
  leagueSize: 20,
  apps: 30,
  priorStanding: null,
  luckRating: 10,
  playerNationality: "England",
  standingResult: 1,
  position: "CM",
  nationalCallupBoostActive: true,
});
assert.equal(callupBoosted[0].weight, Math.min(90, callupBase.wCall + NATIONAL_CALLUP_WEIGHT_BONUS));
assert.equal(callupBoosted.reduce((sum, entry) => sum + entry.weight, 0), 100);
assert.equal(isShopItemAvailableForSeason(item("national_callup_boost"), 20), true);
assert.equal(isShopItemAvailableForSeason(item("national_callup_boost"), 21), false);

const eliteBase = getMagnitudePool(getMagnitudeTierForDirection(7.0, true), true);
const elite = getEffectiveMagnitudePool({
  rating: 7.0,
  isIncrease: true,
  position: "ST",
  currentAge: 20,
  debutAge: 20,
  careerLength: 16,
  currentOvr: 70,
  eliteDevelopmentActive: true,
});
assert.deepEqual(elite.slice(0, 2).map((entry) => entry.weight), [12, 12]);
assert.equal(elite.reduce((sum, entry) => sum + entry.weight, 0), 100);
for (const value of [4, 5, 6]) {
  assert.ok(
    elite.find((entry) => entry.value === value)!.weight > eliteBase.find((entry) => entry.value === value)!.weight,
    `elite development must increase +${value} weight`,
  );
}

const clubs = Array.from({ length: 20 }, (_, index) => ({
  id: `club-${index}`,
  name: `Club ${index}`,
  prestige: 3,
}));
const simulate = (trainingCampActive: boolean) => simulatePlayerSeasonService({
  seasonId: `shop-balance-${trainingCampActive}`,
  playerId: "shop-balance-player",
  playerName: "Shop Balance Player",
  age: 20,
  ovr: 82,
  position: "ST",
  luckRating: 10,
  clubPrestige: 4,
  clubName: "Club 1",
  leagueName: "Test League",
  leagueClubsCount: clubs.length,
  leagueClubs: clubs,
  hasContinentalCup: false,
  playerNationality: "England",
  currentStats: { pac: 82, sho: 82, pas: 82, dri: 82, def: 60, phy: 82 },
  standingResult: 1,
  domesticCupResult: "Winner",
  trainingCampActive,
  randomSource: () => 0.5,
});
const withoutCamp = simulate(false);
const withCamp = simulate(true);
assert.equal(withCamp.goals - withoutCamp.goals, TRAINING_CAMP_STAT_BONUS);
assert.equal(withCamp.leagueStats.goals - withoutCamp.leagueStats.goals, TRAINING_CAMP_STAT_BONUS);

console.log("shop-balance-check: passed");
