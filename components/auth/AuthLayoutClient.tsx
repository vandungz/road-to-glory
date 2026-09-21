"use client";

import { useMemo, useState, type ReactNode } from "react";
import { AuthMotionContext } from "./AuthMotionContext";
import { HeroPanel } from "./HeroPanel";

export function AuthLayoutClient({ children }: { children: ReactNode }) {
  const [replayToken, setReplayToken] = useState(0);
  const motion = useMemo(() => ({ replayToken, replay: () => setReplayToken((token) => token + 1) }), [replayToken]);
  return (
    <AuthMotionContext.Provider value={motion}>
      <div className="football-auth-shell">
        <div className="football-auth-stage">
          <HeroPanel />
          <section className="football-auth-form-column" aria-label="Khu vực xác thực">
            <div className="football-auth-form-column__body">{children}</div>
            <footer className="football-auth-form-column__footer">
              <span>© Football Life — mùa 2025/26</span>
              <button type="button" onClick={motion.replay}>Chạy lại chuyển động</button>
            </footer>
          </section>
        </div>
      </div>
    </AuthMotionContext.Provider>
  );
}
