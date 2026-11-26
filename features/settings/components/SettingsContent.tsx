import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { LanguageSettings } from "./LanguageSettings";
import { AudioSettings } from "@/features/audio/AudioSettings";
import { InformationSettings } from "./InformationSettings";
import { SettingsTabs } from "./SettingsTabs";

export async function SettingsContent({ profile, security }: { profile: ReactNode; security: ReactNode }) {
  const t = await getTranslations("settings");
  return <section className="football-settings-page">
    <h1>{t("title")}</h1>
    <SettingsTabs panels={{ profile, security, information: <InformationSettings />, audio: <section className="football-settings-section"><AudioSettings /></section>, language: <section className="football-settings-section"><LanguageSettings /></section> }} />
  </section>;
}
