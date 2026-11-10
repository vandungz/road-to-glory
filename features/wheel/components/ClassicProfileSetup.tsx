"use client";

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
  const [profile, setProfile] = useState<ClassicProfile>({ name: "", nationality: "", position: slotPosition, portraitId: PORTRAIT_IDS[0] });

  return <form className="football-profile-setup" onSubmit={(event) => {
    event.preventDefault();
    const name = profile.name.trim();
    if (name.length >= 2 && profile.nationality) onContinue({ ...profile, name });
  }}>
    <div className="football-profile-setup__fields">
      <h1>Tạo cầu thủ</h1>
      <label>Tên cầu thủ<input autoComplete="off" value={profile.name} minLength={2} maxLength={60} required
        onChange={(event) => setProfile({ ...profile, name: event.target.value })} /></label>
      <div className="football-quick-field"><span>Quốc gia</span><FilterSelect label="Quốc gia" value={profile.nationality} searchable options={nationalities}
        onChange={(nationality) => setProfile({ ...profile, nationality })} /></div>
      <div className="football-quick-field"><span>Vị trí</span><FilterSelect label="Vị trí" value={profile.position} options={positions}
        onChange={(position) => setProfile({ ...profile, position })} /></div>
    </div>
    <fieldset className="football-profile-setup__portraits" data-nation={profile.nationality.replace(/\s+/g, "")}>
      <legend>Chân dung</legend>
      <div className="football-profile-setup__grid">
        {PORTRAIT_IDS.map((id, index) => <label key={id}>
          <input type="radio" name="portrait" value={id} checked={profile.portraitId === id}
            onChange={() => setProfile({ ...profile, portraitId: id })} />
          <PlayerPortrait portraitId={id} animate={profile.portraitId === id} />
          <span>Mẫu {index + 1}</span>
        </label>)}
      </div>
    </fieldset>
    <div className="football-profile-setup__actions">
      <Button type="button" variant="outline" onClick={onRandom}>Vòng quay quyết định</Button>
      <Button type="submit" disabled={profile.name.trim().length < 2 || !profile.nationality}>Tiếp tục draft</Button>
    </div>
  </form>;
}
