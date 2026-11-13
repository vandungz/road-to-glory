"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { PlayerPortrait } from "@/features/player/components/PlayerPortrait";
import { PLAYER_PROFILE_POSITIONS, PORTRAIT_IDS, type PortraitId } from "@/features/player/lib/player-portraits";
import { NATIONALITY_POOL } from "@/lib/wheel-engine/weight-calculator";

export interface ClassicProfile {
  name: string;
  nationality: string;
  position: string;
  portraitId: PortraitId;
}

const nationalities = NATIONALITY_POOL.map(({ value }) => ({ label: value, value }));
const positions = PLAYER_PROFILE_POSITIONS.map((value) => ({ label: value, value }));

export function ClassicProfileSetup({ slotPosition, onContinue, onRandom }: {
  slotPosition: string;
  onContinue: (profile: ClassicProfile) => void;
  onRandom: () => void;
}) {
  const ui = useTranslations("ui");
  const [profile, setProfile] = useState<ClassicProfile>({ name: "", nationality: "", position: slotPosition, portraitId: PORTRAIT_IDS[0] });

  return <form className="football-profile-setup" onSubmit={(event) => {
    event.preventDefault();
    const name = profile.name.trim();
    if (name.length >= 2 && profile.nationality) onContinue({ ...profile, name });
  }}>
    <div className="football-profile-setup__fields">
      <h1>{ui("createPlayer")}</h1>
      <label>{ui("playerName")}<input autoComplete="off" value={profile.name} minLength={2} maxLength={60} required
        onChange={(event) => setProfile({ ...profile, name: event.target.value })} /></label>
      <div className="football-quick-field"><span>{ui("country")}</span><FilterSelect label={ui("country")} value={profile.nationality} searchable options={nationalities}
        onChange={(nationality) => setProfile({ ...profile, nationality })} /></div>
      <div className="football-quick-field"><span>{ui("position")}</span><FilterSelect label={ui("position")} value={profile.position} options={positions}
        onChange={(position) => setProfile({ ...profile, position })} /></div>
    </div>
    <fieldset className="football-profile-setup__portraits" data-nation={profile.nationality.replace(/\s+/g, "")}>
      <legend>{ui("portrait")}</legend>
      <div className="football-profile-setup__grid">
        {PORTRAIT_IDS.map((id, index) => <label key={id}>
          <input type="radio" name="portrait" value={id} checked={profile.portraitId === id}
            onChange={() => setProfile({ ...profile, portraitId: id })} />
          <PlayerPortrait portraitId={id} animate={profile.portraitId === id} />
          <span>{ui("style")} {index + 1}</span>
        </label>)}
      </div>
    </fieldset>
    <div className="football-profile-setup__actions">
      <Button type="button" variant="outline" onClick={onRandom}>{ui("letTheWheelDecide")}</Button>
      <Button type="submit" disabled={profile.name.trim().length < 2 || !profile.nationality}>{ui("resumeDraft")}</Button>
    </div>
  </form>;
}
