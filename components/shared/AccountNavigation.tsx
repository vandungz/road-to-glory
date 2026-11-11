"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, UserRound } from "lucide-react";

export function AccountNavigation({ newTab = false }: { newTab?: boolean }) {
  const pathname = usePathname();
  const target = newTab ? "_blank" : undefined;
  const titleSuffix = newTab ? " (mở tab mới)" : "";

  return (
    <nav className="football-account-nav" aria-label="Tài khoản và cài đặt">
      <Link href="/profile" target={target} rel={newTab ? "noopener" : undefined} aria-current={pathname === "/profile" ? "page" : undefined} aria-label="Hồ sơ" title={`Hồ sơ${titleSuffix}`}>
        <UserRound aria-hidden="true" size={19} />
      </Link>
      <Link href="/settings" target={target} rel={newTab ? "noopener" : undefined} aria-current={pathname === "/settings" ? "page" : undefined} aria-label="Cài đặt" title={`Cài đặt${titleSuffix}`}>
        <Settings aria-hidden="true" size={19} />
      </Link>
    </nav>
  );
}
