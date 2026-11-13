import { useTranslations } from "next-intl";
import Link from "next/link";
import { Settings, UserRound } from "lucide-react";

export function AccountNavigation() {
  const ui = useTranslations("ui");

  return (
    <nav className="football-account-nav" aria-label={ui("accountAndSettings")}>
      <Link href="/profile" aria-label={ui("profile")} title={ui("profile")}>
        <UserRound aria-hidden="true" size={19} />
      </Link>
      <Link href="/settings" aria-label={ui("settings")} title={ui("settings")}>
        <Settings aria-hidden="true" size={19} />
      </Link>
    </nav>
  );
}
