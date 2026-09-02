"use client";

import { useState } from "react";
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
  const [willingToMove, setWillingToMove] = useState(false);
  const [log, setLog] = useState("—");

  if (process.env.NODE_ENV === "production") {
    return <p style={{ padding: 24 }}>Preview only in development.</p>;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--rtg-sunken)",
        padding: "32px 24px",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1180,
          backgroundColor: "var(--rtg-paper)",
          border: "1px solid var(--rtg-rule)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ borderBottom: "1px solid var(--rtg-rule)", padding: "18px 30px" }}>
          <p
            style={{
              fontFamily: "var(--font-stamp)",
              fontSize: "0.58rem",
              color: "var(--coral)",
              fontWeight: 700,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            DEV PREVIEW · TRANSFER WINDOW
          </p>
          <h3
            style={{
              fontFamily: "var(--font-headline)",
              fontSize: "1.3rem",
              fontWeight: 900,
              textTransform: "uppercase",
              margin: "4px 0 0",
            }}
          >
            Thị Trường Chuyển Nhượng
          </h3>
        </div>

        <PersistentTransferSection
          market={MOCK}
          currentClubId="c1"
          currentClubName="Feyenoord"
          willingToMove={willingToMove}
          setWillingToMove={setWillingToMove}
          isProcessing={false}
          approachRejects={{}}
          approachBanner={null}
          onAcceptOffer={(o) => setLog(`Offer ${o.kind}: ${o.clubName}`)}
          onRejectAll={() => setLog("Reject all / stay")}
          onApproachShortlist={(c) => { setLog(`Approach ${c.clubName} (${Math.round((c.acceptChance ?? 0) * 100)}%)`); }}
          onProactiveRenewal={() => setLog("Renewal")}
          onSearchClubs={async () => ({ clubs: MOCK.shortlist, totalCount: MOCK.shortlist.length, leagues: [{ id: "eredivisie", name: "Eredivisie", tier: 1 }, { id: "bundesliga", name: "Bundesliga", tier: 1 }] })}
        />

        <p style={{ margin: 0, borderTop: "1px solid var(--rtg-rule)", padding: "12px 30px", color: "var(--rtg-ink-3)", fontSize: "0.75rem" }}>Last action: {log}</p>
      </div>
    </div>
  );
}
