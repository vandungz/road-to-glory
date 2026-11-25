import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { UserRound, Volume2, Languages } from "lucide-react";
import { LanguageSettings } from "./LanguageSettings";
import { AudioSettings } from "@/features/audio/AudioSettings";

export async function SettingsContent({ profile }: { profile: ReactNode }) {
  const ui = await getTranslations("ui");
  const t = await getTranslations("settings");
  const audio = await getTranslations("audio");
  return <section className="football-settings-page">
    <h1>{t("title")}</h1>
    <div className="football-settings-layout">
      <nav className="football-settings-nav" aria-label={t("title")} data-guide="settings-navigation">
        <a href="#profile"><UserRound size={18} aria-hidden="true" />{ui("profile")}</a>
        <a href="#audio"><Volume2 size={18} aria-hidden="true" />{audio("title")}</a>
        <a href="#language"><Languages size={18} aria-hidden="true" />{t("language")}</a>
      </nav>
      <div className="football-settings-content" data-guide="settings-content">
        {profile}
        <section id="audio" className="football-settings-section"><AudioSettings /></section>
        <section id="language" className="football-settings-section"><LanguageSettings /></section>
      </div>
    </div>
  </section>;
}
