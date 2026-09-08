import { randomInt } from "node:crypto";

/** Uniform cryptographically secure float in [0, 1). Server-only helper. */
export function secureRandom(): number {
  return randomInt(0, 1_000_000) / 1_000_001;
}
