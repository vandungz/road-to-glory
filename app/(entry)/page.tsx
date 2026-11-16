import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shared/AppShell";
import { GuestLanding } from "@/features/game/components/GuestLanding";
import { Homepage } from "@/features/game/components/Homepage";
import { getGameSessionsForUser } from "@/features/game/services/game-session.service";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing");
  const title = "Football Life — Road to Glory";
  const description = t("description");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const image = { url: "/media/landing/career-gameplay-v2-cover.webp", width: 960, height: 536, alt: t("previewAlt") };

  return {
    metadataBase: siteUrl ? new URL(siteUrl) : undefined,
    title,
    description,
    alternates: { canonical: "/" },
    openGraph: { type: "website", url: "/", title, description, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function LobbyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <GuestLanding />;

  const sessions = await getGameSessionsForUser(user.id);

  return (
    <AppShell className="football-homepage-shell" showAccountControls isAuthenticated>
      <Homepage sessions={sessions} isAuthenticated />
    </AppShell>
  );
}
