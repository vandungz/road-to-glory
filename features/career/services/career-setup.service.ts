import { generateFictionalName } from "@/lib/name-gen";
import { resolveRandomInt, resolveRandom } from "@/lib/wheel-engine/spin-resolver";
import { calculateOvrByPosition } from "@/lib/wheel-engine/weight-calculator";
import {
  clampContractYears,
  computeMarketValue,
  proposeContractYears,
  proposeWageAnnual,
} from "@/lib/transfer-economy";

export interface DraftDataInput {
  nationality: string;
  debutAge: number;
  /** Client-sent; ignored — server recomputes from stats (O9). */
  debutOvr?: number;
  careerLength: number;
  clubId: string;
  clubName: string;
  leagueId: string;
  leagueName: string;
  position: string;
  pac?: number | null;
  sho?: number | null;
  pas?: number | null;
  dri?: number | null;
  def?: number | null;
  phy?: number | null;
  div?: number | null;
  han?: number | null;
  kic?: number | null;
  ref?: number | null;
  spd?: number | null;
  pos?: number | null;
}

export interface StintInfo {
  clubId: string;
  clubName: string;
  leagueId: string;
  leagueName: string;
  startAge: number;
  endAge: number;
  yearsAtClub: number;
  ovrAtJoining: number;
  ovrAtLeaving: number;
}

export interface CareerSetupResult {
  playerName: string;
  preferredFoot: string;
  debutOvr: number;
  hiddenStats: {
    luckRating: number;
    professionalism: number;
    personality: string;
  };
  initStint: StintInfo;
  initStats: Record<string, number>;
  initTimeline: any[];
  contractYearsTotal: number;
  contractYearsRemaining: number;
  currentWageAnnual: number;
  marketValue: number;
}

export function startPlayerCareerService(
  draftData: DraftDataInput,
  clubPrestige: number,
  _clubContinentalType: string,
  leagueTier = 1,
): CareerSetupResult {
  const playerName = generateFictionalName(draftData.nationality);
  const preferredFoot = resolveRandom() > 0.8 ? "Left" : "Right";
  const luckRating = resolveRandomInt(1, 20);
  const professionalism = resolveRandomInt(1, 20);
  const personalityPool = ["Loyal", "Professional", "Ambitious", "Mercenary", "Temperamental", "Normal"];
  const personality = personalityPool[resolveRandomInt(0, personalityPool.length - 1)];

  const hiddenStats = {
    luckRating,
    professionalism,
    personality,
  };

  const initStats: Record<string, number> = draftData.position === "GK"
    ? { div: draftData.div ?? 60, han: draftData.han ?? 60, kic: draftData.kic ?? 60, ref: draftData.ref ?? 60, spd: draftData.spd ?? 60, pos: draftData.pos ?? 60 }
    : { pac: draftData.pac ?? 60, sho: draftData.sho ?? 60, pas: draftData.pas ?? 60, dri: draftData.dri ?? 60, def: draftData.def ?? 60, phy: draftData.phy ?? 60 };

  const debutOvr = calculateOvrByPosition(draftData.position, initStats);
  const retireAge = draftData.debutAge + draftData.careerLength;

  const contractYearsRemaining = clampContractYears(
    proposeContractYears({
      currentAge: draftData.debutAge,
      retireAge,
      matchRating: 6.8,
    }),
    draftData.debutAge,
    retireAge,
  );
  const currentWageAnnual = proposeWageAnnual({
    ovr: debutOvr,
    age: draftData.debutAge,
    currentWage: 0,
    prestige: clubPrestige,
    leagueTier,
    matchRating: 6.8,
  });
  const marketValue = computeMarketValue({
    ovr: debutOvr,
    age: draftData.debutAge,
    matchRating: 6.8,
    contractYearsRemaining,
  });

  const initStint: StintInfo = {
    clubId: draftData.clubId,
    clubName: draftData.clubName,
    leagueId: draftData.leagueId,
    leagueName: draftData.leagueName,
    startAge: draftData.debutAge,
    endAge: draftData.debutAge,
    yearsAtClub: 1,
    ovrAtJoining: debutOvr,
    ovrAtLeaving: debutOvr,
  };

  const initTimeline = [
    {
      age: draftData.debutAge,
      ovr: debutOvr,
      ...initStats,
    },
  ];

  return {
    playerName,
    preferredFoot,
    debutOvr,
    hiddenStats,
    initStint,
    initStats,
    initTimeline,
    contractYearsTotal: contractYearsRemaining,
    contractYearsRemaining,
    currentWageAnnual,
    marketValue,
  };
}
