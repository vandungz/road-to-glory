/** Bump a guide's version only when its explanation materially changes. Targets are stable UI anchors. */
export const guides = {
  home: { version: 1, targets: ["home-modes", "home-account"] },
  classic: { version: 1, targets: ["classic-create", "classic-squads"] },
  squad: { version: 1, targets: ["squad-pitch", "squad-sheet"] },
  profileSetup: { version: 1, targets: ["player-fields", "player-portraits", "player-random"] },
  draft: { version: 1, targets: ["draft-wheel", "draft-result"] },
  career: { version: 1, targets: ["career-wheel", "career-tabs", "career-timeline", "career-honours", "career-shop"] },
  retirement: { version: 1, targets: ["retirement-record", "retirement-save"] },
  transfer: { version: 1, targets: ["transfer-context", "transfer-tabs", "transfer-offers", "transfer-continue"] },
  negotiation: { version: 1, targets: ["negotiation-facts", "negotiation-wages"] },
  shop: { version: 1, targets: ["shop-balance", "shop-items", "shop-continue"] },
  quickSetup: { version: 1, targets: ["quick-fields", "quick-start"] },
  quickPlay: { version: 1, targets: ["quick-wheel", "quick-tracker"] },
  quickSummary: { version: 1, targets: ["quick-totals", "quick-records", "quick-replay"] },
  pve: { version: 1, targets: ["pve-squads"] },
  tournament: { version: 1, targets: ["pve-progress", "pve-round"] },
  profile: { version: 1, targets: ["account-profile", "account-squads"] },
  settings: { version: 1, targets: ["settings-language", "settings-motion"] },
  ballonResult: { version: 1, targets: ["ballon-ranking", "ballon-return"], auto: false },
  // Reading pages need on-demand orientation, not an automatic gameplay tour.
  policy: { version: 1, targets: ["policy-navigation", "policy-contact"], auto: false },
} as const;

export type GuideId = keyof typeof guides;
export type GuideTarget = (typeof guides)[GuideId]["targets"][number];

export function guideStorageKey(id: GuideId): string {
  return `football-life:guide:${id}:v${guides[id].version}`;
}

export function isAutomaticGuide(id: GuideId): boolean {
  return !("auto" in guides[id]) || guides[id].auto !== false;
}
