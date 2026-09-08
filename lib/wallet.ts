/**
 * Player Wallet — season income calculation.
 * SoT: docs/core-currency-shop-design.md §4. Units: € thousands.
 * Pure TypeScript — no React/Prisma.
 */

// DRAFT 8–10% — SoT §4.1, tune later without touching callers.
export const AGENT_COMMISSION_RATE = 0.08;

export interface SeasonWalletIncomeParams {
  /** € thousands/year, credited 100% — no deduction. */
  currentWageAnnual: number;
  /** € thousands, GROSS fee for a real transfer completed this season. 0/undefined for renewal, FA, or no transfer. */
  transferFeeThisSeason?: number;
}

export interface SeasonWalletIncomeResult {
  wageIncome: number;
  grossTransferFee: number;
  agentCommission: number;
  netTransferIncome: number;
  /** wageIncome + netTransferIncome — apply via Prisma `increment`. */
  totalIncome: number;
}

export function computeSeasonWalletIncome(
  params: SeasonWalletIncomeParams,
): SeasonWalletIncomeResult {
  const wageIncome = Math.max(0, Math.round(params.currentWageAnnual));
  const grossTransferFee = Math.max(0, Math.round(params.transferFeeThisSeason ?? 0));
  const agentCommission = Math.round(grossTransferFee * AGENT_COMMISSION_RATE);
  const netTransferIncome = grossTransferFee - agentCommission;

  return {
    wageIncome,
    grossTransferFee,
    agentCommission,
    netTransferIncome,
    totalIncome: wageIncome + netTransferIncome,
  };
}

export interface WalletLedgerEntry {
  age: number;
  // "shop_purchase" is Wave 2 (not emitted yet) — kept in the union now so the
  // Json column shape doesn't need a second schema change later.
  type: "wage" | "net_transfer_income" | "shop_purchase";
  amount: number;
  label: string;
}

export function buildWalletLedgerEntries(
  age: number,
  income: SeasonWalletIncomeResult,
): WalletLedgerEntry[] {
  const entries: WalletLedgerEntry[] = [];

  if (income.wageIncome > 0) {
    entries.push({
      age,
      type: "wage",
      amount: income.wageIncome,
      label: "Lương mùa giải",
    });
  }

  if (income.grossTransferFee > 0) {
    entries.push({
      age,
      type: "net_transfer_income",
      amount: income.netTransferIncome,
      label: `Phí chuyển nhượng (đã trừ hoa hồng agent ${Math.round(AGENT_COMMISSION_RATE * 100)}%)`,
    });
  }

  return entries;
}

/**
 * Add only the income entries that are not already present for a season.
 *
 * A season can reach the off-season through more than one request (module
 * navigation, a retry after a timeout, or the final season transition). The
 * ledger is therefore the idempotency boundary for money, not the caller's
 * local state or the number of HTTP requests received.
 */
export function appendMissingSeasonIncomeEntries(params: {
  age: number;
  currentWageAnnual: number;
  transferFeeThisSeason?: number;
  ledger: WalletLedgerEntry[];
}): {
  entries: WalletLedgerEntry[];
  ledger: WalletLedgerEntry[];
  creditedIncome: number;
} {
  const income = computeSeasonWalletIncome({
    currentWageAnnual: params.currentWageAnnual,
    transferFeeThisSeason: params.transferFeeThisSeason,
  });
  const entries = buildWalletLedgerEntries(params.age, income).filter(
    (entry) => !params.ledger.some(
      (existing) => existing.age === entry.age && existing.type === entry.type,
    ),
  );

  return {
    entries,
    ledger: [...params.ledger, ...entries],
    creditedIncome: entries.reduce((total, entry) => total + entry.amount, 0),
  };
}
