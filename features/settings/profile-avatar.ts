export const profileAvatarChoices = ["default", "google", "striker", "playmaker", "winger"] as const;
export type ProfileAvatarChoice = typeof profileAvatarChoices[number];
export interface AccountAvatar { choice: ProfileAvatarChoice; google: string | null }

export function accountAvatar(user: { user_metadata: Record<string, unknown>; identities?: { provider: string; identity_data?: Record<string, unknown> }[] }): AccountAvatar {
  const google = user.identities?.find((identity) => identity.provider === "google");
  const photo = googleAvatarUrl(google?.identity_data?.avatar_url ?? google?.identity_data?.picture);
  return { choice: profileAvatarChoice(user.user_metadata.profile_avatar, !!photo), google: photo };
}

export function googleAvatarUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port &&
      (url.hostname === "googleusercontent.com" || url.hostname.endsWith(".googleusercontent.com")) ? url.href : null;
  } catch { return null; }
}

export function profileAvatarChoice(value: unknown, hasGoogleAvatar: boolean): ProfileAvatarChoice {
  return profileAvatarChoices.includes(value as ProfileAvatarChoice) ? value as ProfileAvatarChoice : hasGoogleAvatar ? "google" : "default";
}

export function profileAvatarSource(choice: ProfileAvatarChoice, google: string | null): string | null {
  if (choice === "google") return googleAvatarUrl(google);
  return choice === "default" ? null : `/media/avatars/${choice}-v1.webp`;
}
