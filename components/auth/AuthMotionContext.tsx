"use client";

import { createContext, useContext } from "react";

interface AuthMotionContextValue {
  replayToken: number;
  replay: () => void;
}

export const AuthMotionContext = createContext<AuthMotionContextValue | null>(null);

export function useAuthMotion() {
  const context = useContext(AuthMotionContext);
  if (!context) throw new Error("useAuthMotion must be used inside AuthMotionContext.Provider");
  return context;
}
