import { resolveRandom, resolveRandomInt } from "@/lib/wheel-engine/spin-resolver";

export interface ClubDbInfo {
  id: string;
  name: string;
  leagueId: string;
  prestige: number;
  leagueName?: string | null;
}

export interface TransferOfferResult {
  hasOffer: boolean;
  offer: {
    clubId: string;
    clubName: string;
    leagueId: string;
    leagueName: string;
  } | null;
}

export function generateTransferOfferService(params: {
  currentClubId: string;
  currentClubPrestige: number;
  currentOvr: number;
  matchRating: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  position: string;
  clubs: ClubDbInfo[];
}): TransferOfferResult {
  const { currentClubId, currentClubPrestige, currentOvr, matchRating, clubs } = params;

  // 1. Tính toán cơ hội nhận Transfer Offer dựa trên OVR và phong độ thực tế
  let offerChance = 0.20; // Cơ hội cơ bản 20%
  
  if (matchRating >= 7.50) offerChance += 0.15; // Phong độ cao thu hút CLB khác
  if (matchRating < 6.30) offerChance += 0.10;  // Phong độ thấp dễ bị thanh lý/muốn ra đi
  
  // Nếu OVR vượt trội so với uy tín của CLB hiện tại -> muốn tìm bến đỗ lớn hơn
  const expectedPrestige = Math.min(5, Math.max(1, Math.round((currentOvr - 50) / 8)));
  if (expectedPrestige > currentClubPrestige) {
    offerChance += 0.15;
  }

  const hasOffer = resolveRandom() < offerChance;
  if (!hasOffer) {
    return { hasOffer: false, offer: null };
  }

  // 2. Lọc các CLB hợp lệ (khác CLB hiện tại)
  const eligibleClubs = clubs.filter((c) => c.id !== currentClubId);
  if (eligibleClubs.length === 0) {
    return { hasOffer: false, offer: null };
  }

  // Lọc các CLB có prestige phù hợp với trình độ cầu thủ (OVR)
  // Cầu thủ OVR cao sẽ nhận được lời mời từ các CLB có prestige tương xứng (+-1 sao so với expectedPrestige)
  let targetClubs = eligibleClubs.filter(
    (c) => Math.abs(c.prestige - expectedPrestige) <= 1
  );

  // Nếu không tìm thấy CLB phù hợp, lấy CLB bất kỳ
  if (targetClubs.length === 0) {
    targetClubs = eligibleClubs;
  }

  // Chọn CLB ngẫu nhiên
  const chosenClub = targetClubs[resolveRandomInt(0, targetClubs.length - 1)];

  return {
    hasOffer: true,
    offer: {
      clubId: chosenClub.id,
      clubName: chosenClub.name,
      leagueId: chosenClub.leagueId,
      leagueName: chosenClub.leagueName ?? "Giải Vô Địch",
    },
  };
}
