"use client";

import { useEffect, useRef, useState } from "react";
import { useGameReducedMotion } from "@/features/settings/game-motion";
import { isPortraitId, type PortraitReaction } from "../lib/player-portraits";

export function PlayerPortrait({ portraitId, animate = true, reaction, onReactionEnd, loop = false }: {
  portraitId?: string | null;
  animate?: boolean;
  reaction?: PortraitReaction | null;
  onReactionEnd?: () => void;
  loop?: boolean;
}) {
  const element = useRef<HTMLSpanElement>(null);
  const idle = useRef<HTMLVideoElement>(null);
  const overlay = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const reducedMotion = useGameReducedMotion();
  const [playingSource, setPlayingSource] = useState<string>();
  const [liveKey, setLiveKey] = useState<string>();
  const valid = isPortraitId(portraitId);
  const directory = `/media/player-portraits/${portraitId}`;
  const source = `${directory}/idle.webm`;
  const reactionSource = reaction ? `${directory}/${reaction.pose}.webm` : null;
  const reactionKey = reaction?.key;
  const canPlay = animate && valid && visible && !reducedMotion;
  const live = Boolean(reactionKey && liveKey === reactionKey && canPlay);

  useEffect(() => {
    if (!animate || !valid || !element.current) return;
    let intersects = false;
    const sync = () => setVisible(intersects && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      intersects = entry.isIntersecting;
      sync();
    });
    observer.observe(element.current);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [animate, valid]);

  useEffect(() => {
    if (animate && canPlay) void idle.current?.play().catch(() => {});
    else idle.current?.pause();
  }, [animate, canPlay, source]);

  useEffect(() => {
    const player = overlay.current;
    if (!player) return;
    if (!canPlay || !reactionSource || !reactionKey) { player.pause(); return; }
    if (player.dataset.reactionKey !== reactionKey || player.getAttribute("src") !== reactionSource) {
      player.dataset.reactionKey = reactionKey;
      player.src = reactionSource;
    }
    void player.play().catch(() => {});
  }, [canPlay, reactionSource, reactionKey]);

  if (!valid) return null;
  return <span className="football-player-portrait" ref={element} data-pose={live ? reaction?.pose : "idle"}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={`${directory}/default.webp`} alt="" width={320} height={400} loading="lazy" />
    {animate && !reducedMotion && (loop || canPlay) && <video ref={idle} src={source}
      muted playsInline loop={loop} preload="none" tabIndex={-1} aria-hidden="true"
      data-playing={canPlay && playingSource === source}
      onPlaying={() => setPlayingSource(source)}
      onError={() => setPlayingSource(undefined)} />}
    {onReactionEnd && <span className="football-player-portrait__reaction" data-playing={live}>
      <video ref={overlay} muted playsInline preload="none" tabIndex={-1} aria-hidden="true"
        onPlaying={(event) => setLiveKey(event.currentTarget.dataset.reactionKey)}
        onEnded={(event) => {
          if (reactionKey && event.currentTarget.dataset.reactionKey === reactionKey) onReactionEnd();
        }} />
    </span>}
  </span>;
}
