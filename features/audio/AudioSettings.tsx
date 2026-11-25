"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { updateAudioPreferences, useAudioPreferences, type AudioPreferences } from "./audio-preferences";
import { playGameSound, unlockGameAudio } from "./game-audio";
import { AudioVolumeControl } from "./AudioVolumeControl";

export function AudioSettings() {
  const t = useTranslations("audio");
  const ui = useTranslations("ui");
  const preferences = useAudioPreferences();
  const [blocked, setBlocked] = useState(false);
  const update = (patch: Partial<AudioPreferences>) => {
    setBlocked(!updateAudioPreferences(patch));
    unlockGameAudio();
  };
  return <fieldset className="football-account-options football-audio-settings" data-guide="settings-audio">
    <legend>{t("title")}</legend>
    <label className="football-audio-toggle"><span>{t("mute")}</span><input role="switch" type="checkbox" checked={preferences.muted} onChange={(event) => update({ muted: event.target.checked })} /></label>
    <label className="football-audio-toggle"><span>{t("effects")}</span><input role="switch" type="checkbox" checked={preferences.effects} onChange={(event) => update({ effects: event.target.checked })} /></label>
    <AudioVolumeControl label={t("effectsVolume")} value={preferences.effectsVolume} onChange={(effectsVolume) => update({ effectsVolume })} />
    <label className="football-audio-toggle"><span>{t("music")}</span><input role="switch" type="checkbox" checked={preferences.music} onChange={(event) => update({ music: event.target.checked })} /></label>
    <AudioVolumeControl label={t("musicVolume")} value={preferences.musicVolume} onChange={(musicVolume) => update({ musicVolume })} />
    <dl className="football-audio-tracks"><div><dt>{t("draftTrack")}</dt><dd>Floating Cities</dd></div><div><dt>{t("gameplayTrack")}</dt><dd>Cipher</dd></div></dl>
    <Button variant="outline" size="sm" data-audio-silent disabled={preferences.muted || !preferences.effects || preferences.effectsVolume === 0}
      onClick={() => { unlockGameAudio(); playGameSound("success"); }}>{t("preview")}</Button>
    {blocked && <p className="football-account-note" role="status">{ui("yourBrowserBlockedSavingTheChangeAppliesUntilYouReloadThisTab")}</p>}
    <details><summary>{t("credits")}</summary>
      <p>“Floating Cities”, Kevin MacLeod (<a href="https://incompetech.com/music/royalty-free/index.html?Search=Search&isrc=USUAN1600018" target="_blank" rel="noopener noreferrer">incompetech.com</a>). <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>. {t("musicEdits")}</p>
      <p>“Cipher”, Kevin MacLeod (<a href="https://incompetech.com/music/royalty-free/index.html?Search=Search&isrc=USUAN1100844" target="_blank" rel="noopener noreferrer">incompetech.com</a>). <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>. {t("musicEdits")}</p>
      <p>{t("soundCredits")} <a href="https://kenney.nl/support" target="_blank" rel="noopener noreferrer">Kenney</a>, CC0.</p>
    </details>
  </fieldset>;
}
