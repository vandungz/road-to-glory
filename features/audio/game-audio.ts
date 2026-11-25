"use client";

import assets from "./audio-assets.json";
import { getAudioPreferences } from "./audio-preferences";

export type SoundId = Exclude<keyof typeof assets, "music" | "cipher">;
export type MusicScene = "draft" | "gameplay";
let context: AudioContext | undefined;
let gain: GainNode | undefined;
const musicPlayers = new Map<MusicScene, HTMLAudioElement>();
let defaultScene: MusicScene = "gameplay";
let sceneOverride: MusicScene | null = null;
let active = false;
let unlocked = false;
const musicFailed = new Set<MusicScene>();
const buffers = new Map<SoundId, Promise<AudioBuffer | null>>();
const failedUntil = new Map<SoundId, number>();
const lastPlayed = new Map<SoundId, number>();
const pending = new Set<SoundId>();
const voices = new Set<AudioBufferSourceNode>();

function canPlayEffects() {
  const preferences = getAudioPreferences();
  return active && unlocked && !document.hidden && !preferences.muted && preferences.effects && preferences.effectsVolume > 0;
}

function stopEffects() {
  for (const voice of voices) {
    try { voice.stop(); } catch { /* A completed node may already have stopped. */ }
    voice.disconnect();
  }
  voices.clear();
}

export function refreshGameAudio() {
  if (typeof document === "undefined") return;
  const preferences = getAudioPreferences();
  if (gain && context) gain.gain.setTargetAtTime(preferences.effectsVolume * 0.6, context.currentTime, 0.02);
  if (!canPlayEffects()) stopEffects();
  const shouldPlayMusic = active && unlocked && !document.hidden && !preferences.muted && preferences.music && preferences.musicVolume > 0;
  const scene = sceneOverride ?? defaultScene;
  for (const [key, player] of musicPlayers) if (!shouldPlayMusic || key !== scene) player.pause();
  if (!shouldPlayMusic || musicFailed.has(scene)) return;
  let music = musicPlayers.get(scene);
  if (!music) {
    music = new Audio();
    music.preload = "none";
    music.loop = true;
    music.src = scene === "draft" ? assets.music : assets.cipher;
    const player = music;
    music.addEventListener("error", () => { musicFailed.add(scene); player.pause(); });
    musicPlayers.set(scene, music);
  }
  music.volume = preferences.musicVolume;
  if (music.paused) void music.play().catch(() => { /* Another user gesture can retry autoplay permission. */ });
}

export function setGameAudioActive(value: boolean, scene?: MusicScene) {
  active = value;
  if (scene) defaultScene = scene;
  refreshGameAudio();
  if (!value || document.hidden) void context?.suspend().catch(() => {});
}

export function setGameMusicScene(scene: MusicScene | null) {
  sceneOverride = scene;
  refreshGameAudio();
}

// Called synchronously by a real user interaction, never by a render or timer.
export function unlockGameAudio() {
  if (!active || document.hidden) return;
  unlocked = true;
  const preferences = getAudioPreferences();
  if (!preferences.muted && preferences.effects) {
    try {
      if (!context) {
        context = new AudioContext();
        gain = context.createGain();
        gain.connect(context.destination);
      }
      if (context.state === "suspended") void context.resume().catch(() => {});
    } catch { /* Audio support is optional; gameplay continues. */ }
  }
  refreshGameAudio();
}

function loadBuffer(id: SoundId): Promise<AudioBuffer | null> {
  if ((failedUntil.get(id) ?? 0) > Date.now()) return Promise.resolve(null);
  const cached = buffers.get(id);
  if (cached) return cached;
  const audioContext = context!;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  const request = fetch(assets[id], { signal: controller.signal, cache: "force-cache", credentials: "omit" })
    .then(async (response) => {
      if (!response.ok) throw new Error("Audio unavailable");
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength > 1_000_000) throw new Error("Audio exceeds buffer budget");
      return audioContext.decodeAudioData(bytes);
    })
    .then((buffer) => {
      if (buffer.duration > 5) throw new Error("Audio exceeds duration budget");
      return buffer;
    })
    .catch(() => {
      failedUntil.set(id, Date.now() + 30_000);
      buffers.delete(id);
      return null;
    })
    .finally(() => clearTimeout(timeout));
  buffers.set(id, request);
  return request;
}

export function playGameSound(id: SoundId) {
  if (typeof document === "undefined" || !canPlayEffects() || !context || !gain || context.state !== "running") return;
  const now = performance.now();
  if (pending.has(id) || voices.size >= 6 || now - (lastPlayed.get(id) ?? -Infinity) < (id === "tick" ? 65 : 120)) return;
  lastPlayed.set(id, now);
  pending.add(id);
  const requestedAt = now;
  void loadBuffer(id).then((buffer) => {
    if (!buffer || !canPlayEffects() || context?.state !== "running" || !gain || voices.size >= 6) return;
    // A slow first download must not play an obsolete click/result seconds later.
    if (performance.now() - requestedAt > 350) return;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(gain);
    source.onended = () => { voices.delete(source); source.disconnect(); };
    voices.add(source);
    try { source.start(); }
    catch { voices.delete(source); source.disconnect(); }
  }).catch(() => { /* Device interruption must never reject a game callback. */ }).finally(() => pending.delete(id));
}
