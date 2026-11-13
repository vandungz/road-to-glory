"use client";

import { useState } from "react";
import { AppShell } from "@/components/shared/AppShell";
import { PersistentTransferSection } from "@/features/wheel/components/PersistentTransferSection";
import type { TransferMarketResult } from "@/features/transfer/services/transfer.service";

const MOCK: TransferMarketResult = {
  hasWindow: true,
  marketValue: 18500,
  mandatoryBuyout: 22200,
  valuation: {
    positionWeightedRating: 81,
    effectivePositionOvr: 80,
  },
  isUnemployedMarket: false,
  renewal: {
    kind: "renewal",
    clubId: "c1",
    clubName: "Feyenoord",
    leagueId: "eredivisie",
    leagueName: "Eredivisie",
    prestige: 4,
    leagueTier: 1,
    transferFee: 0,
    wageAnnual: 2200,
    contractYears: 3,
    expectedLeagueApps: 28,
    reason: "Gia hạn sớm — giữ chân",
    canAffordBuyout: true,
  },
  inbound: [
    {
      kind: "transfer",
      clubId: "c2",
      clubName: "Brighton",
      leagueId: "epl",
      leagueName: "Premier League",
      prestige: 4,
      leagueTier: 1,
      transferFee: 22200,
      wageAnnual: 3100,
      contractYears: 4,
      expectedLeagueApps: 22,
      reason: "Đề nghị từ CLB ngang tầm",
      canAffordBuyout: true,
    },
    {
      kind: "transfer",
      clubId: "c3",
      clubName: "Wolfsburg",
      leagueId: "bundesliga",
      leagueName: "Bundesliga",
      prestige: 3,
      leagueTier: 1,
      transferFee: 22200,
      wageAnnual: 2600,
      contractYears: 3,
      expectedLeagueApps: 26,
      reason: "Cơ hội đá chính nhiều hơn",
      canAffordBuyout: true,
    },
  ],
  shortlist: [
    {
      clubId: "c4",
      clubName: "Ajax",
      leagueId: "eredivisie",
      leagueName: "Eredivisie",
      prestige: 4,
      leagueTier: 1,
      expectedLeagueApps: 30,
      previewFee: 22200,
      previewWage: 2800,
      previewYears: 4,
      canApproach: true,
      canAffordBuyout: true,
      blockReason: null,
      acceptChance: 0.42,
    },
    {
      clubId: "c5",
      clubName: "St. Pauli",
      leagueId: "bundesliga2",
      leagueName: "2. Bundesliga",
      prestige: 2,
      leagueTier: 2,
      expectedLeagueApps: 30,
      previewFee: 22200,
      previewWage: 900,
      previewYears: 3,
      canApproach: false,
      canAffordBuyout: false,
      blockReason: "CLB không đủ ngân sách phí phá hợp đồng",
      acceptChance: null,
    },
  ],
  contract: {
    yearsRemaining: 1,
    yearsTotal: 3,
    currentWageAnnual: 1800,
    marketValue: 18500,
    seasonsLeftInCareer: 8,
  },
};

export default function TransferWindowPreviewPage() {
  const [log, setLog] = useState("—");
  const [failedSearch, setFailedSearch] = useState(false);

  if (process.env.NODE_ENV === "production") {
    return <p style={{ padding: 24 }}>Preview only in development.</p>;
  }

  return (
    <AppShell className="football-transfer-shell" backHref="/dev/design-preview" backLabel="career" headerMeta={<span role="status">Last action: {log}</span>}>
        <PersistentTransferSection
          market={MOCK}
          currentClubId="c1"
          currentClubName="Feyenoord"
          isProcessing={false}
          approachRejects={{}}
          approachBanner={null}
          onAcceptOffer={(o) => { setLog(`Offer ${o.kind}: ${o.clubName}`); return { resolution: "accepted" }; }}
          onRejectAll={() => setLog("Reject all / stay")}
          onApproachShortlist={(c) => { setLog(`Approach ${c.clubName} (${Math.round((c.acceptChance ?? 0) * 100)}%)`); }}
          onSearchClubs={async ({query,leagueId,prestigeMin}) => {
            if (query === "Ajax") await new Promise((resolve) => setTimeout(resolve, 700));
            if (query === "St. Pauli" && !failedSearch) {
              setFailedSearch(true);
              throw new Error("Temporary search failure");
            }
            const clubs = MOCK.shortlist.filter((c) => (!query || c.clubName.toLowerCase().includes(query.toLowerCase())) && (!leagueId || c.leagueId === leagueId) && (!prestigeMin || c.prestige === prestigeMin));
            return { clubs, totalCount: clubs.length, leagues: [{ id: "eredivisie", name: "Eredivisie", tier: 1 }, { id: "bundesliga", name: "Bundesliga", tier: 1 }] };
          }}
        />

    </AppShell>
  );
}
