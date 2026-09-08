-- Reusable development fixture for manually testing the Ballon d'Or wheels.
-- It is not attached to a user. The dev-only action clones it into the
-- authenticated user's own GameSession, so no user id is hard-coded here.

CREATE TABLE IF NOT EXISTS "career_test_fixtures" (
    "id" TEXT NOT NULL,
    "scenario" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "gameName" TEXT NOT NULL,
    "formation" TEXT NOT NULL,
    "slotIndex" INTEGER NOT NULL,
    "playerState" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "career_test_fixtures_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "career_test_fixtures_scenario_key"
  ON "career_test_fixtures"("scenario");

INSERT INTO "career_test_fixtures" (
    "id",
    "scenario",
    "displayName",
    "gameName",
    "formation",
    "slotIndex",
    "playerState"
)
VALUES (
    'ballon_dor_cm_nugu_v1',
    'ballon_dor_cm',
    'Ballon d''Or — CM đủ điều kiện',
    'Nugu',
    '4-4-2',
    6,
    $$
    {
      "name": "Nugu Ballon",
      "nationality": "Germany",
      "position": "CM",
      "height": 180,
      "weight": 75,
      "preferredFoot": "Right",
      "debutAge": 21,
      "retireAge": 31,
      "careerLengthYears": 10,
      "debutOvr": 90,
      "peakOvr": 96,
      "cardRarity": "legendary",
      "currentContinentalCup": "UCL",
      "contractYearsTotal": 3,
      "contractYearsRemaining": 2,
      "currentWageAnnual": 7200,
      "marketValue": 120000,
      "isUnemployed": false,
      "walletBalance": 0,
      "influenceScore": 86,
      "currentAge": 25,
      "currentStep": "ballon_dor_nomination",
      "currentWheel": "career",
      "checkpointVersion": 2,
      "revision": 0,
      "clubId": "real_madrid",
      "statsTimeline": [
        {
          "age": 25,
          "ovr": 96,
          "pac": 96,
          "sho": 94,
          "pas": 99,
          "dri": 95,
          "def": 91,
          "phy": 93,
          "marketValue": 120000,
          "positionWeightedRating": 96,
          "effectivePositionOvr": 96,
          "apps": 42,
          "goals": 18,
          "assists": 22,
          "cleanSheets": 12,
          "matchRating": 8.65
        }
      ],
      "clubStints": [
        {
          "clubId": "real_madrid",
          "clubName": "Real Madrid",
          "leagueId": "ESP1",
          "leagueName": "La Liga",
          "startAge": 21,
          "endAge": 25,
          "yearsAtClub": 5,
          "ovrAtJoining": 90,
          "ovrAtLeaving": 96
        }
      ],
      "events": [
        {
          "type": "test_fixture",
          "label": "Fixture kiểm thử Ballon d'Or",
          "age": 25,
          "clubId": "real_madrid",
          "nationality": "Germany"
        }
      ],
      "hiddenStats": {
        "luckRating": 20,
        "professionalism": 20,
        "personality": "Professional"
      },
      "achievements": {
        "ballonDor": 0,
        "trophies": [],
        "seasonAwards": []
      },
      "seasonHistory": {
        "21": {
          "age": 21,
          "clubName": "Real Madrid",
          "leagueName": "La Liga",
          "leagueId": "ESP1",
          "ovr": 90,
          "standing": 2,
          "domesticCup": "Semi-Finals",
          "continentalCup": { "type": "UCL", "result": "Quarter-Finals" },
          "nationalTeam": null,
          "apps": 35,
          "goals": 6,
          "assists": 10,
          "cleanSheets": 8,
          "matchRating": 7.65
        },
        "22": {
          "age": 22,
          "clubName": "Real Madrid",
          "leagueName": "La Liga",
          "leagueId": "ESP1",
          "ovr": 92,
          "standing": 1,
          "domesticCup": "Winner",
          "continentalCup": { "type": "UCL", "result": "Semi-Finals" },
          "nationalTeam": null,
          "apps": 38,
          "goals": 10,
          "assists": 15,
          "cleanSheets": 9,
          "matchRating": 8.05
        },
        "23": {
          "age": 23,
          "clubName": "Real Madrid",
          "leagueName": "La Liga",
          "leagueId": "ESP1",
          "ovr": 94,
          "standing": 1,
          "domesticCup": "Winner",
          "continentalCup": { "type": "UCL", "result": "Winner" },
          "nationalTeam": null,
          "apps": 41,
          "goals": 14,
          "assists": 19,
          "cleanSheets": 11,
          "matchRating": 8.35
        },
        "24": {
          "age": 24,
          "clubName": "Real Madrid",
          "leagueName": "La Liga",
          "leagueId": "ESP1",
          "ovr": 95,
          "standing": 1,
          "domesticCup": "Runner-Up",
          "continentalCup": { "type": "UCL", "result": "Semi-Finals" },
          "nationalTeam": {
            "type": "UEFA Euro",
            "callup": "Được triệu tập",
            "result": "Quarter-Finals"
          },
          "apps": 40,
          "goals": 16,
          "assists": 20,
          "cleanSheets": 11,
          "matchRating": 8.45
        },
        "25": {
          "age": 25,
          "clubName": "Real Madrid",
          "leagueName": "La Liga",
          "leagueId": "ESP1",
          "ovr": 96,
          "standing": 1,
          "domesticCup": "Winner",
          "continentalCup": { "type": "UCL", "result": "Winner" },
          "nationalTeam": null,
          "apps": 42,
          "goals": 18,
          "assists": 22,
          "cleanSheets": 12,
          "matchRating": 8.65,
          "ballonDorResult": null
        }
      },
      "walletLedger": [],
      "shopInventory": [],
      "seasonRuntimeState": {
        "standingResult": 1,
        "domesticCupResult": "Winner",
        "continentalCupResult": "Winner",
        "ballonDorNominationWeight": 100,
        "ballonDorRankWeights": [100, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        "lastWheel": { "stepKey": "season_stats", "result": "fixture_ready" }
      }
    }
    $$::jsonb
)
ON CONFLICT ("id") DO UPDATE SET
  "scenario" = EXCLUDED."scenario",
  "displayName" = EXCLUDED."displayName",
  "gameName" = EXCLUDED."gameName",
  "formation" = EXCLUDED."formation",
  "slotIndex" = EXCLUDED."slotIndex",
  "playerState" = EXCLUDED."playerState",
  "updatedAt" = CURRENT_TIMESTAMP;
