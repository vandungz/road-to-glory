"use client";

import { useEffect } from "react";
import { playGameSound, type SoundId } from "./game-audio";

export function useResultSound(sound: SoundId, enabled = true) {
  useEffect(() => { if (enabled) playGameSound(sound); }, [sound, enabled]);
}
