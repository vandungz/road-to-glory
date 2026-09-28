export function legacyWritesEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  const value = process.env.LEGACY_CAREER_WRITES?.trim().toLowerCase();
  return value === "true" || value === "1" || value === "on";
}

export function assertLegacyWritesEnabled(): void {
  if (!legacyWritesEnabled()) {
    throw new Error("Legacy career migration is required before this action is available.");
  }
}

export function assertOwnedLegacyPlayers(
  requestedIds: string[],
  ownedPlayers: Array<{ id: string; checkpointVersion: number }>,
): void {
  const ownedById = new Map(ownedPlayers.map((player) => [player.id, player]));
  if (ownedPlayers.length !== requestedIds.length || requestedIds.some((id) => !ownedById.has(id))) {
    throw new Error("Forbidden");
  }
  if (ownedPlayers.some((player) => player.checkpointVersion >= 2)) {
    throw new Error("Legacy season save không được phép ghi Career V2.");
  }
}
