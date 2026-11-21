import { getTranslations } from "next-intl/server";
import { LanguageSettings } from "@/features/settings/components/LanguageSettings";
import type { Metadata } from "next";
import { AppShell } from "@/components/shared/AppShell";
import { MotionSettings } from "@/features/settings/components/MotionSettings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings");
  return { title: t("title") + " | Football Life", description: t("description") };
}

export default async function SettingsPage() {
  const t = await getTranslations("settings");
  return (
    <AppShell guide="settings" className="football-account-shell" backHref="/" backLabel="home">
      <section className="football-account">
        <h1>{t("title")}</h1>
        <div className="football-account-sheet football-settings-sheet">
          <LanguageSettings />
          <MotionSettings />
        </div>
      </section>
    </AppShell>
  );
}
