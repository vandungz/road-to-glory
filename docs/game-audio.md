# Game audio: hosting, playback and verification

Decision updated: 2026-11-26. Audio is available across public/game pages, including
home, after opt-in and a trusted gesture. Authentication and missing routes stay silent.

## Storage decision

| Option | Evidence and tradeoff | Decision |
| --- | --- | --- |
| Vercel static files | Same origin, built-in CDN, no function or database call. Public assets need explicit browser caching. Transfers still count against the project's plan. | Use `public/media/audio` for this small fixed catalog. |
| Supabase Storage Free | Basic CDN is available; Smart CDN is Pro and above. Storage transfers consume the project's egress allowance alongside other usage. Requires another origin and independent asset deployment. | Preserve Supabase resources for game data; no bucket needed. |

Primary references checked:
- https://vercel.com/docs/caching/cache-control-headers
- https://vercel.com/docs/limits
- https://supabase.com/docs/guides/storage/cdn/smart-cdn
- https://supabase.com/docs/guides/storage/serving/bandwidth
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices
- https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay

Every MP3 filename contains the first 12 hex digits of its SHA-256. `next.config.ts`
sets `Cache-Control: public, max-age=31536000, immutable` only on the audio directory.
The existing middleware excludes `/media/`, so its private/no-store page headers and
authentication work do not run on sound requests. A changed asset gets a new filename;
never overwrite a published hashed file with different bytes. Do not remove an old
published version until cached application builds no longer reference it.

There are three different caches:
1. Vercel's CDN serves the initial request near the visitor; this still uses transfer quota.
2. The browser HTTP cache can reuse the immutable file across visits.
3. The page keeps decoded SFX buffers and in-flight promises by sound ID. Replays in
   that document do not call `fetch` again, even if the browser's disk cache is disabled.

Browser storage can be evicted, cleared or disabled. A new document decodes SFX again
from HTTP cache or the network. Music keeps one streaming HTMLAudioElement per track,
with only one playing, rather than full decoded buffers. Byte-range requests and cache reuse are browser-controlled.
This does not promise permanent offline playback. No service worker, IndexedDB copy,
signed URL, Redis lookup or Supabase request is needed.

## Assets and rights

- Four UI SFX: Kenney's **UI SFX Set**, CC0, obtained from a pinned mirror commit:
  https://github.com/Calinou/kenney-ui-audio/tree/8c3d81b9159d058c444f89d12d518276b0b09345
  Original included license is preserved at `public/media/audio/KENNEY-LICENSE.txt`.
  Used source files: click1.wav, rollover2.wav, switch3.wav, switch10.wav.
- Four original procedural cues: spin noise, success chord, award chord, negative chord.
  Defined in `scripts/build-game-audio.py`; no third-party samples.
- **Floating Cities**, Kevin MacLeod (incompetech.com), ISRC USUAN1600018.
  Source: https://incompetech.com/music/royalty-free/index.html?Search=Search&isrc=USUAN1600018
  License: https://creativecommons.org/licenses/by/4.0/
  Download: https://incompetech.com/music/royalty-free/mp3-royaltyfree/Floating%20Cities.mp3
  Modified: loudness adjusted, entry/exit fades, metadata stripped, MP3 encoding.
  Author, title, source, license link and modification notice are available in the Terms of service content section.

Draft uses Floating Cities. Main gameplay uses **Cipher**, Kevin MacLeod, ISRC
USUAN1100844, CC BY 4.0. Source and attribution:
https://incompetech.com/music/royalty-free/index.html?Search=Search&isrc=USUAN1100844
Both tracks receive the same loudness adjustment, fades and MP3 encoding.

Actual compressed sizes: eight SFX total **28,969 bytes**; Floating Cities **1,841,154 bytes**,
Cipher **2,313,187 bytes**. Each track downloads lazily when selected and enabled.
At 200 fresh listeners, full downloads are about **368 MB** for Floating Cities,
**463 MB** for Cipher, or **831 MB** if everyone hears both, before protocol
overhead and other game assets. This is a transfer estimate, not a
load-test result or a quota guarantee. Recheck provider quotas in their dashboards.

Rebuild locally with Python and `imageio-ffmpeg` installed:

```powershell
python scripts/build-game-audio.py
```

This is a development-only encoder dependency, not a web/runtime dependency. Review
new hashes, sizes, license and sound quality when rebuilding. Raw downloads remain
under ignored `output/audio-source`; no external player, script or streaming service
is embedded in the application.

## Playback and safety

- One lazy AudioContext for effects; one cached HTMLAudioElement per music track,
  with only the current track playing. Switching back preserves its playback position.
- Music is selected from gameplay phase, not just URL: Classic setup and career
  share a route; Quick setup and career also share a route. `useGameMusic` owns this
  override, and route defaults cover transfer, PvE and settings.
- No audio asset requests before a trusted user gesture. Music defaults off.
- Settings independently control master mute, effects/music and both volumes; browser
  storage failures keep the choice in memory for the current document.
- At most six simultaneous effect sources. Tick requests are throttled to 65 ms;
  other repeated cues to 120 ms. Concurrent first requests share a promise.
- Asset fetch timeout: 6 seconds. Failed IDs have a 30-second retry cooldown.
- SFX over 1 MB compressed or 5 seconds decoded are rejected. A cue whose first load
  takes more than 350 ms is cached but not played late; the next eligible event can
  use the ready buffer. There is no delayed burst of queued ticks.
- Mute, entering excluded routes and hiding the document stop current SFX and pause music.
  Browser autoplay restrictions or device interruptions are caught. A later trusted
  gesture can resume effects. Audio completion never decides game progression.
- Shared wheel rotation triggers ticks without additional React state updates.
  A wheel's existing authoritative completion callback and minimum duration remain intact.
- URLs come exclusively from the bundled asset manifest. CSP explicitly restricts media
  to the same origin; no wildcard, eval, microphone permission or new credential is needed.
  Downloadable browser audio is public; it is not a suitable place to hide game logic.

## Checks

- `pnpm exec tsx tests/audio-runtime.test.ts`: deterministic mocks verify pending-request
  deduplication, decoded-buffer reuse, voice cap, throttling, missing/network-failed files,
  stale audio, visibility, per-track reuse, scene switching and blocked local storage.
- `pnpm exec playwright test tests/e2e/audio.spec.ts`: real browser settings, lazy loading,
  real MP3 decoding/source creation, repeat playback, immutable HTTP headers and unavailable
  audio while the Quick wheel continues. Deliberate failed audio requests are the only
  allowed network-console errors in that particular failure case.
- A local browser case delayed each audio response by 2 seconds: the spin button's
  disabled-state feedback took approximately 5 ms and progression still completed.
  This is one local sample, not a device-wide p95 claim. Static music also supports
  HTTP byte-range responses, so playback need not wait for the full track download.
- Existing Quick reduced-motion and trait/viewport regressions verify wheel callbacks
  and layout with audio attached. Existing security-remediation checks cover CSP changes.
- TypeScript, ESLint and production build.

Automated checks cannot judge subjective musical fit, listening fatigue or loudness
on every output device. Full-session listening, Safari/Firefox device checks, CPU/frame
profiling under actual device contention and production CDN hit/egress inspection remain
release checks. No production stress testing is authorized or performed by this task.
