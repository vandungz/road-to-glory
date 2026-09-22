import type { QuickPosition, QuickStatKey, QuickTraitResult } from "../types";

type TraitDefinition = QuickTraitResult & { preferredPositions?: readonly QuickPosition[] };

export const QUICK_TRAITS: TraitDefinition[] = [
  { id: "messi", name: "Messi", description: "Mê hoặc trong không gian hẹp.", modifiers: { dri: 2, pas: 1 }, preferredPositions: ["CAM", "LW", "RW"] },
  { id: "ronaldo", name: "Cristiano Ronaldo", description: "Bản năng săn bàn và thể chất vượt trội.", modifiers: { sho: 2, str: 1 }, preferredPositions: ["ST", "LW", "RW"] },
  { id: "xavi", name: "Xavi", description: "Điều khiển nhịp độ bằng đường chuyền.", modifiers: { pas: 2, iq: 1 }, preferredPositions: ["CM", "CDM", "CAM"] },
  { id: "iniesta", name: "Iniesta", description: "Thoát pressing bằng kỹ thuật mềm mại.", modifiers: { dri: 1, pas: 1, iq: 1 }, preferredPositions: ["CM", "CAM"] },
  { id: "modric", name: "Modrić", description: "Nhãn quan và những cú sút xa.", modifiers: { pas: 1, sho: 1, iq: 1 }, preferredPositions: ["CM", "CAM"] },
  { id: "de-bruyne", name: "De Bruyne", description: "Chuyền quyết định từ mọi cự ly.", modifiers: { pas: 2, iq: 1 }, preferredPositions: ["CM", "CAM", "RM"] },
  { id: "neymar", name: "Neymar", description: "Kỹ thuật cá nhân giàu đột biến.", modifiers: { dri: 2, sho: 1 }, preferredPositions: ["LW", "RW", "CAM"] },
  { id: "mbappe", name: "Mbappé", description: "Tốc độ biến hàng thủ thành khoảng trống.", modifiers: { pac: 2, sho: 1 }, preferredPositions: ["ST", "LW", "RW"] },
  { id: "haaland", name: "Haaland", description: "Sức mạnh và khả năng kết thúc lạnh lùng.", modifiers: { sho: 2, str: 1 }, preferredPositions: ["ST"] },
  { id: "salah", name: "Salah", description: "Tăng tốc và cắt vào trong sắc bén.", modifiers: { pac: 1, dri: 1, sho: 1 }, preferredPositions: ["RW", "ST"] },
  { id: "kante", name: "Kanté", description: "Bao phủ mặt sân và đọc tình huống.", modifiers: { def: 2, str: 1 }, preferredPositions: ["CDM", "CM"] },
  { id: "busquets", name: "Busquets", description: "Đọc trận đấu trước khi bóng đến.", modifiers: { iq: 2, pas: 1 }, preferredPositions: ["CDM"] },
  { id: "van-dijk", name: "Van Dijk", description: "Không chiến và sức mạnh phòng ngự.", modifiers: { def: 2, str: 1 }, preferredPositions: ["CB"] },
  { id: "ramos", name: "Sergio Ramos", description: "Tinh thần thủ lĩnh trong những thời khắc lớn.", modifiers: { def: 1, str: 1, iq: 1 }, preferredPositions: ["CB", "RB"] },
  { id: "roberto-carlos", name: "Roberto Carlos", description: "Cánh trái bùng nổ với tốc độ và lực sút.", modifiers: { pac: 1, sho: 1, str: 1 }, preferredPositions: ["LB", "LM"] },
  { id: "lahm", name: "Lahm", description: "Kỷ luật vị trí và quyết định thông minh.", modifiers: { def: 1, pas: 1, iq: 1 }, preferredPositions: ["LB", "RB", "CDM"] },
  { id: "buffon", name: "Buffon", description: "Bản lĩnh thủ môn và phản xạ ổn định.", modifiers: { ref: 2, pos: 1 }, preferredPositions: ["GK"] },
  { id: "neuer", name: "Neuer", description: "Thủ môn quét chủ động ngoài vòng cấm.", modifiers: { spd: 1, pos: 1, iq: 1 }, preferredPositions: ["GK"] },
  { id: "casillas", name: "Casillas", description: "Phản xạ trong những tình huống một đối một.", modifiers: { ref: 2, div: 1 }, preferredPositions: ["GK"] },
  { id: "yashin", name: "Yashin", description: "Uy quyền và khả năng kiểm soát khung thành.", modifiers: { han: 1, pos: 1, iq: 1 }, preferredPositions: ["GK"] },
];

export function getTraitPool(position: QuickPosition): TraitDefinition[] {
  const preferred = QUICK_TRAITS.filter((trait) => trait.preferredPositions?.includes(position));
  const fallback = QUICK_TRAITS.filter((trait) => !trait.preferredPositions?.includes(position));
  return [...preferred, ...fallback];
}

export function applyTrait(stats: Record<QuickStatKey, number>, trait: QuickTraitResult): Record<QuickStatKey, number> {
  const next = { ...stats };
  for (const [key, delta] of Object.entries(trait.modifiers) as [QuickStatKey, number][]) {
    next[key] = Math.min(10, Math.max(1, (next[key] ?? 5) + delta));
  }
  return next;
}
