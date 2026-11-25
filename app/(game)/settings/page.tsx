import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { AppShell } from "@/components/shared/AppShell";
import { ProfileSettings } from "@/features/settings/components/ProfileSettings";
import { SettingsContent } from "@/features/settings/components/SettingsContent";
import { settingsReturnPath } from "@/features/settings/settings-return-path";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings");
  return { title: t("title") + " | Football Life", description: t("description") };
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const backHref = settingsReturnPath((await searchParams).returnTo);
  return (
    <AppShell guide="settings" className="football-account-shell football-settings-shell" backHref={backHref} backLabel={backHref === "/" ? "home" : "back"}>
      <SettingsContent profile={<ProfileSettings />} />
    </AppShell>
  );
}
