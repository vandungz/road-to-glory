"use client";

import { useEffect } from "react";
import { setGameMusicScene, type MusicScene } from "./game-audio";

export function useGameMusic(scene: MusicScene) {
  useEffect(() => { setGameMusicScene(scene); }, [scene]);
  useEffect(() => () => setGameMusicScene(null), []);
}
