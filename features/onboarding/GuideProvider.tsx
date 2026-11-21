"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { Driver } from "driver.js";
import { useGameReducedMotion } from "@/features/settings/game-motion";
import { guides, isAutomaticGuide, type GuideId } from "./guides";
import { browserGuideStorage, hasSeenGuide, markGuideSeen } from "./guide-storage";

type PageContext = { id: GuideId; paused: boolean; owner: symbol };
const GuideContext = createContext<{
  page: PageContext | null;
  register: (page: PageContext) => () => void;
  stop: () => void;
} | null>(null);

export function usePageGuide() { return useContext(GuideContext); }

function visibleTarget(target: string): HTMLElement | undefined {
  return Array.from(document.querySelectorAll<HTMLElement>(`[data-guide="${target}"]`))
    .find((element) => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden");
}

export function GuideProvider({ children }: { children: React.ReactNode }) {
  const [page, setPage] = useState<PageContext | null>(null);
  const instance = useRef<Driver | null>(null);
  const generation = useRef(0);
  const opening = useRef(false);
  const t = useTranslations("onboarding");
  const locale = useLocale();
  const pathname = usePathname();
  const reduceMotion = useGameReducedMotion();

  const register = useCallback((next: PageContext) => {
    setPage(next);
    return () => setPage((current) => current?.owner === next.owner ? null : current);
  }, []);

  const stop = useCallback(() => {
    generation.current++;
    opening.current = false;
    instance.current?.destroy();
    instance.current = null;
  }, []);

  const start = useCallback(async () => {
    if (!page || page.paused || opening.current || instance.current?.isActive()
      || !window.matchMedia("(min-width: 1024px)").matches || document.hidden
      || document.querySelector('[aria-modal="true"]')) return;
    if (!isAutomaticGuide(page.id) || hasSeenGuide(page.id, browserGuideStorage())) return;
    // Wait for every configured anchor, rather than marking a half-loaded page as explained.
    const targets = guides[page.id].targets.map((target) => ({ target, element: visibleTarget(target) }));
    if (targets.some(({ element }) => !element)) return;
    const request = ++generation.current;
    opening.current = true;
    try {
      const { driver } = await import("driver.js");
      if (request !== generation.current || document.querySelector('[aria-modal="true"]')) return;
      const tour = driver({
        animate: !reduceMotion, duration: 180, smoothScroll: false,
        allowClose: true, allowPageInteraction: true, allowScroll: true,
        focus: "none", allowKeyboardControl: true,
        overlayColor: getComputedStyle(document.documentElement).getPropertyValue("--football-ink").trim(),
        overlayOpacity: 0.22, stagePadding: 5, stageRadius: 12,
        popoverClass: "football-guide", showProgress: true,
        onElementMissing: () => { stop(); },
        nextBtnText: t("next"), prevBtnText: t("previous"), doneBtnText: t("done"),
        closeBtnLabel: t("skip"), progressText: "{{current}} / {{total}}",
        steps: targets.map(({ target, element }) => ({
          element, popover: { title: t(`steps.${target}.title`), description: t(`steps.${target}.description`), align: "start" },
        })),
        onPopoverRender: (popover) => {
          popover.closeButton.textContent = t("skip");
          popover.closeButton.setAttribute("aria-label", t("skip"));
          popover.wrapper.setAttribute("lang", locale);
          popover.wrapper.setAttribute("aria-modal", "false");
        },
        onInteraction: (_element, _step, { event }) => {
          // Reading a guide never consumes a gameplay action or keyboard shortcut.
          if (event.target instanceof Element && event.target.closest("button, a, input, select, textarea, [role=tab], [role=combobox]")) stop();
        },
        onDestroyed: () => { instance.current = null; },
      });
      instance.current = tour;
      tour.drive();
      markGuideSeen(page.id, browserGuideStorage());
    } catch { stop(); }
    finally { if (request === generation.current) opening.current = false; }
  }, [page, reduceMotion, t, locale, stop]);

  useEffect(() => {
    stop();
    if (!page || page.paused) return;
    let timer: ReturnType<typeof setTimeout>;
    const check = () => {
      if (document.hidden || document.querySelector('[aria-modal="true"]') || !window.matchMedia("(min-width: 1024px)").matches) {
        stop();
        return;
      }
      clearTimeout(timer);
      timer = setTimeout(() => { void start(); }, 650);
    };
    // Also cancel when a dialog opens without route navigation (trophies, filters, confirmations).
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-modal", "hidden"] });
    const interact = (event: Event) => {
      if (!(event.target instanceof Element) || event.target.closest(".driver-popover, .football-guide-help")) return;
      if (event.target.closest("button, a, input, select, textarea, [role=tab], [role=combobox]")) {
        clearTimeout(timer);
        stop();
      }
    };
    document.addEventListener("pointerdown", interact, true);
    document.addEventListener("keydown", interact, true);
    window.addEventListener("resize", check);
    document.addEventListener("visibilitychange", check);
    check();
    return () => {
      clearTimeout(timer); observer.disconnect();
      document.removeEventListener("pointerdown", interact, true);
      document.removeEventListener("keydown", interact, true);
      window.removeEventListener("resize", check);
      document.removeEventListener("visibilitychange", check);
      stop();
    };
  }, [page, pathname, start, stop]);

  const value = useMemo(() => ({ page, register, stop }), [page, register, stop]);
  return <GuideContext.Provider value={value}>{children}</GuideContext.Provider>;
}

/** Register the currently rendered feature, never a URL guess or a career-data mutation. */
export function PageGuide({ id, paused = false }: { id: GuideId; paused?: boolean }) {
  const context = usePageGuide();
  const register = context?.register;
  const owner = useRef(Symbol(id));
  useEffect(() => register?.({ id, paused, owner: owner.current }), [id, paused, register]);
  return null;
}
