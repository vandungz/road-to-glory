"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Building2,
  TrendingUp,
  FileCheck,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Coins,
  ArrowUpRight,
  CheckCircle,
  HelpCircle,
} from "lucide-react";
import { formatEuroThousands, approachChancePercent } from "@/lib/transfer-economy";
import { computeWageOptions, applyWageDealChance, type WageDealOption } from "@/lib/salary-negotiation";
import type { ContractOfferCard, ShortlistClubCard, TransferMarketResult } from "@/features/transfer/services/transfer.service";
import type { ApproachRejectState } from "./TransferWindowPanel";

interface PersistentTransferSectionProps {
  market: TransferMarketResult;
  willingToMove: boolean;
  setWillingToMove: (v: boolean) => void;
  isProcessing: boolean;
  onAcceptOffer: (offer: ContractOfferCard) => void;
  onRejectAll: () => void;
  onApproachShortlist: (club: ShortlistClubCard, wageOption?: WageDealOption) => Promise<boolean> | void;
  onProactiveRenewal: (wageOption?: WageDealOption) => Promise<boolean> | void;
  onSearchClubs: (params: {
    query?: string;
    leagueId?: string;
    prestigeMin?: number;
    prestigeMax?: number;
    page: number;
  }) => Promise<{
    clubs: ShortlistClubCard[];
    totalCount: number;
    leagues: Array<{ id: string; name: string; tier: number }>;
  }>;
  approachRejects: ApproachRejectState;
  approachBanner: string | null;
  onClose?: () => void;
}

export function PersistentTransferSection({
  market,
  willingToMove,
  setWillingToMove,
  isProcessing,
  onAcceptOffer,
  onRejectAll,
  onApproachShortlist,
  onProactiveRenewal,
  onSearchClubs,
  approachRejects,
  approachBanner,
  onClose,
}: PersistentTransferSectionProps) {
  const { contract, renewal, inbound, isUnemployedMarket, mandatoryBuyout } = market;
  const isFa = contract.yearsRemaining <= 0 || isUnemployedMarket;

  // Active Modal Tab Variant State
  const [activeTab, setActiveTab] = useState<"renewal" | "inbound" | "shortlist">(
    inbound.length > 0 ? "inbound" : "renewal"
  );

  // Wage Deal selection state per offer key
  const [wageDeals, setWageDeals] = useState<Record<string, WageDealOption>>({});

  // Dynamic search & filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLeague, setSelectedLeague] = useState("all");
  const [selectedPrestige, setSelectedPrestige] = useState<number>(0);
  const [page, setPage] = useState(1);

  // Search results state
  const [searchResults, setSearchResults] = useState<ShortlistClubCard[]>(market.shortlist || []);
  const [totalCount, setTotalCount] = useState(market.shortlist?.length || 0);
  const [availableLeagues, setAvailableLeagues] = useState<Array<{ id: string; name: string; tier: number }>>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Load search results when filters or page change
  useEffect(() => {
    let isSubscribed = true;
    const fetchClubs = async () => {
      setIsSearching(true);
      try {
        const res = await onSearchClubs({
          query: searchQuery,
          leagueId: selectedLeague === "all" ? undefined : selectedLeague,
          prestigeMin: selectedPrestige > 0 ? selectedPrestige : undefined,
          prestigeMax: selectedPrestige > 0 ? selectedPrestige : undefined,
          page,
        });
        if (isSubscribed) {
          setSearchResults(res.clubs);
          setTotalCount(res.totalCount);
          if (res.leagues && res.leagues.length > 0) {
            setAvailableLeagues(res.leagues);
          }
        }
      } catch (err) {
        console.error("Failed to search clubs:", err);
      } finally {
        if (isSubscribed) setIsSearching(false);
      }
    };

    const timer = setTimeout(fetchClubs, 300);
    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [searchQuery, selectedLeague, selectedPrestige, page]);

  const handleSetWageDeal = (key: string, option: WageDealOption) => {
    setWageDeals((prev) => ({ ...prev, [key]: option }));
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / 8));

  const content = (
    <div
      id="persistent-transfer-section"
      style={{
        width: "100%",
        height: onClose ? "85vh" : "calc(100vh - 180px)",
        maxHeight: "85vh",
        borderRadius: 10,
        background: "var(--cream, #fbf7ee)",
        border: "3px solid var(--charcoal, #1e293b)",
        boxShadow: onClose ? "10px 10px 0 var(--charcoal, #1e293b)" : "3px 3px 0 var(--charcoal, #1e293b)",
        display: "flex",
        flexDirection: "column",
        textAlign: "left",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ── FIXED TOP HEADER AREA ── */}
      <div
        style={{
          padding: "16px 20px 12px 20px",
          borderBottom: "2px solid var(--charcoal, #1e293b)",
          backgroundColor: "var(--cream, #fbf7ee)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
      {/* Header Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "2px solid rgba(0, 0, 0, 0.12)",
          paddingBottom: 10,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Building2 size={22} color="var(--coral, #e85d42)" />
            <h3
              style={{
                margin: 0,
                fontSize: "1.15rem",
                fontFamily: "var(--font-headline, sans-serif)",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
                fontWeight: 800,
              }}
            >
              Cửa sổ Chuyển nhượng & Đàm phán Hợp đồng
            </h3>
          </div>
          <p style={{ margin: "3px 0 0 0", fontSize: "0.78rem", opacity: 0.75 }}>
            Giai đoạn Cuối mùa · Duyệt đề nghị, gia hạn chủ động, tìm kiếm CLB & thương lượng lương
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isUnemployedMarket && (
            <span
              style={{
                padding: "3px 8px",
                borderRadius: 4,
                fontSize: "0.68rem",
                fontFamily: "var(--font-stamp, monospace)",
                background: "rgba(232, 93, 66, 0.15)",
                color: "#c2410c",
                border: "1px solid #c2410c",
                fontWeight: 700,
              }}
            >
              FA · THẤT NGHIỆP
            </span>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "var(--cream-dark, #e2e8f0)",
                border: "2px solid var(--charcoal, #1e293b)",
                borderRadius: "50%",
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "2px 2px 0 var(--charcoal, #1e293b)",
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Contract Summary Bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 10,
          padding: 12,
          borderRadius: 8,
          background: "var(--white, #ffffff)",
          border: "2px solid var(--charcoal, #1e293b)",
          fontSize: "0.8rem",
        }}
      >
        <div>
          <span style={{ opacity: 0.65, display: "block", fontSize: "0.68rem", textTransform: "uppercase" }}>
            Hợp đồng
          </span>
          <strong>{contract.yearsRemaining}/{contract.yearsTotal} Năm còn lại</strong>
        </div>
        <div>
          <span style={{ opacity: 0.65, display: "block", fontSize: "0.68rem", textTransform: "uppercase" }}>
            Lương hiện tại
          </span>
          <strong style={{ color: "#15803d" }}>{formatEuroThousands(contract.currentWageAnnual)}/năm</strong>
        </div>
        <div>
          <span style={{ opacity: 0.65, display: "block", fontSize: "0.68rem", textTransform: "uppercase" }}>
            Giá trị thị trường
          </span>
          <strong>{formatEuroThousands(contract.marketValue)}</strong>
        </div>
        <div>
          <span style={{ opacity: 0.65, display: "block", fontSize: "0.68rem", textTransform: "uppercase" }}>
            Phí Phá HĐ
          </span>
          <strong>{mandatoryBuyout <= 0 ? "MIỄN PHÍ" : formatEuroThousands(mandatoryBuyout)}</strong>
        </div>
      </div>

      {/* Approach Toast Banner */}
      {approachBanner && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 6,
            background: "rgba(37, 99, 235, 0.08)",
            border: "1px solid rgba(37, 99, 235, 0.3)",
            fontSize: "0.82rem",
            color: "#1e40af",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <HelpCircle size={16} />
          <span>{approachBanner}</span>
        </div>
      )}

      {/* Available Checkbox */}
      {!isUnemployedMarket && (
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: "0.8rem",
            cursor: isProcessing ? "not-allowed" : "pointer",
            userSelect: "none",
            padding: "10px 14px",
            border: "1px dashed var(--charcoal, #1e293b)",
            borderRadius: 6,
            background: willingToMove ? "rgba(232, 93, 66, 0.08)" : "transparent",
          }}
        >
          <input
            type="checkbox"
            checked={willingToMove}
            disabled={isProcessing}
            onChange={(e) => setWillingToMove(e.target.checked)}
          />
          <span>
            <strong>Bật trạng thái Muốn chuyển đi (Available):</strong> Tăng khả năng nhận được lời đề nghị từ các CLB khác (Phí giải phóng hợp đồng vẫn giữ nguyên).
          </span>
        </label>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 6,
          backgroundColor: "var(--cream-dark, #e2e8f0)",
          border: "2px solid var(--charcoal, #1e293b)",
          borderRadius: 8,
          padding: 4,
          boxShadow: "2px 2px 0 var(--charcoal, #1e293b)",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("renewal")}
          style={{
            padding: "10px 8px",
            borderRadius: 6,
            border: activeTab === "renewal" ? "2px solid var(--charcoal)" : "1px solid transparent",
            backgroundColor: activeTab === "renewal" ? "#2d5a3d" : "transparent",
            color: activeTab === "renewal" ? "#ffffff" : "var(--charcoal)",
            fontFamily: "var(--font-headline)",
            fontSize: "0.82rem",
            fontWeight: 800,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          📝 1. GIA HẠN HỢP ĐỒNG
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("inbound")}
          style={{
            padding: "10px 8px",
            borderRadius: 6,
            border: activeTab === "inbound" ? "2px solid var(--charcoal)" : "1px solid transparent",
            backgroundColor: activeTab === "inbound" ? "#2d5a3d" : "transparent",
            color: activeTab === "inbound" ? "#ffffff" : "var(--charcoal)",
            fontFamily: "var(--font-headline)",
            fontSize: "0.82rem",
            fontWeight: 800,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          📩 2. LỜI ĐỀ NGHỊ ({inbound.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("shortlist")}
          style={{
            padding: "10px 8px",
            borderRadius: 6,
            border: activeTab === "shortlist" ? "2px solid var(--charcoal)" : "1px solid transparent",
            backgroundColor: activeTab === "shortlist" ? "#2d5a3d" : "transparent",
            color: activeTab === "shortlist" ? "#ffffff" : "var(--charcoal)",
            fontFamily: "var(--font-headline)",
            fontSize: "0.82rem",
            fontWeight: 800,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          🔍 3. TÌM KIẾM CLB ({totalCount})
        </button>
      </div>
      </div>
      {/* ── END FIXED TOP HEADER ── */}

      {/* ── SCROLLABLE MIDDLE BODY AREA ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── TAB 1: RENEWAL SECTION ── */}
      {activeTab === "renewal" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, animation: "fadeIn 0.2s ease" }}>
          <h4 style={{ margin: 0, fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#334155" }}>
            1. Gia hạn với CLB hiện tại
          </h4>

          {renewal ? (
            <div
              style={{
                padding: 16,
                borderRadius: 8,
                border: "2px solid #15803d",
                background: "rgba(21, 128, 61, 0.04)",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ fontSize: "1rem" }}>{renewal.clubName} (Đề nghị tự động)</strong>
                <span style={{ fontSize: "0.7rem", color: "#15803d", fontWeight: 700 }}>GIA HẠN</span>
              </div>
              <p style={{ margin: 0, fontSize: "0.8rem", opacity: 0.8 }}>
                {renewal.leagueName} · {renewal.reason}
              </p>
              <div style={{ display: "flex", gap: 16, fontSize: "0.82rem" }}>
                <span>Thời hạn: <strong>{renewal.contractYears} năm</strong></span>
                <span>Lương mới: <strong>{formatEuroThousands(renewal.wageAnnual)}/năm</strong></span>
                <span>Dự kiến ra sân: <strong>~{renewal.expectedLeagueApps} trận</strong></span>
              </div>

              <button
                type="button"
                className="btn-primary"
                disabled={isProcessing}
                onClick={() => {
                  onAcceptOffer(renewal);
                  if (onClose) onClose();
                }}
                style={{
                  marginTop: 6,
                  padding: "8px 16px",
                  background: "#15803d",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                CHẤP NHẬN GIA HẠN THỤ ĐỘNG
              </button>
            </div>
          ) : (
            <div
              style={{
                padding: 14,
                borderRadius: 8,
                border: "1px dashed rgba(0, 0, 0, 0.2)",
                background: "#f8fafc",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 600 }}>
                  CLB hiện tại chưa gửi lời đề nghị gia hạn tự động
                </p>
                <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>
                  Bạn có thể gửi yêu cầu đề nghị gia hạn chủ động dựa trên đóng góp & chỉ số vị trí mùa vừa qua.
                </span>
              </div>

              {!isUnemployedMarket && (
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={isProcessing}
                  onClick={async () => {
                    const res = await onProactiveRenewal("standard");
                    if (res === true && onClose) onClose();
                  }}
                  style={{
                    padding: "8px 14px",
                    fontSize: "0.8rem",
                    borderRadius: 6,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  GỬI ĐỀ NGHỊ GIA HẠN CHỦ ĐỘNG
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: INBOUND OFFERS SECTION ── */}
      {activeTab === "inbound" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, animation: "fadeIn 0.2s ease" }}>
          <h4 style={{ margin: 0, fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#334155" }}>
            2. Lời đề nghị chuyển nhượng gửi tới ({inbound.length}/3)
          </h4>

          {inbound.length === 0 ? (
            <p style={{ margin: 0, fontSize: "0.8rem", opacity: 0.65 }}>
              Chưa có CLB nào gửi lời đề nghị chính thức trong mùa giải này.
            </p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
              {inbound.map((offer) => {
                const offerKey = `inbound-${offer.clubId}`;
                const selectedDeal = wageDeals[offerKey] || "standard";
                const wageOptions = computeWageOptions({
                  baseWage: offer.wageAnnual,
                  minWage: Math.round(offer.wageAnnual * 0.5),
                  maxWage: Math.round(offer.wageAnnual * 1.8),
                });
                const activeWage = wageOptions[selectedDeal].wageAnnual;

                return (
                  <div
                    key={offerKey}
                    style={{
                      padding: 14,
                      borderRadius: 8,
                      border: "2px solid var(--charcoal, #1e293b)",
                      background: "#fff",
                      boxShadow: "2px 2px 0 var(--charcoal, #1e293b)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <strong style={{ fontSize: "0.95rem" }}>{offer.clubName}</strong>
                      <span style={{ fontSize: "0.65rem", color: "var(--coral, #e85d42)", fontWeight: 700 }}>ĐỀ NGHỊ CHÍNH THỨC</span>
                    </div>
                    <span style={{ fontSize: "0.75rem", opacity: 0.75 }}>
                      {offer.leagueName} · {offer.reason}
                    </span>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 8px", fontSize: "0.78rem" }}>
                      <span>Phí: <strong>{offer.transferFee <= 0 ? "Miễn phí" : formatEuroThousands(offer.transferFee)}</strong></span>
                      <span>HĐ: <strong>{offer.contractYears} năm</strong></span>
                      <span>Lương: <strong>{formatEuroThousands(activeWage)}</strong></span>
                      <span>Dự kiến: <strong>~{offer.expectedLeagueApps} trận</strong></span>
                    </div>

                    {/* Wage Deal Selector */}
                    <div style={{ marginTop: 4 }}>
                      <label style={{ display: "block", fontSize: "0.68rem", opacity: 0.7, marginBottom: 2 }}>
                        Thương lượng Lương:
                      </label>
                      <select
                        value={selectedDeal}
                        disabled={isProcessing}
                        onChange={(e) => handleSetWageDeal(offerKey, e.target.value as WageDealOption)}
                        style={{ width: "100%", padding: "4px 6px", fontSize: "0.75rem", borderRadius: 4 }}
                      >
                        <option value="lower">🔻 Giảm lương ({formatEuroThousands(wageOptions.lower.wageAnnual)})</option>
                        <option value="standard">➖ Tiêu chuẩn ({formatEuroThousands(wageOptions.standard.wageAnnual)})</option>
                        <option value="higher">🔺 Tăng lương ({formatEuroThousands(wageOptions.higher.wageAnnual)})</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      className="btn-primary"
                      disabled={isProcessing}
                      onClick={() => {
                        onAcceptOffer({ ...offer, wageAnnual: activeWage });
                        if (onClose) onClose();
                      }}
                      style={{ marginTop: 6, padding: "8px", fontSize: "0.8rem" }}
                    >
                      CHẤP NHẬN ĐỀ NGHỊ
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: DYNAMIC SHORTLIST & SEARCH SECTION ── */}
      {activeTab === "shortlist" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, animation: "fadeIn 0.2s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h4 style={{ margin: 0, fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#334155" }}>
              3. Tìm kiếm & Lọc CLB để Ngỏ lời
            </h4>
            <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>
              Tìm thấy {totalCount} CLB
            </span>
          </div>

        {/* Filters bar */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <div style={{ flex: "1 1 200px", position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", opacity: 0.5 }} />
            <input
              type="text"
              placeholder="Nhập tên CLB muốn tìm..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              style={{
                width: "100%",
                padding: "6px 10px 6px 30px",
                fontSize: "0.8rem",
                borderRadius: 6,
                border: "1px solid rgba(0,0,0,0.2)",
              }}
            />
          </div>

          <select
            value={selectedLeague}
            onChange={(e) => {
              setSelectedLeague(e.target.value);
              setPage(1);
            }}
            style={{ padding: "6px 10px", fontSize: "0.8rem", borderRadius: 6, border: "1px solid rgba(0,0,0,0.2)" }}
          >
            <option value="all">Tất cả giải đấu</option>
            {availableLeagues.map((lg) => (
              <option key={lg.id} value={lg.id}>
                {lg.name} (Hạng {lg.tier})
              </option>
            ))}
          </select>

          <select
            value={selectedPrestige}
            onChange={(e) => {
              setSelectedPrestige(Number(e.target.value));
              setPage(1);
            }}
            style={{ padding: "6px 10px", fontSize: "0.8rem", borderRadius: 6, border: "1px solid rgba(0,0,0,0.2)" }}
          >
            <option value={0}>Tất cả cấp độ uy tín (⭐)</option>
            <option value={5}>⭐ 5 Sao (Siêu CLB / Elite)</option>
            <option value={4}>⭐ 4 Sao (CLB Hàng Đầu)</option>
            <option value={3}>⭐ 3 Sao (CLB Tầm Trung)</option>
            <option value={2}>⭐ 2 Sao (CLB Hạng Nhì)</option>
            <option value={1}>⭐ 1 Sao (CLB Nhỏ)</option>
          </select>
        </div>

        {/* Results grid */}
        {isSearching ? (
          <p style={{ margin: "20px 0", textAlign: "center", fontSize: "0.82rem", opacity: 0.6 }}>
            Đang tìm kiếm danh sách CLB...
          </p>
        ) : searchResults.length === 0 ? (
          <p style={{ margin: "20px 0", textAlign: "center", fontSize: "0.82rem", opacity: 0.6 }}>
            Không tìm thấy CLB nào phù hợp với bộ lọc.
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
            {searchResults.map((club) => {
              const rejected = approachRejects[club.clubId];
              const clubKey = `search-${club.clubId}`;
              const selectedDeal = wageDeals[clubKey] || "standard";

              const baseChance = club.acceptChance ?? 0;
              const lowerPct = approachChancePercent(applyWageDealChance(baseChance, "lower"));
              const standardPct = approachChancePercent(applyWageDealChance(baseChance, "standard"));
              const higherPct = approachChancePercent(applyWageDealChance(baseChance, "higher"));

              const adjustedChance = applyWageDealChance(baseChance, selectedDeal);
              const currentPct = approachChancePercent(adjustedChance);
              const canClick = club.canApproach && !rejected && !isProcessing;

              return (
                <div
                  key={club.clubId}
                  style={{
                    padding: 12,
                    borderRadius: 6,
                    border: "1.5px solid var(--charcoal, #1e293b)",
                    background: "#fff",
                    opacity: canClick || rejected ? 1 : 0.6,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <strong style={{ fontSize: "0.9rem" }}>{club.clubName}</strong>
                    <span style={{ fontSize: "0.7rem", color: "#eab308" }}>{"⭐".repeat(club.prestige)}</span>
                  </div>

                  <span style={{ fontSize: "0.75rem", opacity: 0.75 }}>
                    {club.leagueName} · ~{club.expectedLeagueApps} trận · HĐ {club.previewYears} năm
                  </span>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                    <span>Phí mua: <strong>{club.previewFee <= 0 ? "Miễn phí" : formatEuroThousands(club.previewFee)}</strong></span>
                    <span>Lương: <strong>{formatEuroThousands(club.previewWage)}</strong></span>
                  </div>

                  {club.blockReason && !rejected && (
                    <span style={{ fontSize: "0.7rem", color: "var(--coral, #e85d42)" }}>{club.blockReason}</span>
                  )}

                  {rejected && (
                    <span style={{ fontSize: "0.7rem", color: "var(--coral, #e85d42)", fontWeight: 600 }}>
                      ĐÃ TỪ CHỐI BAN ĐẦU (Tỷ lệ đàm phán {approachChancePercent(rejected.chance)}%)
                    </span>
                  )}

                  {club.canApproach && !rejected && (
                    <>
                      {/* Wage Deal Selector */}
                      <select
                        value={selectedDeal}
                        disabled={isProcessing}
                        onChange={(e) => handleSetWageDeal(clubKey, e.target.value as WageDealOption)}
                        style={{ marginTop: 4, padding: "3px 6px", fontSize: "0.72rem", borderRadius: 4 }}
                      >
                        <option value="lower">🔻 Giảm lương → Tăng cơ hội ({lowerPct}%)</option>
                        <option value="standard">➖ Mức lương tiêu chuẩn ({standardPct}%)</option>
                        <option value="higher">🔺 Đòi tăng lương → Giảm cơ hội ({higherPct}%)</option>
                      </select>

                      <button
                        type="button"
                        className="btn-primary"
                        disabled={!canClick}
                        onClick={async () => {
                          const res = await onApproachShortlist(club, selectedDeal);
                          if (res === true && onClose) onClose();
                        }}
                        style={{ marginTop: 4, padding: "6px 10px", fontSize: "0.78rem" }}
                      >
                        NGỎ LỜI ({currentPct}%)
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 10 }}>
            <button
              type="button"
              disabled={page <= 1 || isSearching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{ padding: "4px 8px", borderRadius: 4, cursor: page <= 1 ? "not-allowed" : "pointer" }}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: "0.78rem" }}>
              Trang {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || isSearching}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              style={{ padding: "4px 8px", borderRadius: 4, cursor: page >= totalPages ? "not-allowed" : "pointer" }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
      )}
      </div>
      {/* ── END SCROLLABLE MIDDLE BODY AREA ── */}

      {/* ── PINNED FIXED FOOTER AREA ── */}
      <div
        style={{
          padding: "12px 20px",
          borderTop: "2px solid var(--charcoal, #1e293b)",
          backgroundColor: "var(--cream-dark, #e2e8f0)",
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          borderRadius: "0 0 8px 8px",
        }}
      >
        <button
          type="button"
          className="btn-secondary"
          disabled={isProcessing}
          onClick={() => {
            onRejectAll();
            if (onClose) onClose();
          }}
          style={{
            padding: "10px 22px",
            fontSize: "0.88rem",
            fontWeight: 800,
            fontFamily: "var(--font-headline)",
            backgroundColor: "var(--white)",
            border: "2px solid var(--charcoal)",
            borderRadius: "6px",
            boxShadow: "3px 3px 0 var(--charcoal)",
            cursor: "pointer",
          }}
        >
          {isFa ? "BỎ QUA / KÝ HỢP ĐỒNG TỰ DO" : "BỎ QUA / Ở LẠI CLB HIỆN TẠI"}
        </button>
      </div>
    </div>
  );

  if (onClose) {
    return (
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.75)",
          backdropFilter: "blur(6px)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
        }}
      >
        <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "880px" }}>
          {content}
        </div>
      </div>
    );
  }

  return content;
}
