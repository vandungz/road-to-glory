"use client";

import { useOptimistic, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { locales, type Locale } from "@/i18n/locale";
import { saveBrowserLocale } from "@/i18n/browser-locale";

const names: Record<Locale, string> = { vi: "Tiếng Việt", en: "English" };

export function LanguageSettings() {
  const t = useTranslations("settings");
  const locale = useLocale();
  const [selection, setSelection] = useOptimistic(locale);
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function selectLanguage(language: Locale) {
    saveBrowserLocale(language);
    startTransition(() => {
      setSelection(language);
      router.refresh();
    });
  }

  return <fieldset className="football-account-options" disabled={pending}>
    <legend>{t("language")}</legend>
    {locales.map((language) => (
      <label key={language}>
        <input type="radio" name="locale" checked={language === selection} onChange={() => selectLanguage(language)} />
        <span lang={language}>{names[language]}</span>
      </label>
    ))}
  </fieldset>;
}
