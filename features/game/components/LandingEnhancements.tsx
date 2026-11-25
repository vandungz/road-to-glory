"use client";

import { useEffect, useRef, type MouseEvent } from "react";
import { Globe } from "lucide-react";
import { useGameReducedMotion } from "@/features/settings/game-motion";
import { saveBrowserLocale } from "@/i18n/browser-locale";

/** Policy pages keep their cookie-based language switch on the current URL. */
export function LandingLanguageButton({ target, label }: { target: "vi" | "en"; label: string }) {
  return <button type="button" className="football-guest-landing__language" aria-label={label}
    onClick={() => { saveBrowserLocale(target); window.location.reload(); }}>
    <Globe size={18} aria-hidden="true" /><span lang={target}>{target.toUpperCase()}</span>
  </button>;
}

export function LandingLanguageLink({ target, label }: { target: "vi" | "en"; label: string }) {
  return (
    <a
      href={target === "en" ? "/en" : "/"}
      className="football-guest-landing__language"
      aria-label={label}
      onClick={(event) => {
        saveBrowserLocale(target);
        event.currentTarget.hash = window.location.hash;
      }}
    >
      <Globe size={18} aria-hidden="true" />
      <span lang={target}>{target.toUpperCase()}</span>
    </a>
  );
}

export function LandingSectionMotion() {
  const reducedMotion = useGameReducedMotion();

  useEffect(() => {
    if (reducedMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.querySelector<HTMLElement>(".football-guest-landing");
    if (!root) return;

    const observer = new IntersectionObserver((entries) => {
      for (const { target, isIntersecting } of entries) {
        if (!isIntersecting) continue;
        target.classList.add("football-guest-landing__entered");
        observer.unobserve(target);
      }
    });
    const start = () => {
      if (root.dataset.entryState !== "ready") return;
      startup.disconnect();
      root.querySelectorAll(".football-guest-landing__main > section:not(.football-guest-landing__hero), .football-guest-landing__footer")
        .forEach((section) => observer.observe(section));
    };
    const startup = new MutationObserver(start);
    startup.observe(root, { attributes: true, attributeFilter: ["data-entry-state"] });
    start();
    return () => { startup.disconnect(); observer.disconnect(); };
  }, [reducedMotion]);

  return null;
}

export function LandingFaqItem({ question, answer }: { question: string; answer: string }) {
  const panel = useRef<HTMLDivElement>(null);
  const revision = useRef(0);
  const reducedMotion = useGameReducedMotion();

  async function toggle(event: MouseEvent<HTMLElement>) {
    const details = event.currentTarget.closest("details");
    const content = panel.current;
    if (!details || !content) return;

    event.preventDefault();
    const current = ++revision.current;
    const opening = details.dataset.expanded
      ? details.dataset.expanded !== "true"
      : !details.open;
    if (reducedMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      delete details.dataset.expanded;
      details.open = opening;
      return;
    }

    if (opening && !details.open) {
      details.dataset.expanded = "false";
      details.open = true;
      // Resolve the collapsed grid while the native disclosure is visible.
      content.getBoundingClientRect();
    }
    details.dataset.expanded = String(opening);
    content.getBoundingClientRect();
    if (opening) return;

    await Promise.allSettled(content.getAnimations().map((animation) => animation.finished));
    if (revision.current === current) {
      details.open = false;
      delete details.dataset.expanded;
    }
  }

  return (
    <details>
      <summary onClick={toggle}>{question}</summary>
      <div ref={panel} className="football-guest-landing__answer">
        <div><p>{answer}</p></div>
      </div>
    </details>
  );
}
