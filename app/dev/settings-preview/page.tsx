import { notFound } from "next/navigation";
import { AppShell } from "@/components/shared/AppShell";
import { SettingsContent } from "@/features/settings/components/SettingsContent";
import { SecuritySettings } from "@/features/settings/components/SecuritySettings";
import { ProfileSettingsContent } from "@/features/settings/components/ProfileSettings";

export default async function SettingsPreview({ searchParams }: { searchParams: Promise<{ connected?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const connected = (await searchParams).connected === "1";
  return <AppShell guide="settings" backHref="/" backLabel="home" className="football-account-shell football-settings-shell">
    <SettingsContent security={<SecuritySettings signedIn hasPassword preview />} profile={<ProfileSettingsContent preview account={{ email: "player@example.invalid", name: "Minh An", avatar: "default", googleAvatar: null, googleEmail: connected ? "google@example.invalid" : null }} />} />
  </AppShell>;
}
