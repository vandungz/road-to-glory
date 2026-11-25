import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { Oswald, Be_Vietnam_Pro } from "next/font/google";
import { connection } from "next/server";
import { headers } from "next/headers";
import "./globals.css";
import "./styles/features/career-workspace.css";
import "./styles/foundation/filters.css";
import "./styles/features/contract-negotiation.css";
import "./styles/features/player-portraits.css";
import "./styles/features/classic-interactions.css";
import "driver.js/dist/driver.css";
import "./styles/features/onboarding.css";
import "./styles/features/account.css";
import "./styles/features/guest-landing.css";
import "./styles/features/branded-splash.css";
import "./styles/features/loading-layouts.css";
import "./styles/features/policy.css";
import "./styles/features/header-controls.css";
import "./styles/features/settings.css";
import "./styles/features/trophy-cabinet.css";
import "./styles/features/not-found.css";
import { AppProviders } from "./providers";
import { DesktopNotice } from "@/components/shared/DesktopNotice";
import { GameEntryAnalytics } from "@/features/game/components/GameEntryAnalytics";

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-oswald",
  display: "swap",
});

const bodyFont = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-vietnam",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  if ((await headers()).get("x-football-not-found") === "1") {
    const t = await getTranslations("notFound");
    return { title: `${t("title")} | Road to Glory`, robots: { index: false } };
  }
  const t = await getTranslations("common");
  return { title: "Football Life — Road to Glory", description: t("description") };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Every document must be rendered with its request's CSP nonce, including error pages.
  await connection();
  const locale = await getLocale();
  return (
    <html lang={locale} suppressHydrationWarning className={`${oswald.variable} ${bodyFont.variable}`}>
      <body className="antialiased">
        <NextIntlClientProvider>
          {process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_GAME_ANALYTICS === "1" && <GameEntryAnalytics />}
          <div className="football-desktop-content">
            <AppProviders>{children}</AppProviders>
          </div>
          <DesktopNotice />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
