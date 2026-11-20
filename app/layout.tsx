import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { Oswald, Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import "./styles/features/career-workspace.css";
import "./styles/foundation/filters.css";
import "./styles/features/contract-negotiation.css";
import "./styles/features/player-portraits.css";
import "./styles/features/classic-interactions.css";
import "./styles/features/account.css";
import "./styles/features/guest-landing.css";
import "./styles/features/policy.css";
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
  const t = await getTranslations("common");
  return { title: "Football Life — Road to Glory", description: t("description") };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
