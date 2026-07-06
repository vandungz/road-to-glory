import { generateFictionalName } from "@/lib/name-gen";

export interface DraftDataInput {
  nationality: string;
  debutAge: number;
  debutOvr: number;
  careerLength: number;
  clubId: string;
  clubName: string;
  leagueId: string;
  leagueName: string;
  pac: number;
  sho: number;
  pas: number;
  dri: number;
  def: number;
  phy: number;
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

export interface CareerEvent {
  type: string;
  label: string;
  age: number;
  clubId?: string;
}

export interface CareerSetupResult {
  playerName: string;
  hiddenStats: {
    luckRating: number;
    professionalness: number; // Tên biến trong DB là professionalism nhưng DB Schema map Json. Ta dùng professionalism
    professionalism: number;
    personality: string;
  };
  initStint: StintInfo;
  initEvent: CareerEvent;
  initStats: Record<string, number>;
  initTimeline: any[];
}

export function startPlayerCareerService(draftData: DraftDataInput, clubPrestige: number, clubContinentalType: string): CareerSetupResult {
  const playerName = generateFictionalName(draftData.nationality);
  const luckRating = Math.floor(Math.random() * 20) + 1;
  const professionalism = Math.floor(Math.random() * 20) + 1;
  const personalityPool = ["Loyal", "Professional", "Ambitious", "Mercenary", "Temperamental", "Normal"];
  const personality = personalityPool[Math.floor(Math.random() * professionalism) % personalityPool.length];
  
  const hiddenStats = {
    luckRating,
    professionalness: professionalism,
    professionalism,
    personality,
  };

  const initStint: StintInfo = {
    clubId: draftData.clubId,
    clubName: draftData.clubName,
    leagueId: draftData.leagueId,
    leagueName: draftData.leagueName,
    startAge: draftData.debutAge,
    endAge: draftData.debutAge,
    yearsAtClub: 1,
    ovrAtJoining: draftData.debutOvr,
    ovrAtLeaving: draftData.debutOvr,
  };

  const initEvent: CareerEvent = {
    type: "DEBUT",
    label: `Ký Hợp Đồng chuyên nghiệp đầu tiên tại CLB ${draftData.clubName} (${draftData.leagueName}) ở mùa giải 2025/26 (tuổi ${draftData.debutAge}).`,
    age: draftData.debutAge,
    clubId: draftData.clubId,
  };

  const initStats = {
    pac: draftData.pac,
    sho: draftData.sho,
    pas: draftData.pas,
    dri: draftData.dri,
    def: draftData.def,
    phy: draftData.phy,
  };

  const initTimeline = [
    {
      age: draftData.debutAge,
      ovr: draftData.debutOvr,
      ...initStats,
    },
  ];

  return {
    playerName,
    hiddenStats,
    initStint,
    initEvent,
    initStats,
    initTimeline,
  };
}
