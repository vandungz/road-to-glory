// 10. Tính toán OVR theo trọng số vị trí thi đấu thực tế (Weighted OVR)
export function calculateOvrByPosition(position: string, stats: Record<string, number>): number {
  let ovr = 0;

  switch (position) {
    case "GK": {
      const { ref = 60, div = 60, han = 60, pos: gkPos = 60, kic = 60, spd = 60 } = stats;
      ovr = ref * 0.25 + div * 0.25 + han * 0.20 + gkPos * 0.15 + kic * 0.10 + spd * 0.05;
      break;
    }
    default: {
      const { pac = 60, sho = 60, pas = 60, dri = 60, def = 60, phy = 60 } = stats;
      switch (position) {
        case "CB":
          ovr = def * 0.40 + phy * 0.30 + pac * 0.20 + pas * 0.10;
          break;
        case "LB":
        case "RB":
          ovr = pac * 0.30 + def * 0.30 + pas * 0.20 + dri * 0.10 + phy * 0.10;
          break;
        case "CDM":
          ovr = def * 0.35 + phy * 0.30 + pas * 0.20 + dri * 0.10 + pac * 0.05;
          break;
        case "CM":
          ovr = pas * 0.30 + dri * 0.25 + phy * 0.20 + def * 0.15 + sho * 0.10;
          break;
        case "CAM":
          ovr = pas * 0.35 + dri * 0.30 + sho * 0.25 + pac * 0.10;
          break;
        case "LW":
        case "RW":
          ovr = pac * 0.35 + dri * 0.30 + sho * 0.20 + pas * 0.15;
          break;
        case "LM":
        case "RM":
          ovr = dri * 0.30 + pac * 0.30 + pas * 0.25 + def * 0.10 + phy * 0.05;
          break;
        case "ST":
          ovr = sho * 0.40 + pac * 0.25 + dri * 0.20 + phy * 0.10 + pas * 0.05;
          break;
        default:
          ovr = (pac + sho + pas + dri + def + phy) / 6;
      }
    }
  }

  return Math.round(ovr);
}

// ============================================================
