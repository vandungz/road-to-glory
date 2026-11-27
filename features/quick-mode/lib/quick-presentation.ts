import type { QuickPosition, QuickStatKey } from "../types";
export const QUICK_STAT_KEYS: Record<QuickPosition, readonly QuickStatKey[]> = {
    GK: ["div", "han", "kic", "ref", "spd", "pos", "iq"],
    LB: ["pac", "sho", "dri", "pas", "str", "def", "iq"],
    CB: ["pac", "sho", "dri", "pas", "str", "def", "iq"],
    RB: ["pac", "sho", "dri", "pas", "str", "def", "iq"],
    CDM: ["pac", "sho", "dri", "pas", "str", "def", "iq"],
    CM: ["pac", "sho", "dri", "pas", "str", "def", "iq"],
    CAM: ["pac", "sho", "dri", "pas", "str", "def", "iq"],
    LW: ["pac", "sho", "dri", "pas", "str", "def", "iq"],
    RW: ["pac", "sho", "dri", "pas", "str", "def", "iq"],
    LM: ["pac", "sho", "dri", "pas", "str", "def", "iq"],
    RM: ["pac", "sho", "dri", "pas", "str", "def", "iq"],
    ST: ["pac", "sho", "dri", "pas", "str", "def", "iq"],
};
const STAT_LABELS: Record<QuickStatKey, string> = {
    pac: "Pace", sho: "Shooting", dri: "Dribbling", pas: "Passing", str: "Strength", def: "Defending", iq: "Football IQ",
    div: "Diving", han: "Handling", kic: "Kicking", ref: "Reflexes", spd: "Speed", pos: "Positioning",
};
export function getQuickStatKeys(position: QuickPosition): readonly QuickStatKey[] {
    return QUICK_STAT_KEYS[position];
}
export function getQuickStatLabel(key: QuickStatKey): string {
    return STAT_LABELS[key];
}
