import { prisma } from "../lib/prisma";
import { LEAGUES } from "./data/leagues";
import { CLUBS } from "./data/clubs";

const NATIONAL_TEAMS = [
  // ── UEFA ──
  { id: "england",     name: "Anh",               nationality: "England",               confederation: "UEFA",     tier: 1 },
  { id: "france",      name: "Pháp",               nationality: "France",                confederation: "UEFA",     tier: 1 },
  { id: "spain",       name: "Tây Ban Nha",         nationality: "Spain",                 confederation: "UEFA",     tier: 1 },
  { id: "germany",     name: "Đức",                nationality: "Germany",               confederation: "UEFA",     tier: 1 },
  { id: "italy",       name: "Ý",                  nationality: "Italy",                 confederation: "UEFA",     tier: 1 },
  { id: "portugal",    name: "Bồ Đào Nha",          nationality: "Portugal",              confederation: "UEFA",     tier: 1 },
  { id: "netherlands", name: "Hà Lan",              nationality: "Netherlands",           confederation: "UEFA",     tier: 1 },
  { id: "belgium",     name: "Bỉ",                 nationality: "Belgium",               confederation: "UEFA",     tier: 1 },
  { id: "croatia",     name: "Croatia",             nationality: "Croatia",               confederation: "UEFA",     tier: 2 },
  { id: "norway",      name: "Na Uy",               nationality: "Norway",                confederation: "UEFA",     tier: 2 },
  { id: "turkey",      name: "Thổ Nhĩ Kỳ",         nationality: "Turkey",                confederation: "UEFA",     tier: 2 },
  { id: "switzerland", name: "Thụy Sĩ",             nationality: "Switzerland",           confederation: "UEFA",     tier: 2 },
  { id: "denmark",     name: "Đan Mạch",             nationality: "Denmark",               confederation: "UEFA",     tier: 2 },
  { id: "sweden",      name: "Thụy Điển",            nationality: "Sweden",                confederation: "UEFA",     tier: 2 },
  { id: "poland",      name: "Ba Lan",               nationality: "Poland",                confederation: "UEFA",     tier: 2 },
  { id: "austria",     name: "Áo",                  nationality: "Austria",               confederation: "UEFA",     tier: 2 },
  { id: "ukraine",     name: "Ukraine",              nationality: "Ukraine",               confederation: "UEFA",     tier: 2 },
  { id: "serbia",      name: "Serbia",               nationality: "Serbia",                confederation: "UEFA",     tier: 2 },
  { id: "scotland",    name: "Scotland",             nationality: "Scotland",              confederation: "UEFA",     tier: 3 },
  { id: "greece",      name: "Hy Lạp",               nationality: "Greece",                confederation: "UEFA",     tier: 3 },
  { id: "czech",       name: "Séc",                  nationality: "Czech Republic",        confederation: "UEFA",     tier: 3 },
  { id: "bosnia",      name: "Bosnia",               nationality: "Bosnia and Herzegovina",confederation: "UEFA",     tier: 3 },
  { id: "wales",       name: "Xứ Wales",             nationality: "Wales",                 confederation: "UEFA",     tier: 3 },
  { id: "albania",     name: "Albania",              nationality: "Albania",               confederation: "UEFA",     tier: 3 },

  // ── CONMEBOL ──
  { id: "brazil",      name: "Brazil",               nationality: "Brazil",                confederation: "CONMEBOL", tier: 1 },
  { id: "argentina",   name: "Argentina",             nationality: "Argentina",             confederation: "CONMEBOL", tier: 1 },
  { id: "uruguay",     name: "Uruguay",               nationality: "Uruguay",               confederation: "CONMEBOL", tier: 2 },
  { id: "colombia",    name: "Colombia",              nationality: "Colombia",              confederation: "CONMEBOL", tier: 2 },
  { id: "chile",       name: "Chile",                 nationality: "Chile",                 confederation: "CONMEBOL", tier: 2 },
  { id: "ecuador",     name: "Ecuador",               nationality: "Ecuador",               confederation: "CONMEBOL", tier: 2 },
  { id: "paraguay",    name: "Paraguay",              nationality: "Paraguay",              confederation: "CONMEBOL", tier: 3 },
  { id: "peru",        name: "Peru",                  nationality: "Peru",                  confederation: "CONMEBOL", tier: 3 },
  { id: "venezuela",   name: "Venezuela",             nationality: "Venezuela",             confederation: "CONMEBOL", tier: 3 },
  { id: "bolivia",     name: "Bolivia",               nationality: "Bolivia",               confederation: "CONMEBOL", tier: 3 },

  // ── AFC ──
  { id: "japan",       name: "Nhật Bản",              nationality: "Japan",                 confederation: "AFC",      tier: 1 },
  { id: "south_korea", name: "Hàn Quốc",              nationality: "South Korea",           confederation: "AFC",      tier: 1 },
  { id: "iran",        name: "Iran",                  nationality: "Iran",                  confederation: "AFC",      tier: 2 },
  { id: "australia",   name: "Úc",                   nationality: "Australia",             confederation: "AFC",      tier: 2 },
  { id: "saudi",       name: "Saudi Arabia",          nationality: "Saudi Arabia",          confederation: "AFC",      tier: 2 },
  { id: "qatar",       name: "Qatar",                 nationality: "Qatar",                 confederation: "AFC",      tier: 2 },
  { id: "iraq",        name: "Iraq",                  nationality: "Iraq",                  confederation: "AFC",      tier: 2 },
  { id: "uae",         name: "UAE",                   nationality: "UAE",                   confederation: "AFC",      tier: 3 },
  { id: "uzbekistan",  name: "Uzbekistan",            nationality: "Uzbekistan",            confederation: "AFC",      tier: 3 },
  { id: "jordan",      name: "Jordan",                nationality: "Jordan",                confederation: "AFC",      tier: 3 },
  { id: "thailand",    name: "Thái Lan",              nationality: "Thailand",              confederation: "AFC",      tier: 3 },
  { id: "china",       name: "Trung Quốc",             nationality: "China",                 confederation: "AFC",      tier: 3 },

  // ── CAF ──
  { id: "senegal",     name: "Senegal",               nationality: "Senegal",               confederation: "CAF",      tier: 1 },
  { id: "morocco",     name: "Maroc",                 nationality: "Morocco",               confederation: "CAF",      tier: 1 },
  { id: "nigeria",     name: "Nigeria",               nationality: "Nigeria",               confederation: "CAF",      tier: 1 },
  { id: "egypt",       name: "Ai Cập",                nationality: "Egypt",                 confederation: "CAF",      tier: 1 },
  { id: "ivory_coast", name: "Bờ Biển Ngà",           nationality: "Ivory Coast",           confederation: "CAF",      tier: 1 },
  { id: "ghana",       name: "Ghana",                 nationality: "Ghana",                 confederation: "CAF",      tier: 2 },
  { id: "algeria",     name: "Algeria",               nationality: "Algeria",               confederation: "CAF",      tier: 2 },
  { id: "tunisia",     name: "Tunisia",               nationality: "Tunisia",               confederation: "CAF",      tier: 2 },
  { id: "cameroon",    name: "Cameroon",              nationality: "Cameroon",              confederation: "CAF",      tier: 2 },
  { id: "mali",        name: "Mali",                  nationality: "Mali",                  confederation: "CAF",      tier: 2 },
  { id: "south_africa",name: "Nam Phi",               nationality: "South Africa",          confederation: "CAF",      tier: 2 },
  { id: "dr_congo",    name: "DR Congo",              nationality: "DR Congo",              confederation: "CAF",      tier: 2 },
  { id: "guinea",      name: "Guinea",                nationality: "Guinea",                confederation: "CAF",      tier: 3 },
  { id: "cape_verde",  name: "Cape Verde",            nationality: "Cape Verde",            confederation: "CAF",      tier: 3 },

  // ── CONCACAF ──
  { id: "usa",         name: "Mỹ",                   nationality: "USA",                   confederation: "CONCACAF", tier: 1 },
  { id: "mexico",      name: "Mexico",                nationality: "Mexico",                confederation: "CONCACAF", tier: 1 },
  { id: "canada",      name: "Canada",                nationality: "Canada",                confederation: "CONCACAF", tier: 2 },
  { id: "costa_rica",  name: "Costa Rica",            nationality: "Costa Rica",            confederation: "CONCACAF", tier: 2 },
  { id: "panama",      name: "Panama",                nationality: "Panama",                confederation: "CONCACAF", tier: 3 },
  { id: "jamaica",     name: "Jamaica",               nationality: "Jamaica",               confederation: "CONCACAF", tier: 3 },
  { id: "honduras",    name: "Honduras",              nationality: "Honduras",              confederation: "CONCACAF", tier: 3 },
  { id: "haiti",       name: "Haiti",                 nationality: "Haiti",                 confederation: "CONCACAF", tier: 3 },
  { id: "el_salvador", name: "El Salvador",           nationality: "El Salvador",           confederation: "CONCACAF", tier: 3 },
];

async function main() {
  console.log("Cleaning existing reference data...");
  await prisma.nationalTeam.deleteMany({});
  await prisma.club.deleteMany({});
  await prisma.league.deleteMany({});

  console.log("Seeding national teams...");
  for (const nt of NATIONAL_TEAMS) {
    await prisma.nationalTeam.create({ data: nt });
  }

  console.log("Seeding leagues...");
  for (const league of LEAGUES) {
    await prisma.league.create({
      data: {
        id: league.id,
        name: league.name,
        country: league.country,
        tier: league.tier,
        prestige: league.prestige,
        domesticCupName: league.domesticCupName,
        confederation: league.confederation,
      },
    });
  }

  console.log("Seeding clubs...");
  for (const club of CLUBS) {
    await prisma.club.create({
      data: {
        id: club.id,
        name: club.name,
        leagueId: club.leagueId,
        prestige: club.prestige,
        leagueTitlesCount: club.leagueTitlesCount,
        domesticCupsCount: club.domesticCupsCount,
        continentalTitlesCount: club.continentalTitlesCount,
        continentalType: club.continentalType,
      },
    });
  }

  console.log(
    `Database seeded successfully. National Teams: ${NATIONAL_TEAMS.length}, Leagues: ${LEAGUES.length}, Clubs: ${CLUBS.length}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
