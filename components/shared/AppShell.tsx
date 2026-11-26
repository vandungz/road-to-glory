
import { ScrollArea } from "@/components/ui/ScrollArea";
import { SupportLink } from "@/components/shared/SupportLink";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/features/auth/components/LogoutButton";
import { AccountNavigation } from "./AccountNavigation";
import { HelpButton } from "@/features/onboarding/HelpButton";
import { PageGuide } from "@/features/onboarding/GuideProvider";
import type { GuideId } from "@/features/onboarding/guides";
import { HeaderLanguageButton } from "@/features/settings/components/HeaderLanguageButton";
import { HeaderAudioButton } from "@/features/audio/HeaderAudioButton";
import { HeaderSettingsLink } from "@/features/settings/components/HeaderSettingsLink";
import type { AccountAvatar } from "@/features/settings/profile-avatar";

interface AppShellProps {
  children: React.ReactNode;
  isAuthenticated?: boolean;
  headerMeta?: React.ReactNode;
  headerIdentityMeta?: React.ReactNode;
  backHref?: string;
  backLabel?: "back" | "home" | "squads" | "career" | "modeSelect" | "setup" | "pve" | "squadBoard";
  className?: string;
  showAccountControls?: boolean;
  guide?: GuideId;
  headerTools?: "all" | "help";
  accountAvatar?: AccountAvatar;
}

export function AppShell({
  children,
  isAuthenticated = false,
  headerMeta,
  headerIdentityMeta,
  backHref,
  backLabel = "back",
  className,
  showAccountControls = false,
  guide,
  headerTools = "all",
  accountAvatar,
}: AppShellProps) {
  const ui = useTranslations("ui");
  const common = useTranslations("common");
  const backText = common(backLabel);
  return (
    <div className={cn("football-app-shell", className)}>
      {guide && <PageGuide id={guide} />}
      <header className="football-app-shell__header">
        <div className="football-app-shell__identity">
          {backHref && (
            <Link className="football-app-shell__back" href={backHref} aria-label={backText}>
              <ArrowLeft aria-hidden="true" size={16} />
              <span>{backText}</span>
            </Link>
          )}
          <Link className="football-app-shell__wordmark" href="/">
            <span>Road to Glory</span>
          </Link>
          {headerIdentityMeta && (
            <span className="football-app-shell__identity-meta">{headerIdentityMeta}</span>
          )}
        </div>

        <div className="football-app-shell__context">
          {headerTools === "all" && headerMeta}
          <div className="football-header-tools">
            {headerTools === "all" && <><HeaderAudioButton />{showAccountControls && <HeaderLanguageButton />}{!showAccountControls && <HeaderSettingsLink />}</>}
            <HelpButton showLabel={showAccountControls} /><SupportLink iconOnly />
          </div>
          {showAccountControls && <div className="football-header-account">
            <AccountNavigation avatar={accountAvatar} />
            {isAuthenticated && <LogoutButton />}
          </div>}
        </div>
      </header>

      <ScrollArea as="main" className="football-app-shell__main" data-mount="page">{children}</ScrollArea>

      <footer className="football-app-shell__footer">
        <span>{ui("footballLifeRoadToGlory202526Season")}</span><SupportLink />
      </footer>
    </div>
  );
}
