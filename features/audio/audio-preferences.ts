"use client";

import { useSyncExternalStore } from "react";

export interface AudioPreferences {
  muted: boolean;
  effects: boolean;
  music: boolean;
  effectsVolume: number;
  musicVolume: number;
}

export const AUDIO_STORAGE_KEY = "football-life:audio:v1";
const defaults: AudioPreferences = { muted: false, effects: true, music: false, effectsVolume: 0.4, musicVolume: 0.18 };
let current: AudioPreferences | undefined;
const listeners = new Set<() => void>();

function read(): AudioPreferences {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(AUDIO_STORAGE_KEY) ?? "null");
    const result = { ...defaults };
    for (const key of ["muted", "effects", "music"] as const) if (typeof parsed?.[key] === "boolean") result[key] = parsed[key];
    for (const key of ["effectsVolume", "musicVolume"] as const) {
      if (typeof parsed?.[key] === "number" && Number.isFinite(parsed[key])) result[key] = Math.max(0, Math.min(1, parsed[key]));
    }
    return result;
  } catch { return { ...defaults }; }
}

export function getAudioPreferences(): AudioPreferences {
  if (typeof window === "undefined") return defaults;
  return current ??= read();
}

export function updateAudioPreferences(patch: Partial<AudioPreferences>): boolean {
  current = { ...getAudioPreferences(), ...patch };
  let saved = true;
  try { window.localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(current)); }
  catch { saved = false; }
  listeners.forEach((listener) => listener());
  return saved;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== AUDIO_STORAGE_KEY && event.key !== null) return;
    current = read();
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(listener); window.removeEventListener("storage", onStorage); };
}

export function useAudioPreferences() {
  return useSyncExternalStore(subscribe, getAudioPreferences, () => defaults);
}
