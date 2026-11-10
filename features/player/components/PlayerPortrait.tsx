"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { isPortraitId, type PortraitReaction } from "../lib/player-portraits";

export function PlayerPortrait({ portraitId, animate = true, reaction, onReactionEnd, canToggle = false, loop = canToggle }: {
  portraitId?: string | null;
  animate?: boolean;
  reaction?: PortraitReaction | null;
  onReactionEnd?: () => void;
  canToggle?: boolean;
  loop?: boolean;
}) {
  const element = useRef<HTMLSpanElement>(null);
  const idle = useRef<HTMLVideoElement>(null);
  const overlay = useRef<HTMLVideoElement>(null);
  const [canPlay, setCanPlay] = useState(false);
  const [playingSource, setPlayingSource] = useState<string>();
  const [liveKey, setLiveKey] = useState<string>();
  const [paused, setPaused] = useState(false);
  const valid = isPortraitId(portraitId);
  const directory = `/media/player-portraits/${portraitId}`;
  const source = `${directory}/idle.webm`;
  const reactionSource = reaction ? `${directory}/${reaction.pose}.webm` : null;
  const reactionKey = reaction?.key;
  const live = Boolean(reactionKey && liveKey === reactionKey && canPlay);

  useEffect(() => {
    if (!animate || !valid || !element.current) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const sync = () => setCanPlay(visible && !document.hidden && !motion.matches);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    observer.observe(element.current);
    motion.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [animate, valid]);

  useEffect(() => {
    if (animate && canPlay && !paused) void idle.current?.play().catch(() => {});
    else idle.current?.pause();
  }, [animate, canPlay, paused, source]);

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
    {animate && ((loop && !canToggle) || (canPlay && !paused)) && <video ref={idle} src={source}
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
    {animate && canPlay && canToggle && <button type="button" className="football-player-portrait__toggle"
      aria-label={paused ? "Phát chuyển động chân dung" : "Dừng chuyển động chân dung"}
      onClick={() => { setPlayingSource(undefined); setPaused(!paused); }}>
      {paused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
    </button>}
  </span>;
}
