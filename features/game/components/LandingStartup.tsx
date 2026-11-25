"use client";

import { useEffect, useState } from "react";
import { BrandedSplash } from "@/components/shared/BrandedSplash";

/** A short branded entrance, with a bounded wait for the hero image. */
export function LandingStartup() {
  const [waiting, setWaiting] = useState(true);
  useEffect(() => {
    if (!waiting) document.querySelector<HTMLElement>(".football-guest-landing")?.setAttribute("data-entry-state", "ready");
  }, [waiting]);
  useEffect(() => {
    const image = document.querySelector<HTMLImageElement>(".football-guest-landing__hero img");
    const main = document.querySelector<HTMLElement>(".football-guest-landing__main");
    let minimumElapsed = false;
    let ready = !image || image.complete;
    let finished = false;
    main?.setAttribute("inert", "");
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(minimum);
      clearTimeout(deadline);
      setWaiting(false);
      main?.removeAttribute("inert");
    };
    const onReady = () => { ready = true; if (minimumElapsed) finish(); };
    const minimum = setTimeout(() => {
      minimumElapsed = true;
      if (ready) finish();
    }, 800);
    // A failed or stalled asset must never trap the visitor behind a splash.
    const deadline = setTimeout(finish, 3000);
    image?.addEventListener("load", onReady);
    image?.addEventListener("error", onReady);
    window.addEventListener("keydown", finish, { once: true });
    window.addEventListener("pointerdown", finish, { once: true });
    return () => {
      clearTimeout(minimum);
      clearTimeout(deadline);
      main?.removeAttribute("inert");
      image?.removeEventListener("load", onReady);
      image?.removeEventListener("error", onReady);
      window.removeEventListener("keydown", finish);
      window.removeEventListener("pointerdown", finish);
    };
  }, []);
  return waiting ? <>
    <noscript><style>{".football-landing-startup { display: none; }"}</style></noscript>
    <div className="football-landing-startup"><BrandedSplash /></div>
  </> : null;
}
