"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { updateAudioPreferences, useAudioPreferences, type AudioPreferences } from "./audio-preferences";
import { unlockGameAudio } from "./game-audio";
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
    {blocked && <p className="football-account-note" role="status">{ui("yourBrowserBlockedSavingTheChangeAppliesUntilYouReloadThisTab")}</p>}
  </fieldset>;
}
