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
    <div className={cn("rtg-app-shell", className)}>
      <header className="rtg-app-shell__header">
        <div className="rtg-app-shell__identity">
          {backHref && (
            <Link className="rtg-app-shell__back" href={backHref} aria-label={backLabel}>
              <ArrowLeft aria-hidden="true" size={16} />
              <span>{backLabel}</span>
            </Link>
          )}
          <Link className="rtg-app-shell__wordmark" href="/">
            <span>Road to Glory</span>
            <i aria-hidden="true" />
            <small>Football Life</small>
          </Link>
          {headerIdentityMeta && (
            <span className="rtg-app-shell__identity-meta">{headerIdentityMeta}</span>
          )}
        </div>

        <div className="rtg-app-shell__context">
          {headerMeta}
          {userEmail && <span className="rtg-app-shell__email">{userEmail}</span>}
          {userEmail && <LogoutButton />}
        </div>
      </header>

      <main className="rtg-app-shell__main">{children}</main>

      <footer className="rtg-app-shell__footer">
        <span>Football Life © Road to Glory — mùa 2025/26</span>
        {footerAction ?? <span aria-hidden="true" />}
      </footer>
    </div>
  );
}
