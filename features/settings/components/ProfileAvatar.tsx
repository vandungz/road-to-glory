"use client";

import { useState } from "react";
import Image from "next/image";
import { UserRound } from "lucide-react";
import { profileAvatarSource, type ProfileAvatarChoice } from "../profile-avatar";

export function ProfileAvatar({ choice, google, label }: { choice: ProfileAvatarChoice; google: string | null; label: string }) {
  const src = profileAvatarSource(choice, google);
  const [failed, setFailed] = useState<string | null>(null);
  return <span className="football-profile-avatar">{src && failed !== src ? <Image src={src} alt={label} width={72} height={72} loading="eager" unoptimized referrerPolicy="no-referrer" onError={() => setFailed(src)} /> : <UserRound size={30} aria-label={label || undefined} aria-hidden={!label || undefined} />}</span>;
}
