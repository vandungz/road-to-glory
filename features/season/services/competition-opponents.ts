export function continentalOpponentTypes(cupType: string): string[] {
  if (cupType === "Libertadores" || cupType === "Sudamericana") return ["Libertadores", "Sudamericana"];
  if (["AFC_CL", "CONCACAF_CC", "CAF_CL"].includes(cupType)) return [cupType];
  return ["UCL", "UEL", "UECL"];
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
