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
