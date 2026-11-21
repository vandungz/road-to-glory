"use client";

import { useTransition } from "react";
import { Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { saveBrowserLocale } from "@/i18n/browser-locale";
import { usePageGuide } from "@/features/onboarding/GuideProvider";

export function HeaderLanguageButton({ disabled = false }: { disabled?: boolean }) {
  const locale = useLocale();
  const t = useTranslations("landing");
  const router = useRouter();
  const guide = usePageGuide();
  const [pending, startTransition] = useTransition();
  const target = locale === "vi" ? "en" : "vi";
  return <button type="button" className="football-header-language"
    aria-label={t("switchLanguage")} disabled={disabled || pending || guide?.page?.paused} aria-busy={pending}
    onClick={() => {
      saveBrowserLocale(target);
      startTransition(() => router.refresh());
    }}>
    <Globe size={18} strokeWidth={1.7} aria-hidden="true" />
    <span lang={target}>{target.toUpperCase()}</span>
  </button>;
}
