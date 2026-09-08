import assert from "node:assert/strict";
import { calculateContinentalQualification } from "@/features/wheel/lib/simulation-helpers";
import {
  appendMissingSeasonIncomeEntries,
  type WalletLedgerEntry,
} from "@/lib/wallet";

assert.equal(calculateContinentalQualification("ENG1", 13), "none");
assert.equal(calculateContinentalQualification("ENG1", 2), "UCL");
assert.equal(calculateContinentalQualification("FRA1", 3), "UEL");

const first = appendMissingSeasonIncomeEntries({
  age: 18,
  currentWageAnnual: 5_400,
  ledger: [],
});
assert.equal(first.creditedIncome, 5_400);
assert.deepEqual(first.entries, [{
  age: 18,
  type: "wage",
  amount: 5_400,
  label: "Lương mùa giải",
} satisfies WalletLedgerEntry]);

const retry = appendMissingSeasonIncomeEntries({
  age: 18,
  currentWageAnnual: 5_400,
  ledger: first.ledger,
});
assert.equal(retry.creditedIncome, 0);
assert.deepEqual(retry.ledger, first.ledger);

const transfer = appendMissingSeasonIncomeEntries({
  age: 19,
  currentWageAnnual: 6_000,
  transferFeeThisSeason: 13_000,
  ledger: [],
});
assert.equal(transfer.creditedIncome, 17_960);
assert.deepEqual(transfer.entries.map((entry) => entry.type), ["wage", "net_transfer_income"]);

console.log("season projection checks passed");
