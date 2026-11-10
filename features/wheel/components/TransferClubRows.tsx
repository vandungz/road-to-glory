import { Button } from "@/components/ui/Button";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { computeTransferFeeOptions, formatEuroThousands, formatTransferFee, getBuyingPowerBand, type TransferFeeDealOption } from "@/lib/transfer-economy";
import type { ContractOfferCard, ShortlistClubCard } from "@/features/transfer/services/transfer.service";

export function OfferCard({ offer, isProcessing, onAccept }: { offer: ContractOfferCard; isProcessing: boolean; onAccept: () => Promise<void> | void }) {
  const isRenewal = offer.kind === "renewal";
  return <article className={`football-transfer-offer football-transfer-club-row${isRenewal ? " is-renewal" : ""}`}>
    <div className="football-transfer-club-row__identity"><h3>{offer.clubName}</h3><p>{offer.leagueName}</p><small>{offer.reason}</small></div>
    <dl className="football-transfer-club-row__facts">
      <div><dt>Phí chuyển nhượng</dt><dd>{formatTransferFee(offer.transferFee)}</dd></div>
      <div><dt>Lương hàng năm</dt><dd>{formatEuroThousands(offer.wageAnnual)}</dd></div>
      <div><dt>Thời hạn</dt><dd>{offer.contractYears} mùa</dd></div>
      <div><dt>{offer.expectedLeagueApps >= 25 ? "Đá chính dự kiến" : "Xoay vòng dự kiến"}</dt><dd>{offer.expectedLeagueApps} trận</dd></div>
    </dl>
    <div className="football-transfer-club-row__actions"><Button disabled={isProcessing} loading={isProcessing} onClick={() => void onAccept()}>{isRenewal ? "Gia hạn với CLB" : `Đàm phán với ${offer.clubName}`}</Button></div>
  </article>;
}

export function ShortlistCard({ club, selectedDeal, isProcessing, rejected, onDealChange, onApproach }: { club: ShortlistClubCard; selectedDeal: TransferFeeDealOption; isProcessing: boolean; rejected?: { chance: number; reason: string }; onDealChange: (option: TransferFeeDealOption) => void; onApproach: () => void }) {
  const options = computeTransferFeeOptions({ baseFee: club.previewFee, mandatoryBuyout: club.mandatoryBuyout ?? 0, maxFee: getBuyingPowerBand(club.prestige, club.leagueTier).maxFee });
  const canApproach = club.canApproach && !rejected && !isProcessing;
  return <article className={`football-transfer-target football-transfer-club-row${rejected ? " is-rejected" : ""}`}>
    <div className="football-transfer-club-row__identity"><h3>{club.clubName}</h3><p>{club.leagueName}</p><small>Danh tiếng {club.prestige}/5</small></div>
    <dl className="football-transfer-club-row__facts">
      <div><dt>Phí đề xuất</dt><dd>{options[selectedDeal].fee ? formatTransferFee(options[selectedDeal].fee) : "Miễn phí"}</dd></div>
      <div><dt>Lương đề xuất</dt><dd>{formatEuroThousands(club.previewWage)}/năm</dd></div>
      <div><dt>Thời hạn</dt><dd>{club.previewYears} mùa</dd></div>
      <div><dt>Ra sân dự kiến</dt><dd>{club.expectedLeagueApps} trận</dd></div>
    </dl>
    <div className="football-transfer-club-row__actions">
      {rejected ? <p className="football-transfer-feedback is-error">Đã từ chối: {rejected.reason}</p> : club.blockReason ? <p className="football-transfer-feedback is-error">{club.blockReason}</p> : <>
        <FilterSelect label={`Mức phí đề xuất cho ${club.clubName}`} value={selectedDeal} disabled={isProcessing} onChange={(value) => onDealChange(value as TransferFeeDealOption)} options={[
          { value: "discount", label: "Giá mềm", description: "Tăng cơ hội được CLB đồng ý" },
          { value: "standard", label: "Giá thị trường", description: "Mức phí tiêu chuẩn" },
          { value: "premium", label: "Giá cao", description: "Giảm cơ hội được CLB đồng ý" },
        ]} />
        <Button size="sm" disabled={!canApproach} onClick={onApproach}>Ngỏ lời</Button>
      </>}
    </div>
  </article>;
}
