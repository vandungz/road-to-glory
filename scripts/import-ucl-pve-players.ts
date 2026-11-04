import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

type EaRating = {
  id: number;
  overallRating: number;
  firstName: string;
  lastName: string;
  commonName?: string;
  nationality?: { label?: string };
  position?: { shortLabel?: string };
  stats?: Record<string, { value?: number }>;
  team?: { label?: string };
};

type UclPlayer = { name: string; club: string; group: string };

const CLUB_IDS: Record<string, string> = {
  "AEK Athens": "aek_athens",
  Arsenal: "arsenal",
  "Aston Villa": "aston_villa",
  "Atlético de Madrid (Atleti)": "atletico_madrid",
  "Bodø/Glimt": "bodo_glimt",
  "Borussia Dortmund": "dortmund",
  Barcelona: "barcelona",
  "Bayern München": "bayern_munich",
  "Club Brugge": "club_brugge",
  Como: "como",
  "Fenerbahçe": "fenerbahce",
  Feyenoord: "feyenoord",
  Galatasaray: "galatasaray",
  Inter: "inter",
  LASK: "lask",
  Leipzig: "leipzig",
  Lens: "lens",
  Lille: "lille",
  Liverpool: "liverpool",
  "Manchester City": "man_city",
  "Manchester United": "man_united",
  Napoli: "napoli",
  Paris: "paris_saint_germain",
  Porto: "porto",
  PSV: "psv",
  "Real Betis": "real_betis",
  "Real Madrid": "real_madrid",
  Roma: "roma",
  Sabah: "sabah",
  "Shakhtar Donetsk": "shakhtar_donetsk",
  "Slavia Praha": "slavia_praha",
  "Slovan Bratislava": "slovan_bratislava",
  "Sporting CP": "sporting_cp",
  Stuttgart: "stuttgart",
  Viking: "viking",
  Villarreal: "villarreal",
};

const inputPath = resolve(process.argv[2] ?? "D:/ucl_2026-27_league_phase_squads.md");
const outputPath = resolve(process.argv[3] ?? "prisma/data/pve-players.json");
const apiUrl = "https://drop-api.ea.com/rating/ea-sports-fc";
const pageSize = 100;

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function positionForGroup(group: string): string {
  if (group === "Thủ môn") return "GK";
  if (group === "Hậu vệ") return "CB";
  if (group === "Tiền vệ") return "CM";
  return "ST";
}

function normalizePosition(position: string | undefined, group: string): string {
  const value = position?.toUpperCase();
  if (!value) return positionForGroup(group);
  if (value === "LWB") return "LB";
  if (value === "RWB") return "RB";
  if (value === "CF") return "ST";
  if (value === "LF") return "LW";
  if (value === "RF") return "RW";
  return value;
}

function displayName(player: EaRating): string {
  return player.commonName?.trim() || `${player.firstName} ${player.lastName}`.trim();
}

function clubId(name: string): string {
  const id = CLUB_IDS[name];
  if (!id) throw new Error(`Missing PvE club mapping for ${name}`);
  return id;
}

function clubAliases(name: string): string[] {
  const aliases: Record<string, string[]> = {
    "Atlético de Madrid (Atleti)": ["atleticodemadrid", "atleticomadrid"],
    "Bayern München": ["bayernmunich", "bayernmunchen"],
    Paris: ["paris", "parissaintgermain"],
    Roma: ["roma", "asroma"],
  };
  return aliases[name] ?? [name];
}

function stat(player: EaRating, key: string): number | null {
  const value = player.stats?.[key]?.value;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseRoster(markdown: string): UclPlayer[] {
  const players: UclPlayer[] = [];
  let club = "";
  for (const line of markdown.split(/\r?\n/)) {
    const clubMatch = line.match(/^##\s+\d+\.\s+(.+?)\s+\([A-Z]{3}\)/);
    if (clubMatch) {
      club = clubMatch[1].trim();
      continue;
    }
    const positionMatch = line.match(/^-\s+\*\*(.+?):\*\*\s+(.+)$/);
    if (!positionMatch || !club) continue;
    const group = positionMatch[1].trim();
    const names = positionMatch[2].matchAll(/([^,]+?)\s+\([^)]*?[–-]\s*[A-Z]{3}\)/g);
    for (const match of names) players.push({ name: match[1].trim(), club, group });
  }
  return players;
}

async function fetchRatings(): Promise<EaRating[]> {
  const first = await fetch(`${apiUrl}?limit=${pageSize}&offset=0`).then((response) => {
    if (!response.ok) throw new Error(`EA ratings request failed: ${response.status}`);
    return response.json() as Promise<{ items: EaRating[]; totalItems: number }>;
  });
  const offsets = Array.from({ length: Math.ceil(first.totalItems / pageSize) - 1 }, (_, index) => (index + 1) * pageSize);
  const pages: EaRating[][] = [first.items];
  for (let index = 0; index < offsets.length; index += 8) {
    const batch = await Promise.all(offsets.slice(index, index + 8).map(async (offset) => {
      const response = await fetch(`${apiUrl}?limit=${pageSize}&offset=${offset}`);
      if (!response.ok) throw new Error(`EA ratings request failed at offset ${offset}: ${response.status}`);
      const page = await response.json() as { items: EaRating[] };
      return page.items;
    }));
    pages.push(...batch);
    console.log(`Fetched ${Math.min(offsets.length + 1, index + batch.length + 1)} rating pages.`);
  }
  return pages.flat();
}

async function main() {
  const roster = parseRoster(readFileSync(inputPath, "utf8"));
  const ratings = await fetchRatings();
  const byName = new Map<string, EaRating[]>();
  for (const rating of ratings) {
    const names = [displayName(rating), `${rating.firstName} ${rating.lastName}`];
    for (const name of names) {
      const key = normalize(name);
      byName.set(key, [...(byName.get(key) ?? []), rating]);
    }
  }

  const output = roster.flatMap((entry) => {
    const candidates = byName.get(normalize(entry.name)) ?? [];
    const exactClubRating = candidates.find((candidate) => clubAliases(entry.club).some((alias) => normalize(candidate.team?.label ?? "").includes(normalize(alias))));
    // The supplied UEFA List A is the source of truth for the 2026/27 club;
    // EA's public catalog can lag transfers, so keep the roster club on fallback matches.
    const rating = exactClubRating ?? candidates[0];
    if (!rating) return [];
    const stats = {
      pace: stat(rating, "pac"),
      shooting: stat(rating, "sho"),
      passing: stat(rating, "pas"),
      dribbling: stat(rating, "dri"),
      defending: stat(rating, "def"),
      physical: stat(rating, "phy"),
    };
    if (Object.values(stats).some((value) => value === null)) return [];
    return [{
      id: `ucl-2026-27-${clubId(entry.club)}-${rating.id}`,
      clubId: clubId(entry.club),
      clubName: entry.club === "Paris" ? "Paris Saint-Germain" : entry.club === "Roma" ? "AS Roma" : entry.club,
      name: displayName(rating),
      nationality: rating.nationality?.label ?? "Unknown",
      position: normalizePosition(rating.position?.shortLabel, entry.group),
      eraStart: 2026,
      eraEnd: 2027,
      overall: rating.overallRating,
      stats,
    }];
  });

  const unique = [...new Map(output.map((player) => [player.id, player])).values()];
  const unmatched = roster.filter((entry) => !(byName.get(normalize(entry.name)) ?? []).length);
  writeFileSync(outputPath, `${JSON.stringify(unique, null, 2)}\n`, "utf8");
  console.log(`Roster entries: ${roster.length}; matched: ${unique.length}; unmatched: ${unmatched.length}`);
  if (unmatched.length > 0) console.log(`Unmatched names: ${unmatched.map((entry) => entry.name).join(" | ")}`);
}

void main();
