import { calculateOvrByPosition, getPhysiqueModifier, applyPhysiqueModifier } from "@/lib/wheel-engine/weight-calculator";
import type { DraftData } from "../stores/useWheelUiStore";
export function applySetupResult(current: DraftData, step: number, value: unknown, position: string): DraftData {
    const updatedData = { ...current };
    switch (step) {
        case 0:
            updatedData.nationality = value as string;
            break;
        case 1:
            updatedData.debutAge = value as number;
            break;
        case 2:
            updatedData.height = value as number;
            break;
        case 3:
            updatedData.weight = value as number;
            break;
        case 4:
            if (position === "GK")
                updatedData.div = value as number;
            else
                updatedData.pac = value as number;
            break;
        case 5:
            if (position === "GK")
                updatedData.han = value as number;
            else
                updatedData.sho = value as number;
            break;
        case 6:
            if (position === "GK")
                updatedData.kic = value as number;
            else
                updatedData.pas = value as number;
            break;
        case 7:
            if (position === "GK")
                updatedData.ref = value as number;
            else
                updatedData.dri = value as number;
            break;
        case 8:
            if (position === "GK")
                updatedData.spd = value as number;
            else
                updatedData.def = value as number;
            break;
        case 9: {
            const height = updatedData.height ?? 180;
            const weight = updatedData.weight ?? 75;
            if (position === "GK") {
                updatedData.pos = value as number;
                const rolled = {
                    div: updatedData.div ?? 60,
                    han: updatedData.han ?? 60,
                    kic: updatedData.kic ?? 60,
                    ref: updatedData.ref ?? 60,
                    spd: updatedData.spd ?? 60,
                    pos: value as number,
                };
                const adjusted = applyPhysiqueModifier(rolled, getPhysiqueModifier(height, weight, "GK"));
                updatedData.div = adjusted.div;
                updatedData.han = adjusted.han;
                updatedData.kic = adjusted.kic;
                updatedData.ref = adjusted.ref;
                updatedData.spd = adjusted.spd;
                updatedData.pos = adjusted.pos;
                updatedData.debutOvr = calculateOvrByPosition("GK", adjusted);
            }
            else {
                updatedData.phy = value as number;
                if (position) {
                    const rolled = {
                        pac: updatedData.pac ?? 60,
                        sho: updatedData.sho ?? 60,
                        pas: updatedData.pas ?? 60,
                        dri: updatedData.dri ?? 60,
                        def: updatedData.def ?? 60,
                        phy: value as number,
                    };
                    const adjusted = applyPhysiqueModifier(rolled, getPhysiqueModifier(height, weight, position));
                    updatedData.pac = adjusted.pac;
                    updatedData.sho = adjusted.sho;
                    updatedData.pas = adjusted.pas;
                    updatedData.dri = adjusted.dri;
                    updatedData.def = adjusted.def;
                    updatedData.phy = adjusted.phy;
                    updatedData.debutOvr = calculateOvrByPosition(position, adjusted);
                }
                else {
                    const vals = [updatedData.pac ?? 0, updatedData.sho ?? 0, updatedData.pas ?? 0, updatedData.dri ?? 0, updatedData.def ?? 0, value as number];
                    updatedData.debutOvr = Math.round(vals.reduce((a, b) => a + b, 0) / 6);
                }
            }
            break;
        }
        case 10:
            updatedData.careerLength = value as number;
            break;
        case 11:
            updatedData.leagueId = (value as {
                id: string;
                name: string;
            }).id;
            updatedData.leagueName = (value as {
                id: string;
                name: string;
            }).name;
            // Reset club khi giải đấu thay đổi
            updatedData.clubId = null;
            updatedData.clubName = null;
            break;
        case 12:
            updatedData.clubId = (value as {
                id: string;
                name: string;
            }).id;
            updatedData.clubName = (value as {
                id: string;
                name: string;
            }).name;
            break;
    }
    return updatedData;
}
