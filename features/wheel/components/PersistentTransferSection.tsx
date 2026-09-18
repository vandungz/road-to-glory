"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Search, X } from "lucide-react";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  formatEuroThousands,
  formatTransferFee,
  approachChancePercent,
  computeTransferFeeOptions,
  getBuyingPowerBand,
  type TransferFeeDealOption,
} from "@/lib/transfer-economy";
import { computeWageAgreementChance, computeWageOptions, type WageDealOption } from "@/lib/salary-negotiation";
import type { ContractOfferCard, PendingTransferNegotiation, ShortlistClubCard, TransferDealResolution, TransferMarketResult } from "@/features/transfer/services/transfer.service";
import type { ApproachRejectState } from "./TransferWindowPanel";

interface SearchResult {
  clubs: ShortlistClubCard[];
  totalCount: number;
  leagues: Array<{ id: string; name: string; tier: number }>;
}

export interface PersistentTransferSectionProps {
  market: TransferMarketResult;
  currentClubId?: string | null;
  currentClubName?: string;
  proactiveRenewalRejected?: boolean;
  willingToMove: boolean;
  setWillingToMove: (v: boolean) => void;
  isProcessing: boolean;
  onAcceptOffer: (offer: ContractOfferCard, wageOption?: WageDealOption) => Promise<TransferDealResolution> | TransferDealResolution;
  onRejectAll: () => void;
  onApproachShortlist: (club: ShortlistClubCard, feeOption?: TransferFeeDealOption) => Promise<boolean> | void;
  onProactiveRenewal: (wageOption?: WageDealOption) => Promise<boolean> | void;
  onSearchClubs: (params: {
    currentClubId?: string | null;
    query?: string;
    leagueId?: string;
    prestigeMin?: number;
    prestigeMax?: number;
    page: number;
  }) => Promise<SearchResult>;
  approachRejects: ApproachRejectState;
  approachBanner: string | null;
  onClose?: () => void;
  acceptedOffer?: ContractOfferCard | null;
  onClearAcceptedOffer?: () => Promise<void> | void;
  onSelectOffer?: (offer: ContractOfferCard) => Promise<PendingTransferNegotiation | null> | PendingTransferNegotiation | null;
}

function OfferCard({ offer, isProcessing, onAccept }: { offer: ContractOfferCard; isProcessing: boolean; onAccept: () => Promise<void> | void }) {
  const isRenewal = offer.kind === "renewal";
  return (
    <article className={`rtg-transfer-offer${isRenewal ? " is-renewal" : ""}`}>
      <div className="rtg-transfer-offer__topline"><span className="rtg-eyebrow">{isRenewal ? "Đề nghị gia hạn" : "Đề nghị chuyển nhượng"}</span><strong>{formatTransferFee(offer.transferFee)}</strong></div>
      <h3>{offer.clubName}</h3>
      <p className="rtg-transfer-offer__league">{offer.leagueName} · {offer.reason}</p>
      <div className="rtg-transfer-offer__details">
        <span><small>Lương hàng năm</small><strong>{formatEuroThousands(offer.wageAnnual)}</strong></span>
        <span><small>Thời hạn</small><strong>{offer.contractYears} mùa</strong></span>
        <span><small>Vai trò dự kiến</small><strong>{offer.expectedLeagueApps >= 25 ? "Đá chính" : "Xoay vòng"}</strong></span>
        <span><small>Cơ hội đá mùa</small><strong>{offer.expectedLeagueApps} trận</strong></span>
      </div>
      <Button size="lg" fullWidth disabled={isProcessing} loading={isProcessing} onClick={() => void onAccept()}>{isRenewal ? "Gia hạn với CLB" : `Đàm phán với ${offer.clubName}`} <ArrowRight aria-hidden="true" size={15} /></Button>
    </article>
  );
}

function ShortlistCard({ club, selectedDeal, isProcessing, rejected, onDealChange, onApproach }: { club: ShortlistClubCard; selectedDeal: TransferFeeDealOption; isProcessing: boolean; rejected?: { chance: number; reason: string }; onDealChange: (option: TransferFeeDealOption) => void; onApproach: () => void }) {
  const options = computeTransferFeeOptions({ baseFee: club.previewFee, mandatoryBuyout: club.mandatoryBuyout ?? 0, maxFee: getBuyingPowerBand(club.prestige, club.leagueTier).maxFee });
  const canApproach = club.canApproach && !rejected && !isProcessing;
  const dealTone = selectedDeal === "discount" ? "is-discount" : selectedDeal === "premium" ? "is-premium" : "is-standard";
  return (
    <article className={`rtg-transfer-target${rejected ? " is-rejected" : ""}`}>
      <div className="rtg-transfer-target__heading"><div><h3>{club.clubName}</h3><p>{club.leagueName} · Độ phù hợp {club.prestige}/5</p></div><strong>{club.expectedLeagueApps} trận</strong></div>
      <div className="rtg-transfer-target__meta"><span>Phí đề xuất <b>{options[selectedDeal].fee ? formatTransferFee(options[selectedDeal].fee) : "Miễn phí"}</b></span><span>Lương đề xuất <b>{formatEuroThousands(club.previewWage)}/năm</b></span></div>
      {rejected ? <p className="rtg-transfer-feedback is-error">Đã từ chối · {rejected.reason}</p> : club.blockReason ? <p className="rtg-transfer-feedback is-error">{club.blockReason}</p> : (
        <div className={`rtg-transfer-target__actions ${dealTone}`}><select aria-label={`Mức phí đề xuất cho ${club.clubName}`} value={selectedDeal} disabled={isProcessing} onChange={(event) => onDealChange(event.target.value as TransferFeeDealOption)}><option value="discount">Giá mềm · tăng cơ hội</option><option value="standard">Giá thị trường</option><option value="premium">Giá cao · giảm cơ hội</option></select><Button size="sm" disabled={!canApproach} onClick={onApproach}>Ngỏ lời</Button></div>
      )}
    </article>
  );
}

export function PersistentTransferSection({ market, currentClubId, currentClubName, proactiveRenewalRejected = false, willingToMove, setWillingToMove, isProcessing, onAcceptOffer, onRejectAll, onApproachShortlist, onProactiveRenewal, onSearchClubs, approachRejects, approachBanner, onClose, acceptedOffer, onClearAcceptedOffer, onSelectOffer }: PersistentTransferSectionProps) {
  const { contract, renewal, inbound, shortlist, isUnemployedMarket } = market;
  const visibleRenewal = proactiveRenewalRejected ? null : renewal;
  const [activeTab, setActiveTab] = useState<"renewal" | "inbound" | "shortlist">(inbound.length > 0 ? "inbound" : "renewal");
  const [feeDeals, setFeeDeals] = useState<Record<string, TransferFeeDealOption>>({});
  const [wageDeal, setWageDeal] = useState<WageDealOption>("standard");
  const [failedWageOptions, setFailedWageOptions] = useState<WageDealOption[]>([]);
  const [cancelledOffer, setCancelledOffer] = useState<ContractOfferCard | null>(null);
  const [excludedClubIds, setExcludedClubIds] = useState<Set<string>>(new Set());
  const [pendingOffer, setPendingOffer] = useState<ContractOfferCard | null>(acceptedOffer ?? null);
  const [query, setQuery] = useState("");
  const [league, setLeague] = useState("all");
  const [prestige, setPrestige] = useState("all");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState<SearchResult>({ clubs: shortlist, totalCount: shortlist.length, leagues: [] });
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef(onSearchClubs);

  useEffect(() => { searchRef.current = onSearchClubs; }, [onSearchClubs]);
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const result = await searchRef.current({ currentClubId, query: query || undefined, leagueId: league === "all" ? undefined : league, prestigeMin: prestige === "all" ? undefined : Number(prestige), prestigeMax: prestige === "all" ? undefined : Number(prestige), page });
        if (active) setSearch({ ...result, clubs: result.clubs.filter((club) => club.clubId !== currentClubId && !excludedClubIds.has(club.clubId)) });
      } catch (error) {
        console.error("Failed to search transfer clubs:", error);
      } finally {
        if (active) setIsSearching(false);
      }
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [currentClubId, query, league, prestige, page, excludedClubIds]);

  const isFreeAgent = contract.yearsRemaining <= 0 || isUnemployedMarket;
  const currentClub = currentClubName ?? (visibleRenewal?.clubName || "CLB hiện tại");
  const visibleInbound = inbound.filter((offer) => !excludedClubIds.has(offer.clubId));
  const visibleSearchClubs = search.clubs.filter((club) => !excludedClubIds.has(club.clubId));
  const totalPages = Math.max(1, Math.ceil(visibleSearchClubs.length / 8));
  async function beginWageNegotiation(offer: ContractOfferCard) {
    const persistedSelection = onSelectOffer
      ? await onSelectOffer(offer)
      : { offer, failedWageOptions: [] };
    if (!persistedSelection) return;
    setPendingOffer(persistedSelection.offer);
    setCancelledOffer(null);
    setFailedWageOptions(persistedSelection.failedWageOptions);
    const nextWageOption = (["lower", "standard", "higher"] as WageDealOption[]).find((option) => !persistedSelection.failedWageOptions.includes(option));
    setWageDeal(nextWageOption ?? "standard");
  }
  useEffect(() => {
    if (acceptedOffer) {
      setPendingOffer(acceptedOffer);
      setCancelledOffer(null);
      setFailedWageOptions([]);
      setWageDeal("standard");
    }
  }, [acceptedOffer]);
  useEffect(() => {
    if (failedWageOptions.includes(wageDeal)) {
      const nextOption = (["lower", "standard", "higher"] as WageDealOption[]).find((option) => !failedWageOptions.includes(option));
      if (nextOption) setWageDeal(nextOption);
    }
  }, [failedWageOptions, wageDeal]);
  const wageOptions = pendingOffer
    ? computeWageOptions({ baseWage: pendingOffer.wageAnnual, minWage: Math.max(1, Math.round(pendingOffer.wageAnnual * 0.7)), maxWage: Math.round(pendingOffer.wageAnnual * 1.5) })
    : null;
  const wageMood = Math.max(0, 100 - failedWageOptions.length * 50);
  const pendingContent = pendingOffer && wageOptions ? (
    <section className="rtg-transfer-panel rtg-transfer-negotiation">
      <button type="button" className="rtg-transfer-back" onClick={() => { setPendingOffer(null); void onClearAcceptedOffer?.(); }}>← Về danh sách lời đề nghị</button>
      <div className="rtg-transfer-panel__heading"><span className="rtg-eyebrow">Bước 2 · đàm phán lương</span><h2>Chốt hợp đồng với {pendingOffer.clubName}</h2><p>Phí chuyển nhượng đã được CLB chấp thuận. Mức lương cuối cùng vẫn cần được đồng ý.</p></div>
      <div className="rtg-transfer-offer__details"><span><small>Phí chuyển nhượng</small><strong>{pendingOffer.transferFee ? formatTransferFee(pendingOffer.transferFee) : "Miễn phí"}</strong></span><span><small>Thời hạn</small><strong>{pendingOffer.contractYears} mùa</strong></span></div>
      <div className="rtg-transfer-mood" aria-label={`Mức độ vui vẻ của ${pendingOffer.clubName}: ${wageMood}%`}><div><small>Mức độ vui vẻ của CLB</small><strong>{wageMood}%</strong></div><div className="rtg-transfer-mood__track"><span style={{ width: `${wageMood}%`, backgroundColor: wageMood <= 50 ? "var(--rtg-accent)" : "var(--rtg-positive)" }} /></div><p>{wageMood === 100 ? "CLB vẫn đang sẵn sàng thương lượng." : "Một phương án đã bị từ chối. Nếu thanh cạn, thương vụ sẽ bị hủy."}</p></div>
      <div className="rtg-transfer-wage-options">{(["lower", "standard", "higher"] as WageDealOption[]).map((option) => { const chance = approachChancePercent(computeWageAgreementChance({ option, baseWage: pendingOffer.wageAnnual, clubPrestige: pendingOffer.prestige, leagueTier: pendingOffer.leagueTier, expectedLeagueApps: pendingOffer.expectedLeagueApps })); const failed = failedWageOptions.includes(option); return <button type="button" key={option} disabled={failed || isProcessing} aria-disabled={failed} className={`${wageDeal === option ? "is-active" : ""}${failed ? " is-rejected" : ""}`} onClick={() => setWageDeal(option)}><span>{failed ? "Đã bị từ chối" : wageOptions[option].label}</span><strong>{formatEuroThousands(wageOptions[option].wageAnnual)}/năm</strong><small>{failed ? "Không thể chọn lại" : `${option === "lower" ? "Dễ được chấp nhận hơn" : option === "higher" ? "Có thể bị từ chối" : "Cân bằng"} · Cơ hội ${chance}%`}</small></button>; })}</div>
      <Button size="lg" fullWidth disabled={isProcessing || failedWageOptions.includes(wageDeal)} loading={isProcessing} onClick={async () => { const resolution = await onAcceptOffer(pendingOffer, wageDeal); if (resolution === "accepted") { setPendingOffer(null); onClearAcceptedOffer?.(); } else if (resolution === "rejected") { setFailedWageOptions((previous) => [...new Set([...previous, wageDeal])]); } else if (resolution === "cancelled") { setExcludedClubIds((previous) => new Set(previous).add(pendingOffer.clubId)); setPendingOffer(null); onClearAcceptedOffer?.(); setCancelledOffer(pendingOffer); } }}>Chốt mức lương & hoàn tất</Button>
    </section>
  ) : null;
  const cancelledContent = cancelledOffer ? (
    <section className="rtg-transfer-panel rtg-transfer-negotiation rtg-transfer-negotiation--cancelled">
      <span className="rtg-eyebrow">Đàm phán kết thúc</span>
      <h2>Thương vụ với {cancelledOffer.clubName} đã bị hủy</h2>
      <p>CLB đã từ chối hai phương án lương. Offer này không còn hiệu lực và CLB sẽ không xuất hiện lại trong danh sách mùa này.</p>
      <Button size="lg" fullWidth onClick={() => { setCancelledOffer(null); setActiveTab("shortlist"); setPage(1); }}>Quay lại danh sách CLB</Button>
    </section>
  ) : null;
  const content = (
    <section className="rtg-transfer-window">
      <header className="rtg-transfer-window__header"><div><span className="rtg-eyebrow">Cửa sổ chuyển nhượng · {contract.seasonsLeftInCareer} mùa còn lại</span><h1>{inbound.length > 1 ? `${inbound.length} lời đề nghị` : "Cửa sổ chuyển nhượng"}</h1><p>Chọn hướng đi tiếp theo cho sự nghiệp của bạn.</p></div>{onClose && <button type="button" className="rtg-icon-button" onClick={onClose} aria-label="Đóng cửa sổ chuyển nhượng"><X aria-hidden="true" size={18} /></button>}</header>
      <div className="rtg-transfer-window__context"><span><small>Đang ở</small><strong>{isUnemployedMarket ? "Cầu thủ tự do" : currentClub}</strong></span><span><small>Lương hiện tại</small><strong>{formatEuroThousands(contract.currentWageAnnual)}/năm</strong></span><span><small>Hợp đồng còn lại</small><strong>{isUnemployedMarket ? "Không có HĐ" : `${contract.yearsRemaining}/${contract.yearsTotal} mùa`}</strong></span><span><small>Giá trị thị trường</small><strong>{formatEuroThousands(contract.marketValue)}</strong></span><label className={willingToMove ? "is-active" : ""}><input type="checkbox" checked={willingToMove} disabled={isProcessing || isUnemployedMarket} onChange={(event) => setWillingToMove(event.target.checked)} /> Sẵn sàng lắng nghe đề nghị</label></div>
      {approachBanner && <p className="rtg-transfer-feedback is-banner" role="status">{approachBanner}</p>}
      <nav className="rtg-transfer-tabs" aria-label="Các lựa chọn chuyển nhượng"><button type="button" className={activeTab === "renewal" ? "is-active" : ""} onClick={() => setActiveTab("renewal")}>Ở lại {visibleRenewal ? "· đề nghị" : ""}</button><button type="button" className={activeTab === "inbound" ? "is-active" : ""} onClick={() => setActiveTab("inbound")}>Lời đề nghị <b>{visibleInbound.length}</b></button><button type="button" className={activeTab === "shortlist" ? "is-active" : ""} onClick={() => setActiveTab("shortlist")}>Tìm CLB chủ động <b>{visibleSearchClubs.length}</b></button></nav>

      <div className="rtg-transfer-window__body">
        {activeTab === "renewal" && <div className="rtg-transfer-panel"><div className="rtg-transfer-panel__heading"><span className="rtg-eyebrow">Lựa chọn an toàn</span><h2>Tiếp tục tại {currentClub}</h2><p>Giữ vai trò, mức lương và môi trường hiện tại cho mùa giải tiếp theo.</p></div>{visibleRenewal ? <div className="rtg-transfer-renewal"><div><span>Đề nghị gia hạn</span><strong>{visibleRenewal.contractYears} mùa</strong></div><div><span>Lương mới</span><strong>{formatEuroThousands(visibleRenewal.wageAnnual)}/năm</strong></div><div><span>Vai trò dự kiến</span><div className="rtg-transfer-renewal__role"><strong>{visibleRenewal.expectedLeagueApps >= 25 ? "Đá chính" : "Xoay vòng"}</strong><small>· {visibleRenewal.expectedLeagueApps} trận/mùa</small></div></div><Button size="lg" disabled={isProcessing || proactiveRenewalRejected} loading={isProcessing} onClick={() => void onProactiveRenewal("standard")}>{proactiveRenewalRejected ? "Đề nghị đã bị từ chối" : "Đàm phán gia hạn"}</Button></div> : <p className="rtg-transfer-empty">CLB hiện tại chưa gửi đề nghị gia hạn. Bạn có thể xem lời đề nghị khác hoặc tìm CLB mới.</p>}</div>}
        {activeTab === "inbound" && <div className="rtg-transfer-panel"><div className="rtg-transfer-panel__heading"><span className="rtg-eyebrow">Các CLB đang hỏi mua</span><h2>Chọn lời đề nghị phù hợp</h2><p>Chọn lời đề nghị trước, sau đó chốt lương ở bước cuối.</p></div><div className="rtg-transfer-offers">{visibleInbound.length > 0 ? visibleInbound.map((offer) => <OfferCard key={`${offer.clubId}-${offer.kind}`} offer={offer} isProcessing={isProcessing} onAccept={() => beginWageNegotiation(offer)} />) : <p className="rtg-transfer-empty">Chưa có CLB nào gửi đề nghị mùa này.</p>}</div></div>}
        {activeTab === "shortlist" && <div className="rtg-transfer-panel"><div className="rtg-transfer-panel__heading"><span className="rtg-eyebrow">Chủ động định hướng</span><h2>Tìm CLB phù hợp</h2><p>Chọn mức phí ở bước mở lời; lương sẽ được đàm phán sau khi CLB đồng ý.</p></div><div className="rtg-transfer-search"><label><Search aria-hidden="true" size={16} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Tìm theo tên CLB..." /></label><select aria-label="Lọc theo giải đấu" value={league} onChange={(event) => { setLeague(event.target.value); setPage(1); }}><option value="all">Tất cả giải đấu</option>{search.leagues.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select aria-label="Lọc theo danh tiếng" value={prestige} onChange={(event) => { setPrestige(event.target.value); setPage(1); }}><option value="all">Mọi mức danh tiếng</option><option value="5">5 sao</option><option value="4">4 sao</option><option value="3">3 sao</option><option value="2">2 sao</option><option value="1">1 sao</option></select></div>{isSearching ? <p className="rtg-transfer-empty">Đang tìm CLB...</p> : visibleSearchClubs.length > 0 ? <div className="rtg-transfer-targets">{visibleSearchClubs.map((club) => <ShortlistCard key={club.clubId} club={club} selectedDeal={feeDeals[club.clubId] ?? "standard"} isProcessing={isProcessing} rejected={approachRejects[club.clubId]} onDealChange={(option) => setFeeDeals((previous) => ({ ...previous, [club.clubId]: option }))} onApproach={() => void onApproachShortlist(club, feeDeals[club.clubId] ?? "standard")} />)}</div> : <p className="rtg-transfer-empty">Không tìm thấy CLB phù hợp với bộ lọc.</p>}{totalPages > 1 && <div className="rtg-transfer-pagination"><Button size="sm" variant="quiet" disabled={page <= 1 || isSearching} onClick={() => setPage((value) => value - 1)}>Trước</Button><span>Trang {page}/{totalPages}</span><Button size="sm" variant="quiet" disabled={page >= totalPages || isSearching} onClick={() => setPage((value) => value + 1)}>Sau</Button></div>}</div>}
      </div>
      <footer className="rtg-transfer-window__footer"><span>{isFreeAgent ? "Bạn đang là cầu thủ tự do." : "Không chọn lời đề nghị nào? Bạn có thể ở lại CLB hiện tại."}</span><Button variant="outline" disabled={isProcessing} onClick={onRejectAll}>{isFreeAgent ? "Ký hợp đồng tự do" : "Bỏ qua · ở lại CLB"}</Button></footer>
    </section>
  );

  if (pendingContent || cancelledContent) {
    const negotiationContent = pendingContent ?? cancelledContent;
    return onClose ? <Modal open title="Đàm phán hợp đồng" onClose={onClose} size="lg" className="rtg-transfer-modal"><ModalHeader className="sr-only">Đàm phán hợp đồng</ModalHeader>{negotiationContent}</Modal> : negotiationContent;
  }
  if (!onClose) return content;
  return <Modal open title="Cửa sổ chuyển nhượng" onClose={onClose} size="lg" className="rtg-transfer-modal"><ModalHeader className="sr-only">Cửa sổ chuyển nhượng</ModalHeader>{content}</Modal>;
}
