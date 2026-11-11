import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/features/auth/components/LogoutButton";
import { AccountNavigation } from "./AccountNavigation";

interface AppShellProps {
  children: React.ReactNode;
  userEmail?: string;
  headerMeta?: React.ReactNode;
  headerIdentityMeta?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  className?: string;
  keepGameOpen?: boolean;
}

export function AppShell({
  children,
  userEmail,
  headerMeta,
  headerIdentityMeta,
  backHref,
  backLabel = "Quay lại",
  className,
  keepGameOpen,
}: AppShellProps) {
  return (
    <div className={cn("football-app-shell", className)}>
      <header className="football-app-shell__header">
        <div className="football-app-shell__identity">
          {backHref && (
            <Link className="football-app-shell__back" href={backHref} aria-label={backLabel}>
              <ArrowLeft aria-hidden="true" size={16} />
              <span>{backLabel}</span>
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
          <AccountNavigation newTab={keepGameOpen} />
          {userEmail && <LogoutButton />}
        </div>
      </header>

      <main className="football-app-shell__main">{children}</main>

      <footer className="football-app-shell__footer">
        <span>Football Life © Road to Glory — mùa 2025/26</span>
      </footer>
    </div>
  );
}
