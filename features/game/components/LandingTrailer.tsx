"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useGameReducedMotion } from "@/features/settings/game-motion";
import { trackGameEntry } from "../lib/entry-analytics";

export function LandingQuickLink({ label, className = "football-button football-button--primary football-button--lg" }: {
  label?: string;
  className?: string;
}) {
  const ui = useTranslations("ui");
  return (
    <Link className={className} href="/quick" prefetch={false}
      onNavigate={() => trackGameEntry("quick_click")}>
      {label ?? ui("playQuickMode")}
    </Link>
  );
}

export function LandingTrailer({ copy }: {
  copy: { title: string; description: string; unavailable: string };
}) {
  const viewed = useRef(false);
  const played = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reducedMotion = useGameReducedMotion();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (reducedMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.pause();
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting || entry.intersectionRatio < 0.25) video.pause();
      else if (video.paused) void video.play().catch(() => {});
    }, { threshold: 0.25 });
    observer.observe(video);
    return () => observer.disconnect();
  }, [reducedMotion]);

  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    trackGameEntry("landing_view");
  }, []);

  return (
    <figure className="football-guest-landing__trailer" data-kind="product">
      <p id="gameplay-trailer-description" className="sr-only">{copy.description}</p>
      <video
        ref={videoRef}
        id="gameplay-trailer"
        muted
        loop
        playsInline
        preload="none"
        width={960}
        height={536}
        poster="/media/landing/career-gameplay-v2-cover.webp"
        aria-label={copy.title}
        aria-describedby="gameplay-trailer-description"
        src="/media/landing/career-gameplay-v2.mp4"
        onError={() => setFailed(true)}
        onPlaying={() => {
          if (played.current) return;
          played.current = true;
          trackGameEntry("trailer_play");
        }}
      />
      {failed && <figcaption className="football-guest-landing__caption" role="status">{copy.unavailable}</figcaption>}
    </figure>
  );
}
