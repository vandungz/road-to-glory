import { useTranslations } from "next-intl";
import Link from "next/link";
import { ProfileAvatar } from "@/features/settings/components/ProfileAvatar";
import type { AccountAvatar } from "@/features/settings/profile-avatar";

export function AccountNavigation({ avatar }: { avatar?: AccountAvatar }) {
  const ui = useTranslations("ui");

  return (
    <nav className="football-account-nav" data-guide="home-account" aria-label={ui("accountAndSettings")}>
      <Link href="/settings?tab=profile" aria-label={ui("profile")}>
        <ProfileAvatar choice={avatar?.choice ?? "default"} google={avatar?.google ?? null} label="" />
      </Link>
    </nav>
  );
}
