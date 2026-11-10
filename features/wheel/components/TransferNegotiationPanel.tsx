"use client";

import { useId, type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EditorialArt } from "@/components/shared/EditorialArt";
import { computeWageOptions, computeWageAgreementChance, type WageDealOption } from "@/lib/salary-negotiation";
import { approachChancePercent, formatEuroThousands, formatTransferFee } from "@/lib/transfer-economy";
import type { ContractOfferCard } from "@/features/transfer/services/transfer.service";

export function TransferNegotiationPanel({ offer, selected, failed, processing, onSelect, onSubmit, onBack, children }: {
  offer: ContractOfferCard; selected: WageDealOption; failed: WageDealOption[]; processing: boolean;
  onSelect: (option: WageDealOption) => void; onSubmit: () => void; onBack: () => void; children?: ReactNode;
}) {
  const name = useId();
  const options = computeWageOptions({ baseWage: offer.wageAnnual, minWage: Math.max(1, Math.round(offer.wageAnnual * .7)), maxWage: Math.round(offer.wageAnnual * 1.5) });
  const mood = Math.max(0, 100 - failed.length * 50);
  return <section className="football-transfer-negotiation football-contract-negotiation">
    <div className="football-contract-negotiation__copy">
      <div className="football-contract-negotiation__body">
      <button type="button" className="football-transfer-back" disabled={processing} onClick={onBack}><ArrowLeft aria-hidden="true" size={16} />Danh sách đề nghị</button>
      <h1>Hợp đồng với {offer.clubName}</h1>
      <p>Chọn mức lương cho hợp đồng {offer.contractYears} mùa.</p>
      <dl className="football-contract-negotiation__facts">
        <div><dt>Phí chuyển nhượng</dt><dd>{offer.transferFee ? formatTransferFee(offer.transferFee) : "Miễn phí"}</dd></div>
        <div><dt>Thời hạn</dt><dd>{offer.contractYears} mùa</dd></div>
      </dl>
      <div className="football-contract-negotiation__mood">
        <div><span>Thiện chí đàm phán</span><strong>{mood}%</strong></div>
        <div role="progressbar" aria-label="Thiện chí đàm phán" aria-valuemin={0} aria-valuemax={100} aria-valuenow={mood}><span style={{ transform: `scaleX(${mood / 100})` }} /></div>
      </div>
      {children}
      <fieldset className="football-contract-negotiation__options" disabled={processing}>
        <legend>Phương án lương</legend>
        {(["lower", "standard", "higher"] as const).map((option) => {
          const unavailable = failed.includes(option);
          const chance = approachChancePercent(computeWageAgreementChance({ option, baseWage: offer.wageAnnual, clubPrestige: offer.prestige, leagueTier: offer.leagueTier, expectedLeagueApps: offer.expectedLeagueApps }));
          return <label key={option} data-selected={selected === option} data-unavailable={unavailable}>
            <input type="radio" name={name} value={option} checked={selected === option} disabled={unavailable} onChange={() => onSelect(option)} />
            <span><span>{option === "lower" ? "Giảm lương" : option === "higher" ? "Tăng lương" : "Giữ mức đề nghị"}</span><strong>{formatEuroThousands(options[option].wageAnnual)}/năm</strong></span>
            <span>{unavailable ? "Đã từ chối" : `${chance}% chấp nhận`}</span>
          </label>;
        })}
      </fieldset>
      </div>
      <Button size="lg" fullWidth loading={processing} disabled={processing || failed.includes(selected)} onClick={onSubmit}>Gửi đề nghị lương</Button>
    </div>
    <aside className="football-contract-negotiation__art" aria-hidden="true"><EditorialArt asset="contract-signing" priority /></aside>
  </section>;
}
