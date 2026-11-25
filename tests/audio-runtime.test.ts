import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import assets from "../features/audio/audio-assets.json";
import { AUDIO_STORAGE_KEY, getAudioPreferences, updateAudioPreferences } from "../features/audio/audio-preferences";
import { playGameSound, refreshGameAudio, setGameAudioActive, setGameMusicScene, unlockGameAudio } from "../features/audio/game-audio";

const saved = new Map<string, string>([[AUDIO_STORAGE_KEY, '{"music":false,"effectsVolume":99,"musicVolume":-1}']]);
const requests: string[] = [];
let clock = 1000;
let contexts = 0;
let stops = 0;
let fetchFails = false;
let storageBlocked = false;
let deferred: ((response: Response) => void) | undefined;
let deferFetch = false;

class FakeSource {
  buffer: unknown;
  onended?: () => void;
  connect() {}
  disconnect() {}
  start() { sources.push(this); }
  stop() { stops++; this.onended?.(); }
}
const sources: FakeSource[] = [];
class FakeContext {
  state = "running";
  currentTime = 0;
  destination = {};
  constructor() { contexts++; }
  createGain() { return { connect() {}, gain: { setTargetAtTime() {} } }; }
  createBufferSource() { return new FakeSource(); }
  decodeAudioData() { return Promise.resolve({ duration: 0.1 }); }
  suspend() { this.state = "suspended"; return Promise.resolve(); }
  resume() { this.state = "running"; return Promise.resolve(); }
}
class FakeMusic {
  static instances: FakeMusic[] = [];
  src = "";
  preload = "";
  loop = false;
  volume = 0;
  paused = true;
  plays = 0;
  constructor() { FakeMusic.instances.push(this); }
  addEventListener() {}
  pause() { this.paused = true; }
  play() { this.paused = false; this.plays++; return Promise.resolve(); }
}
const documentState = { hidden: false };
Object.defineProperties(globalThis, {
  window: { value: { localStorage: {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => { if (storageBlocked) throw new Error("Blocked"); saved.set(key, value); },
  } }, configurable: true },
  document: { value: documentState, configurable: true },
  AudioContext: { value: FakeContext, configurable: true },
  Audio: { value: FakeMusic, configurable: true },
  performance: { value: { now: () => clock }, configurable: true },
  fetch: { value: (url: string, init: RequestInit) => {
    requests.push(url);
    assert.match(url, /^\/media\/audio\/[a-z]+\.[a-f0-9]{12}\.mp3$/);
    assert.equal(init.cache, "force-cache");
    assert.equal(init.credentials, "omit");
    if (deferFetch) return new Promise<Response>((resolve) => { deferred = resolve; });
    return fetchFails ? Promise.reject(new Error("Offline")) : Promise.resolve(response());
  }, configurable: true },
});
const response = () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }) as Response;
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

async function main() {
  let effectsBytes = 0;
  for (const [name, url] of Object.entries(assets)) {
    const bytes = readFileSync(`public${url}`);
    assert.ok(url.includes(createHash("sha256").update(bytes).digest("hex").slice(0, 12)), "Asset filename must match content");
    if (name !== "music" && name !== "cipher") effectsBytes += bytes.length;
    else assert.ok(bytes.length <= 3_000_000, "Music transfer budget per track");
  }
  assert.ok(effectsBytes < 500_000, "Combined effects transfer budget");
  assert.equal(getAudioPreferences().effectsVolume, 1);
  assert.equal(getAudioPreferences().musicVolume, 0);
  playGameSound("click");
  setGameAudioActive(true);
  playGameSound("click");
  assert.equal(requests.length, 0, "No network before gesture");
  updateAudioPreferences({ muted: true });
  unlockGameAudio();
  assert.equal(contexts, 0, "Mute does not create an audio context");
  updateAudioPreferences({ muted: false });
  unlockGameAudio();
  for (let i = 0; i < 20; i++) playGameSound("click");
  await flush();
  assert.equal(requests.length, 1, "Concurrent first plays share a single download");
  clock += 150;
  playGameSound("click");
  await flush();
  assert.equal(requests.length, 1, "Decoded buffer is reused without a second fetch");
  for (const id of ["tick", "confirm", "transition", "success"] as const) {
    playGameSound(id);
    await flush();
  }
  assert.equal(sources.length, 6);
  playGameSound("award");
  await flush();
  assert.equal(sources.length, 6, "Concurrent voice budget is enforced");
  updateAudioPreferences({ muted: true });
  refreshGameAudio();
  assert.equal(stops, 6, "Mute immediately stops active effects");
  updateAudioPreferences({ muted: false });
  clock += 150;
  const beforeTick = sources.length;
  for (let i = 0; i < 100; i++) playGameSound("tick");
  await flush();
  assert.equal(sources.length, beforeTick + 1, "Ticks are throttled");
  fetchFails = true;
  playGameSound("award");
  await flush();
  const failedCount = requests.length;
  clock += 200;
  playGameSound("award");
  await flush();
  assert.equal(requests.length, failedCount, "Failures do not create a retry storm");
  fetchFails = false;
  deferFetch = true;
  const beforeSlow = sources.length;
  playGameSound("negative");
  clock += 400;
  deferred!(response());
  await flush();
  assert.equal(sources.length, beforeSlow, "Stale delayed audio is dropped");
  deferFetch = false;
  assert.equal(FakeMusic.instances.length, 0, "Music is lazy and off by default");
  updateAudioPreferences({ music: true, musicVolume: 0.18 });
  refreshGameAudio();
  for (let i = 0; i < 20; i++) refreshGameAudio();
  assert.equal(FakeMusic.instances.length, 1);
  assert.equal(FakeMusic.instances[0].plays, 1, "Refresh does not restart or duplicate music");
  assert.equal(FakeMusic.instances[0].src, assets.cipher, "Gameplay uses Cipher");
  setGameMusicScene("draft");
  assert.equal(FakeMusic.instances.length, 2);
  assert.equal(FakeMusic.instances[0].paused, true);
  assert.equal(FakeMusic.instances[1].src, assets.music, "Draft uses Floating Cities");
  setGameMusicScene("gameplay");
  assert.equal(FakeMusic.instances.length, 2, "Tracks reuse their players across scene switches");
  assert.equal(FakeMusic.instances[1].paused, true);
  assert.equal(FakeMusic.instances[0].paused, false);
  documentState.hidden = true;
  setGameAudioActive(true);
  assert.equal(FakeMusic.instances[0].paused, true);
  const hiddenRequests = requests.length;
  playGameSound("spin");
  assert.equal(requests.length, hiddenRequests);
  documentState.hidden = false;
  setGameAudioActive(false);
  refreshGameAudio();
  assert.equal(FakeMusic.instances[0].paused, true, "Leaving game stops music");
  storageBlocked = true;
  assert.equal(updateAudioPreferences({ muted: true }), false);
  assert.equal(getAudioPreferences().muted, true, "Blocked storage retains an in-memory preference");
  assert.equal(contexts, 1);
  console.log("Audio runtime: cache, voice budget, throttle, failure, stale audio, visibility, music and preferences passed.");
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
