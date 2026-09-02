"use client";

import { useMemo, useState, type ReactNode } from "react";
import { AuthMotionContext } from "./AuthMotionContext";
import { HeroPanel } from "./HeroPanel";

export function AuthLayoutClient({ children }: { children: ReactNode }) {
  const [replayToken, setReplayToken] = useState(0);
  const motion = useMemo(() => ({ replayToken, replay: () => setReplayToken((token) => token + 1) }), [replayToken]);
  return (
    <AuthMotionContext.Provider value={motion}>
      <div className="rtg-auth-shell">
        <div className="rtg-auth-stage">
          <HeroPanel />
          <section className="rtg-auth-form-column" aria-label="Khu vực xác thực">
            <div className="rtg-auth-form-column__body">{children}</div>
            <footer className="rtg-auth-form-column__footer">
              <span>© Football Life — mùa 2025/26</span>
              <button type="button" onClick={motion.replay}>Chạy lại chuyển động</button>
            </footer>
          </section>
        </div>
      </div>
    </AuthMotionContext.Provider>
  );
}
