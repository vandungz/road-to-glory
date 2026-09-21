import Link from "next/link";
import { ArrowLeft, ShoppingBag, Trophy } from "lucide-react";

interface WheelGameHeaderProps {
  backHref: string;
  gameName?: string;
  position: string;
  slotIndex: number;
  mode: "setup" | "career" | "retired";
  seasonLabel?: string;
  age?: number;
  currentClubName?: string | null;
  overall?: number | null;
  shopHref?: string;
  onOpenTrophyCabinet?: () => void;
  isBusy?: boolean;
}

export function WheelGameHeader({
  backHref,
  gameName,
  position,
  slotIndex,
  mode,
  seasonLabel,
  age,
  currentClubName,
  overall,
  shopHref,
  onOpenTrophyCabinet,
  isBusy = false,
}: WheelGameHeaderProps) {
  return (
    <header className="football-wheel-header">
      <div className="football-wheel-header__identity">
        {isBusy ? (
          <button className="football-wheel-header__back" type="button" disabled aria-label="Bản đồ đội hình (đang quay)">
            <ArrowLeft aria-hidden="true" size={14} />
            <span>Bản đồ đội hình</span>
          </button>
        ) : (
          <Link className="football-wheel-header__back" href={backHref}>
            <ArrowLeft aria-hidden="true" size={14} />
            <span>Bản đồ đội hình</span>
          </Link>
        )}
        <i className="football-wheel-header__separator" aria-hidden="true" />
        {isBusy ? (
          <button className="football-wheel-header__wordmark" type="button" disabled aria-label="Road to Glory (đang quay)">
            <span>Road to Glory</span>
          </button>
        ) : (
          <Link className="football-wheel-header__wordmark" href="/">
            <span>Road to Glory</span>
          </Link>
        )}
      </div>

      <div className="football-wheel-header__right">
        <div className="football-wheel-header__context">
          {mode === "setup" ? (
            <>
              <span><small>Đội hình</small><strong>{gameName || "Đội hình mới"}</strong></span>
              <span><small>Vị trí</small><strong>{position} · slot {slotIndex + 1}</strong></span>
            </>
          ) : (
            <>
              <span><small>Mùa</small><strong>{seasonLabel ?? "—"}</strong></span>
              <span><small>Tuổi</small><strong>{age ?? "—"}</strong></span>
              <span><small>CLB</small><strong>{currentClubName || "Tự do"}</strong></span>
              <span><small>OVR</small><strong className="football-wheel-header__overall">{overall ?? "—"}</strong></span>
            </>
          )}
        </div>

        {mode === "career" && (
          <>
            <i className="football-wheel-header__separator" aria-hidden="true" />
            <div className="football-wheel-header__actions">
              {shopHref && !isBusy ? (
                <Link className="football-wheel-header__icon-button" href={shopHref} aria-label="Cửa hàng">
                  <ShoppingBag aria-hidden="true" size={19} strokeWidth={1.6} />
                </Link>
              ) : (
                <button className="football-wheel-header__icon-button" type="button" disabled aria-label="Cửa hàng (đang khóa)">
                  <ShoppingBag aria-hidden="true" size={19} strokeWidth={1.6} />
                </button>
              )}
              <button className="football-wheel-header__icon-button" type="button" onClick={isBusy ? undefined : onOpenTrophyCabinet} disabled={isBusy} aria-label={isBusy ? "Tủ danh hiệu (đang quay)" : "Tủ danh hiệu"}>
                <Trophy aria-hidden="true" size={19} strokeWidth={1.6} />
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
