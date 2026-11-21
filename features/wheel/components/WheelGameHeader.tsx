import { HelpButton } from "@/features/onboarding/HelpButton";
import { HeaderLanguageButton } from "@/features/settings/components/HeaderLanguageButton";
import { useTranslations } from "next-intl";
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
  const ui = useTranslations("ui");
  return (
    <header className="football-wheel-header">
      <div className="football-wheel-header__identity">
        {isBusy ? (
          <button className="football-wheel-header__back" type="button" disabled aria-label={ui("squadBoardSpinInProgress")}>
            <ArrowLeft aria-hidden="true" size={14} />
            <span>{ui("squadBoard")}</span>
          </button>
        ) : (
          <Link className="football-wheel-header__back" href={backHref}>
            <ArrowLeft aria-hidden="true" size={14} />
            <span>{ui("squadBoard")}</span>
          </Link>
        )}
        <i className="football-wheel-header__separator" aria-hidden="true" />
        {isBusy ? (
          <button className="football-wheel-header__wordmark" type="button" disabled aria-label={ui("roadToGlorySpinInProgress")}>
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
              <span><small>{ui("squads")}</small><strong>{gameName || ui("newSquad")}</strong></span>
              <span><small>{ui("slot")} {slotIndex + 1}</small><strong>{position}</strong></span>
            </>
          ) : (
            <>
              <span><small>{ui("season")}</small><strong>{seasonLabel ?? "—"}</strong></span>
              <span><small>{ui("age")}</small><strong>{age ?? "—"}</strong></span>
              <span><small>{ui("club")}</small><strong>{currentClubName || ui("freeAgent")}</strong></span>
              <span><small>OVR</small><strong className="football-wheel-header__overall">{overall ?? "—"}</strong></span>
            </>
          )}
        </div>

        {mode === "career" && (
          <>
            <i className="football-wheel-header__separator" aria-hidden="true" />
            <div className="football-wheel-header__actions" data-guide="career-shop">
              {shopHref && !isBusy ? (
                <Link className="football-wheel-header__icon-button" href={shopHref} aria-label={ui("shop")}>
                  <ShoppingBag aria-hidden="true" size={18} strokeWidth={1.7} />
                </Link>
              ) : (
                <button className="football-wheel-header__icon-button" type="button" disabled aria-label={ui("shopLocked")}>
                  <ShoppingBag aria-hidden="true" size={18} strokeWidth={1.7} />
                </button>
              )}
              <button className="football-wheel-header__icon-button" type="button" onClick={isBusy ? undefined : onOpenTrophyCabinet} disabled={isBusy} aria-label={isBusy ? ui("trophyCabinetSpinInProgress") : ui("trophyCabinet")}>
                <Trophy aria-hidden="true" size={18} strokeWidth={1.7} />
              </button>
            </div>
          </>
        )}
        <div className="football-header-tools">
          <HeaderLanguageButton disabled={isBusy} />
          <HelpButton />
        </div>
      </div>
    </header>
  );
}
