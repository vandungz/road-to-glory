// ============================================================
// STAT KEY DEFINITIONS
// ============================================================

export const FIELD_STAT_KEYS = ["pac", "sho", "pas", "dri", "def", "phy"] as const;
export const GK_STAT_KEYS    = ["div", "han", "kic", "ref", "spd", "pos"] as const;

export type FieldStatKey = (typeof FIELD_STAT_KEYS)[number];
export type GKStatKey    = (typeof GK_STAT_KEYS)[number];

export function getStatKeys(position: string): readonly string[] {
  return position === "GK" ? GK_STAT_KEYS : FIELD_STAT_KEYS;
}

// 3 main-stat chính xác theo từng vị trí cụ thể (nguồn: trọng số trong
// calculateOvrByPosition) — dùng cho selector weight khi tăng/giảm chỉ số.
const MAIN_STATS_BY_POSITION: Record<string, readonly string[]> = {
  GK: ["ref", "div", "han"],
  CB: ["def", "phy", "pac"],
  LB: ["pac", "def", "pas"],
  RB: ["pac", "def", "pas"],
  CDM: ["def", "phy", "pas"],
  CM: ["pas", "dri", "phy"],
  CAM: ["pas", "dri", "sho"],
  LW: ["pac", "dri", "sho"],
  RW: ["pac", "dri", "sho"],
  LM: ["dri", "pac", "pas"],
  RM: ["dri", "pac", "pas"],
  ST: ["sho", "pac", "dri"],
};

export function getMainStatsByPosition(position: string): readonly string[] {
  return MAIN_STATS_BY_POSITION[position] ?? [];
}

const GK_STAT_LABELS: Record<GKStatKey, string> = {
  div: "Diving (DIV)",
  han: "Handling (HAN)",
  kic: "Kicking (KIC)",
  ref: "Reflexes (REF)",
  spd: "Speed (SPD)",
  pos: "Positioning (POS)",
};

const FIELD_STAT_LABELS: Record<FieldStatKey, string> = {
  pac: "Pace (PAC)",
  sho: "Shooting (SHO)",
  pas: "Passing (PAS)",
  dri: "Dribbling (DRI)",
  def: "Defending (DEF)",
  phy: "Physical (PHY)",
};

export function getStatLabel(position: string, key: string): string {
  if (position === "GK") return GK_STAT_LABELS[key as GKStatKey] ?? key.toUpperCase();
  return FIELD_STAT_LABELS[key as FieldStatKey] ?? key.toUpperCase();
}

export function getDefaultStats(position: string): Record<string, number> {
  return position === "GK"
    ? { div: 60, han: 60, kic: 60, ref: 60, spd: 60, pos: 60 }
    : { pac: 60, sho: 60, pas: 60, dri: 60, def: 60, phy: 60 };
}
