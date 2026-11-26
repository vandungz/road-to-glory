import { SupportLink } from "@/components/shared/SupportLink";
import { HelpButton } from "@/features/onboarding/HelpButton";
import { HeaderAudioButton } from "@/features/audio/HeaderAudioButton";
import { HeaderSettingsLink } from "@/features/settings/components/HeaderSettingsLink";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface WheelGameHeaderProps {
  backHref: string;
  isBusy?: boolean;
}

export function WheelGameHeader({
  backHref,
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
        <div className="football-header-tools">
          <HeaderAudioButton />
          <HeaderSettingsLink disabled={isBusy} />
          <HelpButton /><SupportLink iconOnly />
        </div>
      </div>
    </header>
  );
}
