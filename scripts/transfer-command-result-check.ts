import assert from "node:assert/strict";
import {
  transferCommandResultFromOutcome,
  type TransferCommandOutcome,
} from "@/features/career/services/transfer-transition-helpers";

const transfer = {
  commandId: "command-1",
  revision: 12,
  currentAge: 24,
  nextStep: "resolved" as const,
  kind: "transfer" as const,
  clubId: "club-1",
  clubName: "Test FC",
  leagueName: "Test League",
  fee: 100,
  contractYears: 3,
  wageAnnual: 50,
  walletBalance: 900,
  nextAge: 25,
  replayed: false,
};

const accepted = transferCommandResultFromOutcome({ kind: "success", result: transfer });
assert.equal(accepted.status, "accepted");
if (accepted.status === "accepted") assert.equal(accepted.transfer.nextAge, 25);

const rejectedOutcome: TransferCommandOutcome = {
  kind: "failure",
  code: "WAGE_NEGOTIATION_FAILED",
  message: "CLB không chấp nhận mức lương này — hãy chọn một phương án khác.",
  failedWageOptions: ["higher"],
  cancelled: false,
};
const rejected = transferCommandResultFromOutcome(rejectedOutcome);
assert.equal(rejected.status, "rejected");
if (rejected.status === "rejected") {
  assert.equal(rejected.code, "WAGE_NEGOTIATION_FAILED");
  assert.deepEqual(rejected.failedWageOptions, ["higher"]);
  assert.equal(rejected.cancelled, false);
}

const cancelled = transferCommandResultFromOutcome({
  kind: "failure",
  code: "TRANSFER_DEAL_CANCELLED",
  message: "CLB đã mất kiên nhẫn — thương vụ chuyển nhượng bị hủy.",
  failedWageOptions: ["standard", "higher"],
  cancelled: true,
});
assert.equal(cancelled.status, "cancelled");
if (cancelled.status === "cancelled") {
  assert.deepEqual(cancelled.failedWageOptions, ["standard", "higher"]);
  assert.equal(cancelled.cancelled, true);
}

console.log("transfer-command-result-check: passed");
