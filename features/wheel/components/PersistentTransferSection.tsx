"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { SearchField } from "@/components/ui/SearchField";
import { OfferCard, ShortlistCard } from "./TransferClubRows";
import { TransferNegotiationPanel } from "./TransferNegotiationPanel";
import {
  formatEuroThousands,
  type TransferFeeDealOption,
} from "@/lib/transfer-economy";
import { type WageDealOption } from "@/lib/salary-negotiation";
import type { ContractOfferCard, PendingTransferNegotiation, ShortlistClubCard, TransferDealAttemptResult, TransferMarketResult } from "@/features/transfer/services/transfer.service";
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
  isProcessing: boolean;
  onAcceptOffer: (offer: ContractOfferCard, wageOption?: WageDealOption) => Promise<TransferDealAttemptResult> | TransferDealAttemptResult;
  onRejectAll: () => void;
  onApproachShortlist: (club: ShortlistClubCard, feeOption?: TransferFeeDealOption) => Promise<boolean> | void;
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
  onClearAcceptedOffer?: (offer?: ContractOfferCard, state?: { failedWageOptions: WageDealOption[] }) => Promise<void> | void;
  onSelectOffer?: (offer: ContractOfferCard) => Promise<PendingTransferNegotiation | null> | PendingTransferNegotiation | null;
}

export function PersistentTransferSection({ market, currentClubId, currentClubName, isProcessing, onAcceptOffer, onRejectAll, onApproachShortlist, onSearchClubs, approachRejects, approachBanner, onClose, acceptedOffer, onClearAcceptedOffer, onSelectOffer }: PersistentTransferSectionProps) {
  const { contract, inbound, shortlist, isUnemployedMarket } = market;
  const renewal = market.renewal ?? (acceptedOffer?.kind === "renewal" ? acceptedOffer : null);
  const visibleRenewal = renewal;
  const [activeTab, setActiveTab] = useState<"renewal" | "inbound" | "shortlist">(visibleRenewal ? "renewal" : inbound.length > 0 ? "inbound" : "renewal");
  const [feeDeals, setFeeDeals] = useState<Record<string, TransferFeeDealOption>>({});
  const [wageDeal, setWageDeal] = useState<WageDealOption>("standard");
  const [failedWageOptions, setFailedWageOptions] = useState<WageDealOption[]>([]);
  const [cancelledOffer, setCancelledOffer] = useState<ContractOfferCard | null>(null);
  const [excludedClubIds, setExcludedClubIds] = useState<Set<string>>(new Set());
  const [pendingOffer, setPendingOffer] = useState<ContractOfferCard | null>(acceptedOffer?.kind === "renewal" ? null : acceptedOffer ?? null);
  const [query, setQuery] = useState("");
  const [league, setLeague] = useState("all");
  const [prestige, setPrestige] = useState("all");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState<SearchResult>({ clubs: shortlist, totalCount: shortlist.length, leagues: [] });
  const [isSearching, setIsSearching] = useState(true);
  const [searchError, setSearchError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const searchRef = useRef(onSearchClubs);

  useEffect(() => { searchRef.current = onSearchClubs; }, [onSearchClubs]);
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      setIsSearching(true);
      setSearchError(false);
      try {
        const result = await searchRef.current({ currentClubId, query: query.trim() || undefined, leagueId: league === "all" ? undefined : league, prestigeMin: prestige === "all" ? undefined : Number(prestige), prestigeMax: prestige === "all" ? undefined : Number(prestige), page });
        if (active) setSearch({ ...result, clubs: result.clubs.filter((club) => club.clubId !== currentClubId && !excludedClubIds.has(club.clubId)) });
      } catch {
        if (active) setSearchError(true);
      } finally {
        if (active) setIsSearching(false);
      }
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [currentClubId, query, league, prestige, page, excludedClubIds, retryKey]);

  const isFreeAgent = contract.yearsRemaining <= 0 || isUnemployedMarket;
  const currentClub = currentClubName ?? (visibleRenewal?.clubName || "CLB hiện tại");
  const visibleInbound = inbound.filter((offer) => !excludedClubIds.has(offer.clubId));
  const visibleSearchClubs = search.clubs.filter((club) => !excludedClubIds.has(club.clubId));
  const totalPages = Math.max(1, Math.ceil(search.totalCount / 8));
  async function beginWageNegotiation(offer: ContractOfferCard) {
    if (offer.kind === "renewal") { await onAcceptOffer(offer, "standard"); return; }
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
    if (acceptedOffer && acceptedOffer.kind !== "renewal") {
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
  const pendingContent = pendingOffer ? <TransferNegotiationPanel offer={pendingOffer} selected={wageDeal} failed={failedWageOptions} processing={isProcessing}
    onSelect={setWageDeal}
    onBack={() => { setPendingOffer(null); void onClearAcceptedOffer?.(pendingOffer, { failedWageOptions }); }}
    onSubmit={async () => {
      const result = await onAcceptOffer(pendingOffer, wageDeal);
      if (result.resolution === "accepted") { setPendingOffer(null); onClearAcceptedOffer?.(); }
      else if (result.resolution === "rejected") setFailedWageOptions(result.failedWageOptions ?? [...new Set([...failedWageOptions, wageDeal])]);
      else if (result.resolution === "cancelled") { setExcludedClubIds((previous) => new Set(previous).add(pendingOffer.clubId)); setPendingOffer(null); onClearAcceptedOffer?.(); setCancelledOffer(pendingOffer); }
    }} /> : null;
  const cancelledContent = cancelledOffer ? (
    <section className="football-transfer-panel football-transfer-negotiation football-transfer-negotiation--cancelled">
      <span className="football-eyebrow">Đàm phán kết thúc</span>
      <h2>Thương vụ với {cancelledOffer.clubName} đã bị hủy</h2>
      <p>CLB đã từ chối hai phương án lương. Offer này không còn hiệu lực và CLB sẽ không xuất hiện lại trong danh sách mùa này.</p>
      <Button size="lg" fullWidth onClick={() => { setCancelledOffer(null); setActiveTab("shortlist"); setPage(1); }}>Quay lại danh sách CLB</Button>
    </section>
  ) : null;
  const content = (
    <section className="football-transfer-window">
      <div className="football-transfer-window__overview">
      <header className="football-transfer-window__header"><div><span className="football-eyebrow">Cửa sổ chuyển nhượng · {contract.seasonsLeftInCareer} mùa còn lại</span><h1>{inbound.length > 1 ? `${inbound.length} lời đề nghị` : "Cửa sổ chuyển nhượng"}</h1><p>Chọn hướng đi tiếp theo cho sự nghiệp của bạn.</p></div>{onClose && <button type="button" className="football-icon-button" onClick={onClose} aria-label="Đóng cửa sổ chuyển nhượng"><X aria-hidden="true" size={18} /></button>}</header>
      <div className="football-transfer-window__context"><span><small>Đang ở</small><strong>{isUnemployedMarket ? "Cầu thủ tự do" : currentClub}</strong></span><span><small>Lương hiện tại</small><strong>{formatEuroThousands(contract.currentWageAnnual)}/năm</strong></span><span><small>Hợp đồng còn lại</small><strong>{isUnemployedMarket ? "Không có HĐ" : `${contract.yearsRemaining}/${contract.yearsTotal} mùa`}</strong></span><span><small>Giá trị thị trường</small><strong>{formatEuroThousands(contract.marketValue)}</strong></span></div>
      </div>
      {approachBanner && <p className="football-transfer-feedback is-banner" role="status">{approachBanner}</p>}
      <nav className="football-transfer-tabs" aria-label="Các lựa chọn chuyển nhượng"><button type="button" className={activeTab === "renewal" ? "is-active" : ""} onClick={() => setActiveTab("renewal")}>Ở lại {visibleRenewal ? "· đề nghị" : ""}</button><button type="button" className={activeTab === "inbound" ? "is-active" : ""} onClick={() => setActiveTab("inbound")}>Lời đề nghị <b>{visibleInbound.length}</b></button><button type="button" className={activeTab === "shortlist" ? "is-active" : ""} onClick={() => setActiveTab("shortlist")}>Tìm CLB chủ động <b>{search.totalCount}</b></button></nav>

      <div className="football-transfer-window__body">
        {activeTab === "renewal" && <div className="football-transfer-panel"><div className="football-transfer-panel__heading"><h2>Tiếp tục tại {currentClub}</h2><p>Giữ vai trò, mức lương và môi trường hiện tại cho mùa giải tiếp theo.</p></div>{visibleRenewal ? <div className="football-transfer-renewal"><div><span>Đề nghị gia hạn</span><strong>{visibleRenewal.contractYears} mùa</strong></div><div><span>Lương mới</span><strong>{formatEuroThousands(visibleRenewal.wageAnnual)}/năm</strong></div><div><span>Vai trò dự kiến</span><div className="football-transfer-renewal__role"><strong>{visibleRenewal.expectedLeagueApps >= 25 ? "Đá chính" : "Xoay vòng"}</strong><small>· {visibleRenewal.expectedLeagueApps} trận/mùa</small></div></div><Button size="lg" disabled={isProcessing} loading={isProcessing} onClick={() => void onAcceptOffer(visibleRenewal, "standard")}>Đồng ý gia hạn</Button></div> : <p className="football-transfer-empty">CLB hiện tại chưa gửi đề nghị gia hạn. Bạn có thể xem lời đề nghị khác hoặc tìm CLB mới.</p>}</div>}
        {activeTab === "inbound" && <div className="football-transfer-panel"><div className="football-transfer-panel__heading"><p>Chọn lời đề nghị trước, sau đó chốt lương ở bước cuối.</p></div><div className="football-transfer-offers" role="region" aria-label="Danh sách lời đề nghị" tabIndex={0}>{visibleInbound.length > 0 ? visibleInbound.map((offer) => <OfferCard key={`${offer.clubId}-${offer.kind}`} offer={offer} isProcessing={isProcessing} onAccept={() => beginWageNegotiation(offer)} />) : <p className="football-transfer-empty">Chưa có CLB nào gửi đề nghị mùa này.</p>}</div></div>}
        {activeTab === "shortlist" && <div className="football-transfer-panel"><div className="football-transfer-panel__heading"><p>Chọn mức phí ở bước mở lời; lương sẽ được đàm phán sau khi CLB đồng ý.</p></div><div className="football-transfer-search">
          <SearchField label="Tên CLB" value={query} onChange={(value) => { setQuery(value); setPage(1); }} placeholder="Tìm theo tên CLB..." maxLength={80} />
          <FilterSelect label="Lọc theo giải đấu" value={league} searchable onChange={(value) => { setLeague(value); setPage(1); }} options={[{ value: "all", label: "Tất cả giải đấu" }, ...search.leagues.map((item) => ({ value: item.id, label: item.name, description: `Hạng ${item.tier}`, keywords: `tier ${item.tier}` }))]} />
          <FilterSelect label="Lọc theo danh tiếng" value={prestige} onChange={(value) => { setPrestige(value); setPage(1); }} options={[{ value: "all", label: "Mọi mức danh tiếng" }, ...[5,4,3,2,1].map((item) => ({ value: String(item), label: `${item} sao` }))]} />
        </div>
        <div className="football-transfer-search-status"><span role="status">{isSearching ? "Đang tìm CLB..." : searchError ? "Chưa tải được danh sách CLB. Vui lòng thử lại." : `${search.totalCount} CLB`}</span>{(query || league !== "all" || prestige !== "all") && <button type="button" className="football-text-button" onClick={() => { setQuery(""); setLeague("all"); setPrestige("all"); setPage(1); }}>Xóa bộ lọc</button>}</div><div className="football-transfer-targets" role="region" aria-label="Danh sách CLB tìm kiếm" tabIndex={0} aria-busy={isSearching}>
          {isSearching ? <p className="football-transfer-empty">Đang tìm CLB...</p> : searchError ? <p className="football-transfer-empty">Không thể tải danh sách. <button type="button" className="football-text-button" onClick={() => setRetryKey((previous) => previous + 1)}>Thử lại</button></p> : visibleSearchClubs.length > 0 ? visibleSearchClubs.map((club) => <ShortlistCard key={club.clubId} club={club} selectedDeal={feeDeals[club.clubId] ?? "standard"} isProcessing={isProcessing} rejected={approachRejects[club.clubId]} onDealChange={(option) => setFeeDeals((previous) => ({ ...previous, [club.clubId]: option }))} onApproach={() => void onApproachShortlist(club, feeDeals[club.clubId] ?? "standard")} />) : <p className="football-transfer-empty">Không tìm thấy CLB phù hợp với bộ lọc.</p>}
        </div>{totalPages > 1 && <div className="football-transfer-pagination"><Button size="sm" variant="quiet" disabled={page <= 1 || isSearching} onClick={() => setPage((value) => value - 1)}>Trước</Button><span>Trang {page}/{totalPages}</span><Button size="sm" variant="quiet" disabled={page >= totalPages || isSearching} onClick={() => setPage((value) => value + 1)}>Sau</Button></div>}</div>}
      </div>
      <footer className="football-transfer-window__footer"><span>{isFreeAgent ? "Bạn đang là cầu thủ tự do." : "Không chọn lời đề nghị nào? Bạn có thể ở lại CLB hiện tại."}</span><Button variant="outline" disabled={isProcessing} onClick={onRejectAll}>{isFreeAgent ? "Ký hợp đồng tự do" : "Bỏ qua · ở lại CLB"}</Button></footer>
    </section>
  );

  if (pendingContent || cancelledContent) {
    const negotiationContent = pendingContent ?? cancelledContent;
    return onClose ? <Modal open title="Đàm phán hợp đồng" onClose={onClose} size="lg" className="football-transfer-modal"><ModalHeader className="sr-only">Đàm phán hợp đồng</ModalHeader>{negotiationContent}</Modal> : negotiationContent;
  }
  if (!onClose) return content;
  return <Modal open title="Cửa sổ chuyển nhượng" onClose={onClose} size="lg" className="football-transfer-modal"><ModalHeader className="sr-only">Cửa sổ chuyển nhượng</ModalHeader>{content}</Modal>;
}
