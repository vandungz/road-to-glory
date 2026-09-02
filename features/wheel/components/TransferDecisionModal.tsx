"use client";

import React, { useState } from "react";
import { X, FileText, CheckCircle2, XCircle, Building2, ChevronDown, ChevronUp } from "lucide-react";
import { formatEuroThousands } from "@/lib/transfer-economy";
import type { ContractOfferCard, ShortlistClubCard, TransferMarketResult } from "@/features/transfer/services/transfer.service";
import type { ApproachRejectState } from "./TransferWindowPanel";
import { Modal, ModalHeader } from "@/components/ui/Modal";

interface TransferDecisionModalProps {
  market: TransferMarketResult;
  isProcessing: boolean;
  onAcceptOffer: (offer: ContractOfferCard) => void;
  onRejectAll: () => void;
  onApproachShortlist: (club: ShortlistClubCard) => void;
  showShortlist: boolean;
  setShowShortlist: (v: boolean) => void;
  approachRejects: ApproachRejectState;
  onClose: () => void;
}

export function TransferDecisionModal({
  market,
  isProcessing,
  onAcceptOffer,
  onRejectAll,
  onApproachShortlist,
  showShortlist,
  setShowShortlist,
  approachRejects,
  onClose,
}: TransferDecisionModalProps) {
  const { contract, renewal, inbound, shortlist, isUnemployedMarket } = market;
  const allOffers: ContractOfferCard[] = [];
  if (renewal) allOffers.push(renewal);
  if (inbound && inbound.length > 0) allOffers.push(...inbound);

  const [selectedOfferIndex, setSelectedOfferIndex] = useState<number>(0);

  const activeOffer = allOffers[selectedOfferIndex] ?? renewal ?? (inbound ? inbound[0] : null);

  const currentWage = contract.currentWageAnnual;
  const offerWage = activeOffer ? activeOffer.wageAnnual : 0;
  const wageDiffPct = currentWage > 0 ? Math.round(((offerWage - currentWage) / currentWage) * 100) : 0;

  return (
    <Modal open title="Đàm phán chuyển nhượng" onClose={onClose} size="lg">
      <ModalHeader className="sr-only">Đàm phán chuyển nhượng</ModalHeader>
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* HEADER — CONTRACT FAX METAPHOR */}
        <div
          style={{
            backgroundColor: "var(--white)",
            borderBottom: "2px solid var(--charcoal)",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <FileText size={22} color="var(--coral)" />
            <div>
              <span
                style={{
                  fontFamily: "var(--font-stamp)",
                  fontSize: "0.55rem",
                  color: "var(--coral)",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                CỬA SỔ CHUYỂN NHƯỢNG · NGHỊ ĐỊNH HỢP ĐỒNG
              </span>
              <h2
                style={{
                  fontFamily: "var(--font-headline)",
                  fontSize: "1.3rem",
                  fontWeight: 900,
                  color: "var(--charcoal)",
                  margin: 0,
                  textTransform: "uppercase",
                }}
              >
                ĐÀM PHÁN CHUYỂN NHƯỢNG
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng đàm phán chuyển nhượng"
            style={{
              background: "none",
              border: "1.5px solid var(--charcoal)",
              borderRadius: "3px",
              padding: "4px",
              cursor: "pointer",
              backgroundColor: "var(--white)",
            }}
          >
            <X size={18} color="var(--charcoal)" />
          </button>
        </div>

        {/* MODAL CONTENT */}
        <div style={{ padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>
          
          {/* CURRENT CONTRACT SUMMARY (STICKY HEADER) */}
          <div
            style={{
              backgroundColor: "var(--white)",
              border: "1.5px solid var(--charcoal)",
              borderRadius: "4px",
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "2px 2px 0 var(--charcoal)",
            }}
          >
            <div>
              <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.5rem", color: "var(--ink-gray)" }}>HỢP ĐỒNG HIỆN TẠI</span>
              <div style={{ fontFamily: "var(--font-headline)", fontSize: "1.05rem", fontWeight: 700, color: "var(--charcoal)" }}>
                {isUnemployedMarket ? "KHÔNG CÓ CLB (TỰ DO)" : (renewal?.clubName ?? "CLB HÃNG ĐỊNH")}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.5rem", color: "var(--ink-gray)" }}>LƯƠNG / NĂM</span>
              <div style={{ fontFamily: "var(--font-stamp)", fontSize: "0.95rem", fontWeight: 700, color: "#266b3e" }}>
                {formatEuroThousands(currentWage)}
              </div>
            </div>
          </div>

          {/* OFFER SELECTOR TABS */}
          {allOffers.length > 0 && (
            <div style={{ display: "flex", gap: "8px", overflowX: "auto" }}>
              {allOffers.map((off, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedOfferIndex(idx)}
                  style={{
                    padding: "8px 14px",
                    fontFamily: "var(--font-headline)",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    borderRadius: "3px",
                    border: selectedOfferIndex === idx ? "2px solid var(--charcoal)" : "1px solid var(--cream-border)",
                    backgroundColor: selectedOfferIndex === idx ? "var(--cream-dark)" : "var(--white)",
                    boxShadow: selectedOfferIndex === idx ? "2px 2px 0 var(--charcoal)" : "none",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {off.kind === "renewal" ? "GIA HẠN" : off.clubName}
                </button>
              ))}
            </div>
          )}

          {/* SIDE-BY-SIDE CONTRACT COMPARISON */}
          {activeOffer ? (
            <div
              style={{
                backgroundColor: "var(--white)",
                border: "2px solid var(--charcoal)",
                borderRadius: "4px",
                padding: "16px",
                boxShadow: "3px 3px 0 var(--charcoal)",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--cream-border)", paddingBottom: "8px" }}>
                <div>
                  <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.52rem", color: "var(--coral)", fontWeight: 700 }}>
                    {activeOffer.kind === "renewal" ? "ĐỀ NGHỊ GIA HẠN" : activeOffer.kind === "free_agent" ? "ĐỀ NGHỊ TỰ DO" : "ĐỀ NGHỊ CHUYỂN NHƯỢNG"}
                  </span>
                  <h3 style={{ fontFamily: "var(--font-headline)", fontSize: "1.2rem", fontWeight: 900, margin: 0, textTransform: "uppercase" }}>
                    {activeOffer.clubName} ({activeOffer.leagueName})
                  </h3>
                </div>
                {wageDiffPct !== 0 && (
                  <div
                    style={{
                      border: "1.5px solid var(--charcoal)",
                      backgroundColor: wageDiffPct > 0 ? "#e5f5ea" : "#fce8e6",
                      color: wageDiffPct > 0 ? "#266b3e" : "var(--coral)",
                      padding: "4px 8px",
                      borderRadius: "3px",
                      fontFamily: "var(--font-stamp)",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                    }}
                  >
                    {wageDiffPct > 0 ? `+${wageDiffPct}% LƯƠNG` : `${wageDiffPct}% LƯƠNG`}
                  </div>
                )}
              </div>

              {/* COMPARISON GRID */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "0.82rem", fontFamily: "var(--font-stamp)" }}>
                <div style={{ backgroundColor: "var(--cream)", padding: "10px", borderRadius: "3px" }}>
                  <div style={{ color: "var(--ink-gray)", fontSize: "0.55rem" }}>LƯƠNG HÀNG NĂM</div>
                  <strong style={{ fontSize: "1rem", color: "#266b3e" }}>{formatEuroThousands(activeOffer.wageAnnual)}</strong>
                </div>

                <div style={{ backgroundColor: "var(--cream)", padding: "10px", borderRadius: "3px" }}>
                  <div style={{ color: "var(--ink-gray)", fontSize: "0.55rem" }}>THỜI HẠN HỢP ĐỒNG</div>
                  <strong style={{ fontSize: "1rem" }}>{activeOffer.contractYears} Năm</strong>
                </div>

                <div style={{ backgroundColor: "var(--cream)", padding: "10px", borderRadius: "3px" }}>
                  <div style={{ color: "var(--ink-gray)", fontSize: "0.55rem" }}>PHÍ CHUYỂN NHƯỢNG</div>
                  <strong>{activeOffer.transferFee <= 0 ? "MIỄN PHÍ" : formatEuroThousands(activeOffer.transferFee)}</strong>
                </div>

                <div style={{ backgroundColor: "var(--cream)", padding: "10px", borderRadius: "3px" }}>
                  <div style={{ color: "var(--ink-gray)", fontSize: "0.55rem" }}>ƯỚC TÍNH SỐ TRẬN</div>
                  <strong>~{activeOffer.expectedLeagueApps} Trận/Mùa</strong>
                </div>
              </div>

              {/* ACTION STAMP BUTTONS */}
              <div style={{ display: "flex", gap: "12px", marginTop: "6px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => onAcceptOffer(activeOffer)}
                  className="btn-primary"
                  style={{
                    flex: "2 1 200px",
                    fontSize: "1rem",
                    padding: "12px",
                    minHeight: "48px",
                    backgroundColor: "#266b3e",
                    color: "var(--white)",
                    boxShadow: "3px 3px 0 var(--charcoal)",
                    opacity: isProcessing ? 0.6 : 1,
                  }}
                >
                  <CheckCircle2 size={18} style={{ display: "inline", marginRight: "6px" }} />
                  ĐÓNG DẤU CHẤP NHẬN (APPROVED)
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={onRejectAll}
                  style={{
                    flex: "1 1 120px",
                    fontSize: "0.88rem",
                    fontWeight: 700,
                    fontFamily: "var(--font-headline)",
                    padding: "12px",
                    minHeight: "48px",
                    backgroundColor: "var(--white)",
                    color: "var(--coral)",
                    border: "2px solid var(--charcoal)",
                    boxShadow: "3px 3px 0 var(--charcoal)",
                    cursor: "pointer",
                    opacity: isProcessing ? 0.6 : 1,
                  }}
                >
                  <XCircle size={16} style={{ display: "inline", marginRight: "4px" }} />
                  TỪ CHỐI
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "20px", color: "var(--ink-gray)" }}>
              Không có đề nghĩa chuyển nhượng nào trong mùa này.
            </div>
          )}

          {/* COLLAPSIBLE SHORTLIST SECTION */}
          {shortlist && shortlist.length > 0 && (
            <div style={{ border: "1.5px solid var(--charcoal)", borderRadius: "4px", backgroundColor: "var(--white)" }}>
              <div
                onClick={() => setShowShortlist(!showShortlist)}
                style={{
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  backgroundColor: "var(--cream-dark)",
                }}
              >
                <span style={{ fontFamily: "var(--font-headline)", fontSize: "0.85rem", fontWeight: 700 }}>
                  <Building2 size={16} style={{ display: "inline", marginRight: "6px" }} />
                  TIẾP CẬN CLB MƠ ƯỚC ({shortlist.length})
                </span>
                {showShortlist ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>

              {showShortlist && (
                <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  {shortlist.map((club) => {
                    const chance = Math.round((club.acceptChance ?? 0.5) * 100);
                    const reject = approachRejects[club.clubId];

                    return (
                      <div
                        key={club.clubId}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 10px",
                          backgroundColor: "var(--cream)",
                          border: "1px solid var(--cream-border)",
                          borderRadius: "3px",
                        }}
                      >
                        <div>
                          <strong style={{ fontFamily: "var(--font-headline)", fontSize: "0.85rem" }}>{club.clubName}</strong>
                          <div style={{ fontSize: "0.68rem", color: "var(--ink-gray)", fontFamily: "var(--font-stamp)" }}>
                            Tỉ lệ tiếp cận thành công: {chance}%
                          </div>
                        </div>

                        {reject ? (
                          <span style={{ fontSize: "0.7rem", color: "var(--coral)", fontWeight: 700 }}>ĐÃ TỪ CHỐI</span>
                        ) : (
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => onApproachShortlist(club)}
                            style={{
                              padding: "4px 10px",
                              fontFamily: "var(--font-headline)",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              backgroundColor: "var(--charcoal)",
                              color: "var(--white)",
                              border: "none",
                              borderRadius: "3px",
                              cursor: "pointer",
                            }}
                          >
                            GỬI ĐỀ NGHỊ
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </Modal>
  );
}
