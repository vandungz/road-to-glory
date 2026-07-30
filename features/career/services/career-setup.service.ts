import { generateFictionalName } from "@/lib/name-gen";
import { resolveRandomInt, resolveRandom } from "@/lib/wheel-engine/spin-resolver";
import { calculateOvrByPosition } from "@/lib/wheel-engine/weight-calculator";

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
  // Field player stats (null when not applicable)
  pac?: number | null;
  sho?: number | null;
  pas?: number | null;
  dri?: number | null;
  def?: number | null;
  phy?: number | null;
  // GK stats (null when not applicable)
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
  /** Server-authoritative debut OVR from position + stats. */
  debutOvr: number;
  hiddenStats: {
    luckRating: number;
    professionalism: number;
    personality: string;
  };
  initStint: StintInfo;
  initStats: Record<string, number>;
  initTimeline: any[];
}

export function startPlayerCareerService(
  draftData: DraftDataInput,
  _clubPrestige: number,
  _clubContinentalType: string,
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
  };
}
