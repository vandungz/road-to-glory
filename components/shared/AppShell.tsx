import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/features/auth/components/LogoutButton";

interface AppShellProps {
  children: React.ReactNode;
  userEmail?: string;
  headerMeta?: React.ReactNode;
  headerIdentityMeta?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  footerAction?: React.ReactNode;
  className?: string;
}

export function AppShell({
  children,
  userEmail,
  headerMeta,
  headerIdentityMeta,
  backHref,
  backLabel = "Quay lại",
  footerAction,
  className,
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
            <i aria-hidden="true" />
            <small>Football Life</small>
          </Link>
          {headerIdentityMeta && (
            <span className="football-app-shell__identity-meta">{headerIdentityMeta}</span>
          )}
        </div>

        <div className="football-app-shell__context">
          {headerMeta}
          {userEmail && <span className="football-app-shell__email">{userEmail}</span>}
          {userEmail && <LogoutButton />}
        </div>
      </header>

      <main className="football-app-shell__main">{children}</main>

      <footer className="football-app-shell__footer">
        <span>Football Life © Road to Glory — mùa 2025/26</span>
        {footerAction ?? <span aria-hidden="true" />}
      </footer>
    </div>
  );
}
