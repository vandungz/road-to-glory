"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { appRouteAccess } from "@/lib/app-routes";
import { useAudioPreferences } from "./audio-preferences";
import { playGameSound, refreshGameAudio, setGameAudioActive, unlockGameAudio } from "./game-audio";

export function GameAudioRuntime() {
  const pathname = usePathname();
  const preferences = useAudioPreferences();
  const scene = pathname === "/quick" || pathname === "/quick/play" || pathname.includes("/draft/") ? "draft" : "gameplay";
  const enabled = pathname === "/settings" || pathname === "/quick" || pathname === "/quick/play" || appRouteAccess(pathname) === "protected"
    || (process.env.NODE_ENV !== "production" && pathname.startsWith("/dev/"));
  useEffect(() => {
    setGameAudioActive(enabled, scene);
    if (!enabled) return;
    const interaction = (event: Event) => {
      if (!event.isTrusted || (event instanceof KeyboardEvent && (event.repeat || !["Enter", " "].includes(event.key)))) return;
      unlockGameAudio();
      const target = event.target instanceof Element ? event.target.closest("button:not(:disabled), a[href]") : null;
      if (target && !target.closest("[data-audio-silent]")) playGameSound(target.tagName === "A" ? "transition" : "click");
    };
    const visibility = () => {
      setGameAudioActive(enabled, scene);
      if (!document.hidden) refreshGameAudio();
    };
    document.addEventListener("pointerdown", interaction);
    document.addEventListener("keydown", interaction);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      document.removeEventListener("pointerdown", interaction);
      document.removeEventListener("keydown", interaction);
      document.removeEventListener("visibilitychange", visibility);
      setGameAudioActive(false);
    };
  }, [enabled, scene]);
  useEffect(() => { refreshGameAudio(); }, [preferences]);
  return null;
}
