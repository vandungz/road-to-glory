import assert from "node:assert/strict";
import {
  cancelledClubIdsFromWorkflow,
  failedWageOptionsFromWorkflow,
  wageOptionMask,
  wageOptionsFromMask,
  type TransferWorkflowState,
} from "@/features/career/services/transfer-workflow-state.service";
import { findPendingTransferNegotiation } from "@/features/career/services/transfer-market-authority.shared";
import type { TransferMarketResult } from "@/features/transfer/services/transfer.service";

const workflow: TransferWorkflowState = {
  workflowId: "workflow-1",
  status: "selected",
  selectedClubId: "sunderland",
  selectedOfferKind: "transfer",
  selectedMarketCommandId: "market-1",
  version: 2,
  negotiations: [
    {
      clubId: "sunderland",
      offerKind: "transfer",
      status: "active",
      failedWageMask: wageOptionMask("higher"),
      marketCommandId: "market-1",
    },
    {
      clubId: "metz",
      offerKind: "transfer",
      status: "cancelled",
      failedWageMask: wageOptionMask("lower") | wageOptionMask("standard"),
      marketCommandId: "market-1",
    },
  ],
};

assert.deepEqual(wageOptionsFromMask(1 | 4), ["lower", "higher"]);
assert.deepEqual(failedWageOptionsFromWorkflow(workflow, "sunderland"), ["higher"]);
assert.deepEqual([...cancelledClubIdsFromWorkflow(workflow)], ["metz"]);

const offer = {
  kind: "transfer" as const,
  clubId: "sunderland",
  clubName: "Sunderland",
  leagueId: "league-a",
  leagueName: "Test League",
  prestige: 3,
  leagueTier: 1,
  transferFee: 3_660,
  wageAnnual: 883,
  contractYears: 3,
  expectedLeagueApps: 31,
  reason: "Tìm môi trường đá chính",
  canAffordBuyout: true,
};

const market: TransferMarketResult = {
  hasWindow: true,
  marketValue: 3_660,
  mandatoryBuyout: 3_660,
  valuation: { positionWeightedRating: 70, effectivePositionOvr: 70 },
  isUnemployedMarket: false,
  contract: {
    yearsRemaining: 1,
    yearsTotal: 3,
    currentWageAnnual: 800,
    marketValue: 3_660,
    seasonsLeftInCareer: 10,
  },
  renewal: null,
  inbound: [offer],
  shortlist: [],
};

assert.deepEqual(
  findPendingTransferNegotiation([], {}, workflow, market),
  { offer, failedWageOptions: ["higher"] },
);

const clearedWorkflow: TransferWorkflowState = {
  ...workflow,
  status: "idle",
  selectedClubId: null,
  selectedOfferKind: null,
  negotiations: workflow.negotiations,
};
assert.equal(
  findPendingTransferNegotiation([], { transferPendingOffer: { offer } }, clearedWorkflow, market),
  null,
);

console.log("transfer-workflow-state-check: passed");
