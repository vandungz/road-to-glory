/**
 * Stable facade for wheel weight and player-creation calculations.
 * Implementations live in focused pure modules so callers retain the legacy
 * import path while each policy boundary stays easy to test.
 */
export * from "./stat-config";
export * from "./weight-pools";
export * from "./ovr-calculator";
export * from "./physique-modifier";
