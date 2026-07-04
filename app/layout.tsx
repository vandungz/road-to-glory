import type { Metadata } from "next";
import { Oswald, Lora, Special_Elite } from "next/font/google";
import "./globals.css";

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-oswald",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-lora",
  display: "swap",
});

const specialElite = Special_Elite({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-special-elite",
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
    <html lang="vi" suppressHydrationWarning className={`${oswald.variable} ${lora.variable} ${specialElite.variable}`}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
