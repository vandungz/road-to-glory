"use client";

import { useSyncExternalStore } from "react";

const storageKey = "football-life:reduce-motion";
const changeEvent = "football-life:motion-change";
const systemQuery = "(prefers-reduced-motion: reduce)";
let reducedInMemory: boolean | undefined;

function subscribe(listener: () => void) {
  const system = window.matchMedia(systemQuery);
  system.addEventListener("change", listener);
  window.addEventListener("storage", listener);
  window.addEventListener(changeEvent, listener);
  return () => {
    system.removeEventListener("change", listener);
    window.removeEventListener("storage", listener);
    window.removeEventListener(changeEvent, listener);
  };
}

function getPreference() {
  if (reducedInMemory !== undefined) return reducedInMemory;
  try {
    return window.localStorage.getItem(storageKey) === "true";
  } catch {
    return false;
  }
}

const serverPreference = () => false;

export function useMotionPreference() {
  return useSyncExternalStore(subscribe, getPreference, serverPreference);
}

export function useGameReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => getPreference() || window.matchMedia(systemQuery).matches,
    serverPreference,
  );
}

export function setMotionPreference(reduce: boolean) {
  let saved = true;
  try {
    window.localStorage.setItem(storageKey, String(reduce));
    reducedInMemory = undefined;
  } catch {
    reducedInMemory = reduce;
    saved = false;
  }
  window.dispatchEvent(new Event(changeEvent));
  return saved;
}
