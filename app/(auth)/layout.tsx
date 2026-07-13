export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="space-y-1 text-center">
          <span className="text-xs font-medium uppercase tracking-widest text-foreground-muted">
            Road to Glory
          </span>
          <h1 className="font-display text-4xl font-black text-foreground">
            FOOTBALL LIFE
          </h1>
        </div>

        {children}
      </div>

      <p className="mt-8 text-xs text-foreground-disabled">
        © Football Life — Season 2025/26
      </p>
    </div>
  );
}
