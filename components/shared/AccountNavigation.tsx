import { useTranslations } from "next-intl";
import Link from "next/link";
import { Settings } from "lucide-react";

export function AccountNavigation() {
  const ui = useTranslations("ui");

  return (
    <nav className="football-account-nav" data-guide="home-account" aria-label={ui("accountAndSettings")}>
      <Link href="/settings" aria-label={ui("settings")} title={ui("settings")}>
        <Settings aria-hidden="true" size={18} strokeWidth={1.7} />
      </Link>
    </nav>
  );
}
