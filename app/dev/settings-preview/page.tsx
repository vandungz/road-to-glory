import { notFound } from "next/navigation";
import { AppShell } from "@/components/shared/AppShell";
import { SettingsContent } from "@/features/settings/components/SettingsContent";
import { ProfileSettingsContent } from "@/features/settings/components/ProfileSettings";

export default function SettingsPreview() {
  if (process.env.NODE_ENV === "production") notFound();
  return <AppShell guide="settings" backHref="/" backLabel="home" className="football-account-shell football-settings-shell">
    <SettingsContent profile={<ProfileSettingsContent account={{ email: "player@example.invalid", name: "Minh An", inProgress: 2, completed: 1 }} />} />
  </AppShell>;
}
