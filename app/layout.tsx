import type { Metadata } from "next";
import { Oswald, Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import "./styles/features/career-workspace.css";
import "./styles/foundation/filters.css";
import "./styles/features/contract-negotiation.css";
import "./styles/features/player-portraits.css";
import { AppProviders } from "./providers";
import { DesktopNotice } from "@/components/shared/DesktopNotice";

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

export const metadata: Metadata = {
  title: "Football Life — Road to Glory",
  description:
    "Trò chơi mô phỏng sự nghiệp bóng đá dựa trên vận may. Xây dựng squad, quay bánh xe, viết nên huyền thoại của bạn.",
  keywords: ["football", "career", "simulation", "squad", "road to glory"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning className={`${oswald.variable} ${bodyFont.variable}`}>
      <body className="antialiased">
        <DesktopNotice />
        <div className="football-desktop-content">
          <AppProviders>{children}</AppProviders>
        </div>
      </body>
    </html>
  );
}
