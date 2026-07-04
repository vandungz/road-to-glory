import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Football Life — Road to Glory",
  description: "Trò chơi mô phỏng sự nghiệp bóng đá dựa trên vận may.",
};

/**
 * Layout cho tất cả game routes: (game)/page.tsx, (game)/[gameId]/page.tsx
 * Áp dụng cream background và retro styling xuyên suốt.
 */
export default function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--cream)",
      }}
    >
      {children}
    </div>
  );
}
