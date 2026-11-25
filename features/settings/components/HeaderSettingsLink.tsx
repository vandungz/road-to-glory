"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { IconButton } from "@/components/ui/IconButton";

export function HeaderSettingsLink({ disabled = false }: { disabled?: boolean }) {
  const pathname = usePathname();
  const ui = useTranslations("ui");
  if (pathname === "/settings") return null;
  const icon = <Settings size={18} strokeWidth={1.7} aria-hidden="true" />;
  return disabled ? <IconButton disabled aria-label={ui("settings")}>{icon}</IconButton>
    : <Link className="football-icon-button" href={`/settings?returnTo=${encodeURIComponent(pathname)}`} aria-label={ui("settings")} title={ui("settings")}>{icon}</Link>;
}
