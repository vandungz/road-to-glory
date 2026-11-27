"use client";
import { ScrollArea } from "@/components/ui/ScrollArea";


import { PageGuide } from "@/features/onboarding/GuideProvider";
import { CoachMark } from "@/features/onboarding/CoachMark";
import { useTranslations } from "next-intl";
import { useId, type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EditorialArt } from "@/components/shared/EditorialArt";
import type { WageDealOption } from "@/lib/salary-negotiation";
import { useTransferDisplay } from "@/features/transfer/hooks/useTransferDisplay";
import { formatEuroThousands, formatTransferFee } from "@/lib/money-display";
import type { ContractOfferCard } from "@/features/transfer/services/transfer.service";

export function TransferNegotiationPanel({ offer, selected, failed, processing, onSelect, onSubmit, onBack, children }: {
  offer: ContractOfferCard; selected: WageDealOption; failed: WageDealOption[]; processing: boolean;
  onSelect: (option: WageDealOption) => void; onSubmit: () => void; onBack: () => void; children?: ReactNode;
}) {
  const ui = useTranslations("ui");
  const t = useTranslations("transfer");
  const name = useId();
  const display = useTransferDisplay({kind:"wage",wage:offer.wageAnnual,prestige:offer.prestige,tier:offer.leagueTier,apps:offer.expectedLeagueApps});
  const options = display.data?.kind === "wage" ? display.data.options : null;
  const mood = Math.max(0, 100 - failed.length * 50);
  return <ScrollArea as="section" data-mount="panel" className="football-transfer-negotiation football-contract-negotiation">
    <PageGuide id="negotiation" paused={processing} />
    <div className="football-contract-negotiation__copy">
      <ScrollArea className="football-contract-negotiation__body">
      <button type="button" className="football-transfer-back" disabled={processing} onClick={onBack}><ArrowLeft aria-hidden="true" size={16} />{ui("backToOffers")}</button>
      <h1>{t("dealHeading", { club: offer.clubName })}</h1>
      <p>{t("chooseWage", { count: offer.contractYears })}</p>
      <dl className="football-contract-negotiation__facts" data-guide="negotiation-facts">
        <div><dt>{ui("transferFee")}</dt><dd>{offer.transferFee ? formatTransferFee(offer.transferFee) : ui("freeTransfer")}</dd></div>
        <div><dt>{ui("term")}</dt><dd>{ui("seasonCount", { count: offer.contractYears })}</dd></div>
      </dl>
      <div className="football-contract-negotiation__mood">
        <div><span>{ui("clubInterest")}</span><strong>{mood}%</strong></div>
        <div role="progressbar" aria-label={ui("clubInterest")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={mood}><span style={{ transform: `scaleX(${mood / 100})` }} /></div>
      </div>
      {children}
      <CoachMark target="negotiation-wages" />
      {display.error && <Button onClick={display.retry}>{ui("connectionError")}</Button>}
      <fieldset className="football-contract-negotiation__options" data-guide="negotiation-wages" disabled={processing}>
        <legend>{ui("wageOptions")}</legend>
        {(["lower", "standard", "higher"] as const).map((option) => {
          const unavailable = failed.includes(option);
          const chance = options?.[option].chance ?? 0;
          return <label key={option} data-selected={selected === option} data-unavailable={unavailable}>
            <input type="radio" name={name} value={option} checked={selected === option} disabled={unavailable} onChange={() => onSelect(option)} />
            <span><span>{option === "lower" ? ui("lowerWage") : option === "higher" ? ui("higherWage") : ui("keepOffer")}</span><strong>{options ? formatEuroThousands(options[option].wage) : "…"}{ui("yr")}</strong></span>
            <span>{unavailable ? ui("declined") : ui("acceptance", { v0: String(chance) })}</span>
          </label>;
        })}
      </fieldset>
      </ScrollArea>
      <Button size="lg" fullWidth loading={processing} disabled={processing || !options || failed.includes(selected)} onClick={onSubmit}>{ui("submitWageProposal")}</Button>
    </div>
    <aside className="football-contract-negotiation__art" aria-hidden="true"><EditorialArt asset="contract-signing" priority /></aside>
  </ScrollArea>;
}
