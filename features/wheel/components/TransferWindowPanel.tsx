"use client";

import { approachChancePercent, formatEuroThousands } from "@/lib/transfer-economy";
import type { ContractOfferCard, ShortlistClubCard, TransferMarketResult } from "@/features/transfer/services/transfer.service";

export type ApproachRejectState = Record<string, { chance: number; reason: string }>;

interface TransferWindowPanelProps {
  market: TransferMarketResult;
  willingToMove: boolean;
  setWillingToMove: (v: boolean) => void;
  isProcessing: boolean;
  onAcceptOffer: (offer: ContractOfferCard) => void;
  onRejectAll: () => void;
  onApproachShortlist: (club: ShortlistClubCard) => void;
  showShortlist: boolean;
  setShowShortlist: (v: boolean) => void;
  approachRejects: ApproachRejectState;
  approachBanner: string | null;
}

function OfferCard({
  offer,
  isProcessing,
  onAccept,
  accent,
}: {
  offer: ContractOfferCard;
  isProcessing: boolean;
  onAccept: () => void;
  accent: string;
}) {
  return (
    <div
      style={{
        border: `2px solid ${accent}`,
        borderRadius: 4,
        padding: "14px 16px",
        background: "var(--white)",
        boxShadow: "2px 2px 0 var(--charcoal)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: "100%",
        textAlign: "left",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
        <strong style={{ fontFamily: "var(--font-headline)", fontSize: "1rem", textTransform: "uppercase" }}>
          {offer.clubName}
        </strong>
        <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.55rem", letterSpacing: "0.08em", color: accent }}>
          {offer.kind === "renewal" ? "GIA HẠN" : offer.kind === "free_agent" ? "TỰ DO" : "CHUYỂN NHƯỢNG"}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--charcoal)", opacity: 0.85 }}>
        {offer.leagueName} · {offer.reason}
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "6px 12px",
          fontSize: "0.78rem",
          fontFamily: "var(--font-stamp)",
        }}
      >
        <span>Phí: <strong>{offer.transferFee <= 0 ? "—" : formatEuroThousands(offer.transferFee)}</strong></span>
        <span>Lương/năm: <strong>{formatEuroThousands(offer.wageAnnual)}</strong></span>
        <span>HĐ: <strong>{offer.contractYears} năm</strong></span>
        <span>Trận dự kiến: <strong>~{offer.expectedLeagueApps} trận</strong></span>
      </div>
      <button
        type="button"
        className="btn-primary"
        disabled={isProcessing}
        onClick={onAccept}
        style={{ marginTop: 4, padding: "8px 12px", opacity: isProcessing ? 0.6 : 1 }}
      >
        {offer.kind === "renewal" ? "ĐỒNG Ý GIA HẠN" : "CHẤP NHẬN"}
      </button>
    </div>
  );
}

export function TransferWindowPanel({
  market,
  willingToMove,
  setWillingToMove,
  isProcessing,
  onAcceptOffer,
  onRejectAll,
  onApproachShortlist,
  showShortlist,
  setShowShortlist,
  approachRejects,
  approachBanner,
}: TransferWindowPanelProps) {
  const { contract, renewal, inbound, shortlist, mandatoryBuyout, isUnemployedMarket } = market;
  const isFa = contract.yearsRemaining <= 0 || isUnemployedMarket;

  const approachableLeft = shortlist.filter(
    (c) => c.canApproach && !approachRejects[c.clubId],
  ).length;
  const showUnemployedCta =
    isFa && !renewal && inbound.length === 0 && approachableLeft === 0;

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14, alignItems: "stretch" }}>
      {isUnemployedMarket && (
        <p
          style={{
            margin: 0,
            padding: "8px 10px",
            border: "2px solid var(--coral)",
            borderRadius: 4,
            fontSize: "0.78rem",
            fontFamily: "var(--font-stamp)",
            letterSpacing: "0.06em",
            background: "rgba(232, 93, 66, 0.08)",
          }}
        >
          CẦU THỦ TỰ DO · ĐÃ HẾT HỢP ĐỒNG
        </p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 8,
          fontSize: "0.75rem",
          padding: "10px 12px",
          border: "2px solid var(--charcoal)",
          borderRadius: 4,
          background: "var(--cream)",
          boxShadow: "2px 2px 0 var(--charcoal)",
        }}
      >
        <span>HĐ còn: <strong>{contract.yearsRemaining}/{contract.yearsTotal} năm</strong></span>
        <span>Lương: <strong>{formatEuroThousands(contract.currentWageAnnual)}/năm</strong></span>
        <span>Giá trị thị trường: <strong>{formatEuroThousands(contract.marketValue)}</strong></span>
        <span>
          Phí phá HĐ:{" "}
          <strong>{mandatoryBuyout <= 0 ? "—" : formatEuroThousands(mandatoryBuyout)}</strong>
        </span>
      </div>

      {approachBanner && (
        <p
          style={{
            margin: 0,
            padding: "8px 10px",
            border: "1.5px solid var(--charcoal)",
            borderRadius: 3,
            fontSize: "0.78rem",
            background: "var(--cream)",
          }}
        >
          {approachBanner}
        </p>
      )}

      {!isUnemployedMarket && (
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: "0.78rem",
            cursor: isProcessing ? "not-allowed" : "pointer",
            userSelect: "none",
            padding: "8px 10px",
            border: "1px dashed var(--charcoal)",
            borderRadius: 3,
            background: willingToMove ? "rgba(232, 93, 66, 0.08)" : "transparent",
          }}
        >
          <input
            type="checkbox"
            checked={willingToMove}
            disabled={isProcessing}
            onChange={(e) => setWillingToMove(e.target.checked)}
          />
          Muốn chuyển đi (Available) — Phí giải phóng hợp đồng giữ nguyên
        </label>
      )}

      {renewal && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ margin: 0, fontFamily: "var(--font-stamp)", fontSize: "0.55rem", letterSpacing: "0.12em", color: "var(--ink-gray)" }}>
            GIA HẠN CLB HIỆN TẠI
          </p>
          <OfferCard
            offer={renewal}
            isProcessing={isProcessing}
            accent="#2d5a3d"
            onAccept={() => onAcceptOffer(renewal)}
          />
          <p style={{ margin: 0, fontSize: "0.7rem", opacity: 0.75 }}>
            Đồng ý gia hạn sẽ đóng cửa sổ chuyển nhượng mùa này.
          </p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <p style={{ margin: 0, fontFamily: "var(--font-stamp)", fontSize: "0.55rem", letterSpacing: "0.12em", color: "var(--ink-gray)" }}>
          LỜI ĐỀ NGHỊ ĐẾN ({inbound.length}/3)
        </p>
        {inbound.length === 0 ? (
          <p style={{ margin: 0, fontSize: "0.8rem", opacity: 0.7, textAlign: "left" }}>
            Không có CLB nào gửi đề nghị mùa này.
          </p>
        ) : (
          inbound.map((offer) => (
            <OfferCard
              key={`${offer.clubId}-${offer.kind}`}
              offer={offer}
              isProcessing={isProcessing}
              accent="var(--coral)"
              onAccept={() => onAcceptOffer(offer)}
            />
          ))
        )}
      </div>

      {(contract.yearsRemaining <= 1 || isUnemployedMarket) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            type="button"
            className="btn-secondary"
            disabled={isProcessing}
            onClick={() => setShowShortlist(!showShortlist)}
            style={{ padding: "8px 12px", boxShadow: "1.5px 1.5px 0 var(--charcoal)" }}
          >
            {showShortlist ? "Ẩn CLB phù hợp" : "Xem CLB phù hợp để ngỏ lời"}
          </button>
          {showShortlist &&
            shortlist.map((club) => {
              const rejected = approachRejects[club.clubId];
              const pct =
                club.acceptChance != null ? approachChancePercent(club.acceptChance) : null;
              const canClick = club.canApproach && !rejected && !isProcessing;

              return (
                <div
                  key={club.clubId}
                  style={{
                    border: "1.5px solid var(--charcoal)",
                    borderRadius: 4,
                    padding: "12px 14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    textAlign: "left",
                    background: "var(--white)",
                    boxShadow: "2px 2px 0 var(--charcoal)",
                    opacity: canClick || rejected ? 1 : 0.65,
                  }}
                >
                  <strong style={{ fontFamily: "var(--font-headline)", fontSize: "0.95rem", textTransform: "uppercase" }}>
                    {club.clubName}
                  </strong>
                  <span style={{ fontSize: "0.75rem" }}>
                    {club.leagueName} · ~{club.expectedLeagueApps} trận · Phí{" "}
                    {club.previewFee <= 0 ? "—" : formatEuroThousands(club.previewFee)} · Lương{" "}
                    {formatEuroThousands(club.previewWage)} · {club.previewYears} năm
                  </span>
                  {club.blockReason && !rejected && (
                    <span style={{ fontSize: "0.72rem", color: "var(--coral)" }}>{club.blockReason}</span>
                  )}
                  {rejected && (
                    <span
                      style={{
                        fontFamily: "var(--font-stamp)",
                        fontSize: "0.58rem",
                        letterSpacing: "0.06em",
                        color: "var(--coral)",
                      }}
                    >
                      ĐÃ TỪ CHỐI BAN ĐẦU (Tỷ lệ đàm phán {approachChancePercent(rejected.chance)}%)
                      {rejected.reason ? ` — ${rejected.reason}` : ""}
                    </span>
                  )}
                  {club.canApproach && !rejected && pct != null && (
                    <>
                      <span
                        style={{
                          fontFamily: "var(--font-stamp)",
                          fontSize: "0.58rem",
                          letterSpacing: "0.08em",
                          color: "var(--coral)",
                        }}
                      >
                        Cơ hội ký HĐ: {pct}%
                      </span>
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={!canClick}
                        style={{ padding: "8px", marginTop: 4, opacity: canClick ? 1 : 0.6 }}
                        onClick={() => onApproachShortlist(club)}
                      >
                        NGỎ LỜI ({pct}%)
                      </button>
                    </>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {showUnemployedCta ? (
        <button
          type="button"
          className="btn-primary"
          disabled={isProcessing}
          onClick={onRejectAll}
          style={{
            padding: "10px",
            marginTop: 4,
            backgroundColor: "var(--charcoal)",
            color: "var(--white)",
            boxShadow: "1.5px 1.5px 0 var(--coral)",
          }}
        >
          CHẤP NHẬN MÙA THẤT NGHIỆP
        </button>
      ) : (
        <button
          type="button"
          className="btn-secondary"
          disabled={isProcessing}
          onClick={onRejectAll}
          style={{ padding: "10px", marginTop: 4, boxShadow: "1.5px 1.5px 0 var(--charcoal)" }}
        >
          {isFa ? "BỎ QUA → KÝ HỢP ĐỒNG TỰ DO" : "BỎ QUA / Ở LẠI CLB HIỆN TẠI"}
        </button>
      )}
    </div>
  );
}
