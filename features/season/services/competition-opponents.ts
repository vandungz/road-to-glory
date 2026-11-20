export function continentalOpponentTypes(cupType: string): string[] {
  // The current reference catalog has no separate Sudamericana entrants.
  if (cupType === "Sudamericana") return ["Libertadores", "Sudamericana"];
  if (["UCL", "UEL", "UECL", "Libertadores", "AFC_CL", "CONCACAF_CC", "CAF_CL"].includes(cupType)) return [cupType];
  return [];
}

export function tournamentConfederation(tournament: string): string | undefined {
  return new Map([
    ["UEFA Euro", "UEFA"],
    ["Copa América", "CONMEBOL"],
    ["AFC Asian Cup", "AFC"],
    ["CAF Africa Cup of Nations", "CAF"],
    ["CONCACAF Gold Cup", "CONCACAF"],
  ]).get(tournament);
}
