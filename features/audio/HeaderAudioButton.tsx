"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useTranslations } from "next-intl";
import { IconButton } from "@/components/ui/IconButton";
import { updateAudioPreferences, useAudioPreferences } from "./audio-preferences";
import { unlockGameAudio } from "./game-audio";
import { useEffect, useId, useRef, useState } from "react";
import { AudioVolumeControl } from "./AudioVolumeControl";

export function HeaderAudioButton() {
  const t = useTranslations("audio");
  const preferences = useAudioPreferences();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLInputElement>('input[type="range"]')?.focus();
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { event.stopPropagation(); setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  return <div className="football-audio-control" data-audio-controls ref={root} onBlur={(event) => {
    if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <IconButton ref={trigger} aria-label={t("title")} title={t("title")} aria-expanded={open} aria-haspopup="dialog" aria-controls={open ? id : undefined} data-audio-silent onClick={() => setOpen(!open)}>
      {preferences.muted ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
    </IconButton>
    {open && <div id={id} role="dialog" aria-label={t("title")} className="football-audio-popover">
      <label className="football-audio-toggle"><span>{t("mute")}</span><input role="switch" type="checkbox" checked={preferences.muted} onChange={(event) => {
        updateAudioPreferences({ muted: event.target.checked }); unlockGameAudio();
      }} /></label>
      <AudioVolumeControl label={t("effectsVolume")} value={preferences.effects ? preferences.effectsVolume : 0} onChange={(value) => {
        updateAudioPreferences({ effectsVolume: value, effects: value > 0, muted: false }); unlockGameAudio();
      }} />
      <AudioVolumeControl label={t("musicVolume")} value={preferences.music ? preferences.musicVolume : 0} onChange={(value) => {
        updateAudioPreferences({ musicVolume: value, music: value > 0, muted: false }); unlockGameAudio();
      }} />
    </div>}
  </div>;
}
