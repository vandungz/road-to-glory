import assert from "node:assert/strict";
import { appendMissingSeasonIncomeEntries } from "@/lib/wallet";

const firstTransfer = appendMissingSeasonIncomeEntries({
  age: 25,
  currentWageAnnual: 1_000,
  transferFeeThisSeason: 10_000,
  ledger: [],
});

assert.equal(firstTransfer.creditedIncome, 10_200, "Transfer income must be wage plus net fee after agent commission");
assert.equal(firstTransfer.ledger.length, 2);

const retry = appendMissingSeasonIncomeEntries({
  age: 25,
  currentWageAnnual: 1_400,
  transferFeeThisSeason: 12_000,
  ledger: firstTransfer.ledger,
});
assert.equal(retry.creditedIncome, 0, "Retrying transfer/shop hydration must not duplicate the season income");

const nextSeason = appendMissingSeasonIncomeEntries({
  age: 26,
  currentWageAnnual: 1_400,
  ledger: firstTransfer.ledger,
});
assert.equal(nextSeason.creditedIncome, 1_400, "The next season must fetch and credit its own wage");
assert.deepEqual(nextSeason.entries.map((entry) => entry.age), [26]);

console.log("transfer-finance-check: passed");
