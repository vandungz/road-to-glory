import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/features/auth/components/LogoutButton";
import { AccountNavigation } from "./AccountNavigation";

interface AppShellProps {
  children: React.ReactNode;
  isAuthenticated?: boolean;
  headerMeta?: React.ReactNode;
  headerIdentityMeta?: React.ReactNode;
  backHref?: string;
  backLabel?: "back" | "home" | "squads" | "career" | "modeSelect" | "setup" | "pve" | "squadBoard";
  className?: string;
  showAccountControls?: boolean;
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
}: AppShellProps) {
  const ui = useTranslations("ui");
  const common = useTranslations("common");
  const backText = common(backLabel);
  return (
    <div className={cn("football-app-shell", className)}>
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
          {headerMeta}
          {showAccountControls && <AccountNavigation />}
          {showAccountControls && isAuthenticated && <LogoutButton />}
        </div>
      </header>

      <main className="football-app-shell__main" data-mount="page">{children}</main>

      <footer className="football-app-shell__footer">
        <span>{ui("footballLifeRoadToGlory202526Season")}</span>
      </footer>
    </div>
  );
}
