-- Direct development data case for resuming the existing Nugu squad at the
-- Ballon d'Or nomination checkpoint. No route, action, or extra session is
-- created: the normal squad -> CM slot -> resume flow is the test entry point.

-- Remove the unused fixture registry created by the previous implementation.
-- It contained only generated test data and was never part of game state.
DROP TABLE IF EXISTS "career_test_fixtures";

DO $fixture$
DECLARE
  target_session_id UUID;
  matching_sessions INTEGER;
  fixture_player_id UUID := 'b0a1100d-0000-4d0f-9000-000000000001';
  fixture_season_id UUID := 'b0a1100d-0000-4d0f-9000-000000000002';
BEGIN
  SELECT COUNT(*)
    INTO matching_sessions
    FROM "game_sessions"
   WHERE "name" = 'Nugu'
     AND "formation" = '4-4-2'
     AND "status" = 'in_progress';

  IF matching_sessions = 0 THEN
    RAISE NOTICE 'Ballon d''Or fixture skipped: no in-progress Nugu 4-4-2 session exists.';
    RETURN;
  END IF;

  IF matching_sessions > 1 THEN
    RAISE EXCEPTION 'Ballon d''Or fixture aborted: Nugu 4-4-2 session is ambiguous (% matches).', matching_sessions;
  END IF;

  SELECT "id"
    INTO target_session_id
    FROM "game_sessions"
   WHERE "name" = 'Nugu'
     AND "formation" = '4-4-2'
     AND "status" = 'in_progress'
   LIMIT 1;

  IF EXISTS (
    SELECT 1 FROM "career_players" WHERE "id" = fixture_player_id
  ) THEN
    RAISE NOTICE 'Ballon d''Or fixture already exists.';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
      FROM "career_players"
     WHERE "gameSessionId" = target_session_id
       AND "slotIndex" = 6
  ) THEN
    RAISE EXCEPTION 'Ballon d''Or fixture aborted: Nugu slot 6 is already occupied.';
  END IF;

  INSERT INTO "career_players" (
    "id", "gameSessionId", "slotIndex",
    "name", "nationality", "position", "height", "weight", "preferredFoot",
    "debutAge", "retireAge", "careerLengthYears",
    "debutOvr", "peakOvr", "cardRarity", "currentContinentalCup",
    "contractYearsTotal", "contractYearsRemaining", "currentWageAnnual", "marketValue",
    "isUnemployed", "walletBalance", "influenceScore", "walletLedger", "shopInventory",
    "statsTimeline", "clubStints", "events", "hiddenStats", "achievements", "seasonHistory",
    "isRetired", "currentAge", "currentStep", "currentWheel", "checkpointVersion", "revision",
    "createdAt", "updatedAt"
  ) VALUES (
    fixture_player_id, target_session_id, 6,
    'Nugu Ballon', 'Germany', 'CM', 180, 75, 'Right',
    21, 31, 10,
    90, 96, 'legendary', 'UCL',
    3, 2, 7200, 120000,
    false, 0, 86, '[]'::jsonb, '[]'::jsonb,
    $$[
      {
        "age": 25, "ovr": 96,
        "pac": 96, "sho": 94, "pas": 99, "dri": 95, "def": 91, "phy": 93,
        "marketValue": 120000, "positionWeightedRating": 96, "effectivePositionOvr": 96,
        "apps": 42, "goals": 18, "assists": 22, "cleanSheets": 12, "matchRating": 8.65
      }
    ]$$::jsonb,
    $$[
      {
        "clubId": "real_madrid", "clubName": "Real Madrid",
        "leagueId": "ESP1", "leagueName": "La Liga",
        "startAge": 21, "endAge": 25, "yearsAtClub": 5,
        "ovrAtJoining": 90, "ovrAtLeaving": 96
      }
    ]$$::jsonb,
    $$[
      {
        "type": "test_fixture",
        "label": "Fixture kiểm thử Ballon d'Or",
        "age": 25,
        "clubId": "real_madrid",
        "nationality": "Germany"
      }
    ]$$::jsonb,
    $$
      { "luckRating": 20, "professionalism": 20, "personality": "Professional" }
    $$::jsonb,
    $$
      { "ballonDor": 0, "trophies": [], "seasonAwards": [] }
    $$::jsonb,
    $$
      {
        "25": {
          "age": 25, "clubName": "Real Madrid", "leagueName": "La Liga", "leagueId": "ESP1",
          "ovr": 96, "standing": 1, "domesticCup": "Winner",
          "continentalCup": { "type": "UCL", "result": "Winner" }, "nationalTeam": null,
          "apps": 42, "goals": 18, "assists": 22, "cleanSheets": 12, "matchRating": 8.65,
          "ballonDorResult": null
        }
      }
    $$::jsonb,
    false, 25, 'ballon_dor_nomination', 'career', 2, 0,
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  );

  INSERT INTO "career_seasons" (
    "id", "careerPlayerId", "seasonNumber", "age", "clubId", "clubName",
    "leagueId", "leagueName", "status", "runtimeState", "startedAt", "createdAt", "updatedAt"
  ) VALUES (
    fixture_season_id, fixture_player_id, 5, 25, 'real_madrid', 'Real Madrid',
    'ESP1', 'La Liga', 'in_progress',
    $$
      {
        "standingResult": 1,
        "domesticCupResult": "Winner",
        "continentalCupResult": "Winner",
        "ballonDorNominationWeight": 80,
        "ballonDorRankWeights": [80, 20, 0, 0, 0, 0, 0, 0, 0, 0]
      }
    $$::jsonb,
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  );

  RAISE NOTICE 'Ballon d''Or fixture attached to Nugu session % at slot 6.', target_session_id;
END $fixture$;
