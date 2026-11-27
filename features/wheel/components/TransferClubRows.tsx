import { useTransferCopy } from "./useTransferCopy";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { FilterSelect } from "@/components/ui/FilterSelect";
import type { TransferFeeDealOption } from "@/lib/transfer-economy";
import { formatEuroThousands, formatTransferFee } from "@/lib/money-display";
import { useTransferDisplay } from "@/features/transfer/hooks/useTransferDisplay";
import type { ContractOfferCard, ShortlistClubCard } from "@/features/transfer/services/transfer.service";

export function OfferCard({ offer, isProcessing, pending, onAccept }: { offer: ContractOfferCard; isProcessing: boolean; pending?: boolean; onAccept: () => Promise<void> | void }) {
  const ui = useTranslations("ui");
  const t = useTranslations("transfer");
  const copy = useTransferCopy();
  const isRenewal = offer.kind === "renewal";
  return <article className={`football-transfer-offer football-transfer-club-row${isRenewal ? " is-renewal" : ""}`}>
    <div className="football-transfer-club-row__identity"><h3>{offer.clubName}</h3><p>{offer.leagueName}</p><small>{copy(offer.reason, "interest")}</small></div>
    <dl className="football-transfer-club-row__facts">
      <div><dt>{ui("transferFee")}</dt><dd>{formatTransferFee(offer.transferFee)}</dd></div>
      <div><dt>{ui("annualWage")}</dt><dd>{formatEuroThousands(offer.wageAnnual)}</dd></div>
      <div><dt>{ui("term")}</dt><dd>{ui("seasonCount", { count: offer.contractYears })}</dd></div>
      <div><dt>{offer.expectedLeagueApps >= 25 ? ui("projectedStarts") : ui("projectedRotation")}</dt><dd>{t("appCount", { count: offer.expectedLeagueApps })}</dd></div>
    </dl>
    <div className="football-transfer-club-row__actions"><Button disabled={isProcessing} loading={pending} onClick={() => void onAccept()}>{isRenewal ? ui("extendContract") : ui("negotiateWith", { v0: String(offer.clubName) })}</Button></div>
  </article>;
}

export function ShortlistCard({ club, selectedDeal, isProcessing, pending, rejected, onDealChange, onApproach }: { club: ShortlistClubCard; selectedDeal: TransferFeeDealOption; isProcessing: boolean; pending?: boolean; rejected?: { chance: number; reason: string }; onDealChange: (option: TransferFeeDealOption) => void; onApproach: () => void }) {
  const ui = useTranslations("ui");
  const t = useTranslations("transfer");
  const copy = useTransferCopy();
  const display = useTransferDisplay({kind:"fee",baseFee:club.previewFee,buyout:club.mandatoryBuyout ?? 0,prestige:club.prestige,tier:club.leagueTier});
  const fee = display.data?.kind === "fee" ? display.data.fees[selectedDeal] : null;
  const canApproach = club.canApproach && !rejected && !isProcessing && fee !== null;
  return <article className={`football-transfer-target football-transfer-club-row${rejected ? " is-rejected" : ""}`}>
    <div className="football-transfer-club-row__identity"><h3>{club.clubName}</h3><p>{club.leagueName}</p><small>{ui("prestige")} {club.prestige}/5</small></div>
    <dl className="football-transfer-club-row__facts">
      <div><dt>{ui("proposedFee")}</dt><dd>{fee === null ? "…" : fee ? formatTransferFee(fee) : ui("freeTransfer")}</dd></div>
      <div><dt>{ui("proposedWage")}</dt><dd>{formatEuroThousands(club.previewWage)}{ui("yr")}</dd></div>
      <div><dt>{ui("term")}</dt><dd>{ui("seasonCount", { count: club.previewYears })}</dd></div>
      <div><dt>{ui("projectedAppearances")}</dt><dd>{t("appCount", { count: club.expectedLeagueApps })}</dd></div>
    </dl>
    <div className="football-transfer-club-row__actions">
      {display.error && <Button onClick={display.retry}>{ui("connectionError")}</Button>}
      {rejected ? <p className="football-transfer-feedback is-error">{copy(rejected.reason)}</p> : club.blockReason ? <p className="football-transfer-feedback is-error">{copy(club.blockReason, "approachUnavailable")}</p> : <>
        <FilterSelect label={ui("proposedFeeFor", { v0: String(club.clubName) })} value={selectedDeal} disabled={isProcessing} onChange={(value) => onDealChange(value as TransferFeeDealOption)} options={[
          { value: "discount", label: ui("lowerFee"), description: ui("moreLikelyToBeAccepted") },
          { value: "standard", label: ui("marketValueFee"), description: ui("standardFee") },
          { value: "premium", label: ui("higherFee"), description: ui("lessLikelyToBeAccepted") },
        ]} />
        <Button size="sm" disabled={!canApproach} loading={pending} onClick={onApproach}>{ui("approach")}</Button>
      </>}
    </div>
  </article>;
}
