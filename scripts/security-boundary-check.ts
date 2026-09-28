import { saveSeasonProgressSchema } from "@/actions/season-action-contracts";
import {
  assertLegacyWritesEnabled,
  assertOwnedLegacyPlayers,
} from "@/lib/career/legacy-write-policy";

const firstPlayerId = "00000000-0000-4000-8000-000000000001";
const secondPlayerId = "00000000-0000-4000-8000-000000000002";

const player = (id: string) => ({
  id,
  statsTimeline: [{ age: 18, ovr: 60, pac: 60 }],
  clubStints: [],
  events: [],
  slotIndex: 0,
});

const validPayload = { gameId: "00000000-0000-4000-8000-000000000010", playersUpdate: [player(firstPlayerId)] };
if (!saveSeasonProgressSchema.safeParse(validPayload).success) {
  throw new Error("valid legacy save payload was rejected");
}

if (saveSeasonProgressSchema.safeParse({
  ...validPayload,
  playersUpdate: [player(firstPlayerId), player(firstPlayerId)],
}).success) {
  throw new Error("duplicate player ids were accepted");
}

assertOwnedLegacyPlayers([firstPlayerId], [{ id: firstPlayerId, checkpointVersion: 1 }]);

let foreignIdRejected = false;
try {
  assertOwnedLegacyPlayers([firstPlayerId, secondPlayerId], [{ id: firstPlayerId, checkpointVersion: 1 }]);
} catch {
  foreignIdRejected = true;
}
if (!foreignIdRejected) throw new Error("foreign player id was not rejected");

const previousNodeEnv = process.env.NODE_ENV;
const previousLegacyFlag = process.env.LEGACY_CAREER_WRITES;
const environment = process.env as Record<string, string | undefined>;
environment.NODE_ENV = "production";
delete environment.LEGACY_CAREER_WRITES;
let legacyDisabled = false;
try {
  assertLegacyWritesEnabled();
} catch {
  legacyDisabled = true;
}
if (!legacyDisabled) throw new Error("legacy writes are enabled by default in production");
if (previousNodeEnv === undefined) delete environment.NODE_ENV;
else environment.NODE_ENV = previousNodeEnv;
if (previousLegacyFlag === undefined) delete environment.LEGACY_CAREER_WRITES;
else environment.LEGACY_CAREER_WRITES = previousLegacyFlag;

console.log("security boundary checks passed");
