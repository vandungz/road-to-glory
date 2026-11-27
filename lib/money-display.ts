/** Format € thousands for UI. */
export function formatEuroThousands(k: number): string {
  const euros = k * 1000;
  if (euros >= 1_000_000) {
    const m = euros / 1_000_000;
    return `€${m >= 10 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (euros >= 1_000) {
    return `€${Math.round(euros / 1000)}k`;
  }
  return `€${euros}`;
}

/** Transfer quotes keep two decimals below €10M so club-specific differences remain visible. */
export function formatTransferFee(k: number): string {
  const euros = k * 1000;
  if (euros >= 1_000_000) {
    const millions = euros / 1_000_000;
    return `€${millions >= 10 ? millions.toFixed(1) : millions.toFixed(2)}M`;
  }
  return formatEuroThousands(k);
}

