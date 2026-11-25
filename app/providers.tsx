"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useMotionPreference } from "@/features/settings/game-motion";
import { GuideProvider } from "@/features/onboarding/GuideProvider";
import { GameAudioRuntime } from "@/features/audio/GameAudioRuntime";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const reduce = useMotionPreference();
  useEffect(() => {
    document.documentElement.toggleAttribute("data-game-reduced-motion", reduce);
  }, [reduce]);

  return <QueryClientProvider client={queryClient}><GuideProvider><GameAudioRuntime />{children}</GuideProvider></QueryClientProvider>;
}
