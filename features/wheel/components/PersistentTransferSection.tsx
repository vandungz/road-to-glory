"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Search, X } from "lucide-react";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatEuroThousands, approachChancePercent } from "@/lib/transfer-economy";
import { applyWageDealChance, computeWageOptions, type WageDealOption } from "@/lib/salary-negotiation";
import type { ContractOfferCard, ShortlistClubCard, TransferMarketResult } from "@/features/transfer/services/transfer.service";
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
  onAcceptOffer: (offer: ContractOfferCard) => void;
  onRejectAll: () => void;
  onApproachShortlist: (club: ShortlistClubCard, wageOption?: WageDealOption) => Promise<boolean> | void;
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
}

function OfferCard({ offer, isProcessing, onAccept }: { offer: ContractOfferCard; isProcessing: boolean; onAccept: () => void }) {
  const isRenewal = offer.kind === "renewal";
  return (
    <article className={`rtg-transfer-offer${isRenewal ? " is-renewal" : ""}`}>
      <div className="rtg-transfer-offer__topline"><span className="rtg-eyebrow">{isRenewal ? "Đề nghị gia hạn" : "Đề nghị chuyển nhượng"}</span><strong>{formatEuroThousands(offer.transferFee)}</strong></div>
      <h3>{offer.clubName}</h3>
      <p className="rtg-transfer-offer__league">{offer.leagueName} · {offer.reason}</p>
      <div className="rtg-transfer-offer__details">
        <span><small>Lương hàng năm</small><strong>{formatEuroThousands(offer.wageAnnual)}</strong></span>
        <span><small>Thời hạn</small><strong>{offer.contractYears} mùa</strong></span>
        <span><small>Vai trò dự kiến</small><strong>{offer.expectedLeagueApps >= 25 ? "Đá chính" : "Xoay vòng"}</strong></span>
        <span><small>Cơ hội đá mùa</small><strong>{offer.expectedLeagueApps} trận</strong></span>
      </div>
      <Button size="lg" fullWidth disabled={isProcessing} loading={isProcessing} onClick={onAccept}>{isRenewal ? "Gia hạn với CLB" : `Đàm phán với ${offer.clubName}`} <ArrowRight aria-hidden="true" size={15} /></Button>
    </article>
  );
}

function ShortlistCard({ club, selectedDeal, isProcessing, rejected, onDealChange, onApproach }: { club: ShortlistClubCard; selectedDeal: WageDealOption; isProcessing: boolean; rejected?: { chance: number; reason: string }; onDealChange: (option: WageDealOption) => void; onApproach: () => void }) {
  const baseChance = club.acceptChance ?? 0;
  const options = computeWageOptions({ baseWage: club.previewWage, minWage: Math.max(1, Math.round(club.previewWage * 0.7)), maxWage: Math.round(club.previewWage * 1.5) });
  const chance = approachChancePercent(applyWageDealChance(baseChance, selectedDeal));
  const canApproach = club.canApproach && !rejected && !isProcessing;
  return (
    <article className={`rtg-transfer-target${rejected ? " is-rejected" : ""}`}>
      <div className="rtg-transfer-target__heading"><div><h3>{club.clubName}</h3><p>{club.leagueName} · Độ phù hợp {club.prestige}/5</p></div><strong>{club.expectedLeagueApps} trận</strong></div>
      <div className="rtg-transfer-target__meta"><span>Phí chuyển nhượng <b>{club.previewFee ? formatEuroThousands(club.previewFee) : "Miễn phí"}</b></span><span>Lương đề xuất <b>{formatEuroThousands(options[selectedDeal].wageAnnual)}/năm</b></span></div>
      {rejected ? <p className="rtg-transfer-feedback is-error">Đã từ chối · {rejected.reason}</p> : club.blockReason ? <p className="rtg-transfer-feedback is-error">{club.blockReason}</p> : (
        <div className="rtg-transfer-target__actions"><select aria-label={`Mức lương đề xuất cho ${club.clubName}`} value={selectedDeal} disabled={isProcessing} onChange={(event) => onDealChange(event.target.value as WageDealOption)}><option value="lower">Giảm lương · tăng cơ hội</option><option value="standard">Lương tiêu chuẩn</option><option value="higher">Tăng lương · giảm cơ hội</option></select><span className="rtg-transfer-target__chance">Cơ hội {chance}%</span><Button size="sm" disabled={!canApproach} onClick={onApproach}>Ngỏ lời</Button></div>
      )}
      {!rejected && club.canApproach && <small className="rtg-transfer-target__hint">{options[selectedDeal].label} · {formatEuroThousands(options[selectedDeal].wageAnnual)}/năm</small>}
    </article>
  );
}

export function PersistentTransferSection({ market, currentClubId, currentClubName, proactiveRenewalRejected = false, willingToMove, setWillingToMove, isProcessing, onAcceptOffer, onRejectAll, onApproachShortlist, onProactiveRenewal, onSearchClubs, approachRejects, approachBanner, onClose }: PersistentTransferSectionProps) {
  const { contract, renewal, inbound, shortlist, isUnemployedMarket } = market;
  const [activeTab, setActiveTab] = useState<"renewal" | "inbound" | "shortlist">(inbound.length > 0 ? "inbound" : "renewal");
  const [wageDeals, setWageDeals] = useState<Record<string, WageDealOption>>({});
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
        if (active) setSearch({ ...result, clubs: result.clubs.filter((club) => club.clubId !== currentClubId) });
      } catch (error) {
        console.error("Failed to search transfer clubs:", error);
      } finally {
        if (active) setIsSearching(false);
      }
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [currentClubId, query, league, prestige, page]);

  const isFreeAgent = contract.yearsRemaining <= 0 || isUnemployedMarket;
  const currentClub = currentClubName ?? (renewal?.clubName || "CLB hiện tại");
  const totalPages = Math.max(1, Math.ceil(search.totalCount / 8));
  const content = (
    <section className="rtg-transfer-window">
      <header className="rtg-transfer-window__header"><div><span className="rtg-eyebrow">Cửa sổ chuyển nhượng · {contract.seasonsLeftInCareer} mùa còn lại</span><h1>{inbound.length > 1 ? `${inbound.length} lời đề nghị` : "Cửa sổ chuyển nhượng"}</h1><p>Chọn hướng đi tiếp theo cho sự nghiệp của bạn.</p></div>{onClose && <button type="button" className="rtg-icon-button" onClick={onClose} aria-label="Đóng cửa sổ chuyển nhượng"><X aria-hidden="true" size={18} /></button>}</header>
      <div className="rtg-transfer-window__context"><span><small>Đang ở</small><strong>{isUnemployedMarket ? "Cầu thủ tự do" : currentClub}</strong></span><span><small>Lương hiện tại</small><strong>{formatEuroThousands(contract.currentWageAnnual)}/năm</strong></span><span><small>Hợp đồng còn lại</small><strong>{isUnemployedMarket ? "Không có HĐ" : `${contract.yearsRemaining}/${contract.yearsTotal} mùa`}</strong></span><span><small>Giá trị thị trường</small><strong>{formatEuroThousands(contract.marketValue)}</strong></span><label className={willingToMove ? "is-active" : ""}><input type="checkbox" checked={willingToMove} disabled={isProcessing || isUnemployedMarket} onChange={(event) => setWillingToMove(event.target.checked)} /> Sẵn sàng lắng nghe đề nghị</label></div>
      {approachBanner && <p className="rtg-transfer-feedback is-banner" role="status">{approachBanner}</p>}
      <nav className="rtg-transfer-tabs" aria-label="Các lựa chọn chuyển nhượng"><button type="button" className={activeTab === "renewal" ? "is-active" : ""} onClick={() => setActiveTab("renewal")}>Ở lại {renewal ? "· đề nghị" : ""}</button><button type="button" className={activeTab === "inbound" ? "is-active" : ""} onClick={() => setActiveTab("inbound")}>Lời đề nghị <b>{inbound.length}</b></button><button type="button" className={activeTab === "shortlist" ? "is-active" : ""} onClick={() => setActiveTab("shortlist")}>Tìm CLB chủ động <b>{search.totalCount}</b></button></nav>

      <div className="rtg-transfer-window__body">
        {activeTab === "renewal" && <div className="rtg-transfer-panel"><div className="rtg-transfer-panel__heading"><span className="rtg-eyebrow">Lựa chọn an toàn</span><h2>Tiếp tục tại {currentClub}</h2><p>Giữ vai trò, mức lương và môi trường hiện tại cho mùa giải tiếp theo.</p></div>{renewal ? <div className="rtg-transfer-renewal"><div><span>Đề nghị gia hạn</span><strong>{renewal.contractYears} mùa</strong></div><div><span>Lương mới</span><strong>{formatEuroThousands(renewal.wageAnnual)}/năm</strong></div><div><span>Vai trò dự kiến</span><div className="rtg-transfer-renewal__role"><strong>{renewal.expectedLeagueApps >= 25 ? "Đá chính" : "Xoay vòng"}</strong><small>· {renewal.expectedLeagueApps} trận/mùa</small></div></div><Button size="lg" disabled={isProcessing || proactiveRenewalRejected} loading={isProcessing} onClick={() => onProactiveRenewal(wageDeals.renewal ?? "standard")}>{proactiveRenewalRejected ? "Đề nghị đã bị từ chối" : "Đàm phán gia hạn"}</Button></div> : <p className="rtg-transfer-empty">CLB hiện tại chưa gửi đề nghị gia hạn. Bạn có thể xem lời đề nghị khác hoặc chủ động tìm CLB mới.</p>}</div>}
        {activeTab === "inbound" && <div className="rtg-transfer-panel"><div className="rtg-transfer-panel__heading"><span className="rtg-eyebrow">Các CLB đang hỏi mua</span><h2>Chọn lời đề nghị phù hợp</h2><p>Mỗi đề nghị là một hướng đi khác nhau về lương, vai trò và cơ hội thi đấu.</p></div><div className="rtg-transfer-offers">{inbound.length > 0 ? inbound.map((offer) => <OfferCard key={`${offer.clubId}-${offer.kind}`} offer={offer} isProcessing={isProcessing} onAccept={() => onAcceptOffer(offer)} />) : <p className="rtg-transfer-empty">Chưa có CLB nào gửi đề nghị mùa này.</p>}</div></div>}
        {activeTab === "shortlist" && <div className="rtg-transfer-panel"><div className="rtg-transfer-panel__heading"><span className="rtg-eyebrow">Chủ động định hướng</span><h2>Tìm CLB phù hợp</h2><p>Chỉ các CLB khác CLB hiện tại mới xuất hiện trong danh sách này.</p></div><div className="rtg-transfer-search"><label><Search aria-hidden="true" size={16} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Tìm theo tên CLB..." /></label><select aria-label="Lọc theo giải đấu" value={league} onChange={(event) => { setLeague(event.target.value); setPage(1); }}><option value="all">Tất cả giải đấu</option>{search.leagues.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select aria-label="Lọc theo danh tiếng" value={prestige} onChange={(event) => { setPrestige(event.target.value); setPage(1); }}><option value="all">Mọi mức danh tiếng</option><option value="5">5 sao</option><option value="4">4 sao</option><option value="3">3 sao</option><option value="2">2 sao</option><option value="1">1 sao</option></select></div>{isSearching ? <p className="rtg-transfer-empty">Đang tìm CLB...</p> : search.clubs.length > 0 ? <div className="rtg-transfer-targets">{search.clubs.map((club) => <ShortlistCard key={club.clubId} club={club} selectedDeal={wageDeals[club.clubId] ?? "standard"} isProcessing={isProcessing} rejected={approachRejects[club.clubId]} onDealChange={(option) => setWageDeals((previous) => ({ ...previous, [club.clubId]: option }))} onApproach={() => void onApproachShortlist(club, wageDeals[club.clubId] ?? "standard")} />)}</div> : <p className="rtg-transfer-empty">Không tìm thấy CLB phù hợp với bộ lọc.</p>}{totalPages > 1 && <div className="rtg-transfer-pagination"><Button size="sm" variant="quiet" disabled={page <= 1 || isSearching} onClick={() => setPage((value) => value - 1)}>Trước</Button><span>Trang {page}/{totalPages}</span><Button size="sm" variant="quiet" disabled={page >= totalPages || isSearching} onClick={() => setPage((value) => value + 1)}>Sau</Button></div>}</div>}
      </div>
      <footer className="rtg-transfer-window__footer"><span>{isFreeAgent ? "Bạn đang là cầu thủ tự do." : "Không chọn lời đề nghị nào? Bạn có thể ở lại CLB hiện tại."}</span><Button variant="outline" disabled={isProcessing} onClick={onRejectAll}>{isFreeAgent ? "Ký hợp đồng tự do" : "Bỏ qua · ở lại CLB"}</Button></footer>
    </section>
  );

  if (!onClose) return content;
  return <Modal open title="Cửa sổ chuyển nhượng" onClose={onClose} size="lg" className="rtg-transfer-modal"><ModalHeader className="sr-only">Cửa sổ chuyển nhượng</ModalHeader>{content}</Modal>;
}
