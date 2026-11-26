import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { ProfileDetails, type ProfileAccount } from "./ProfileDetails";
import { googleAvatarUrl, profileAvatarChoice } from "../profile-avatar";
import { SecuritySettings } from "./SecuritySettings";

export type SettingsAccount = ProfileAccount;

export async function ProfileSettingsContent({ account, preview = false }: { account: SettingsAccount | null; preview?: boolean }) {
  const ui = await getTranslations("ui");
  return <section id="profile" className="football-settings-section" data-guide="settings-profile" aria-labelledby="settings-profile-title">
    <h2 id="settings-profile-title">{ui("profile")}</h2>
    {account ? <ProfileDetails account={account} preview={preview} /> : <div className="football-settings-guest"><p>{ui("signInToSeeYourProfileAndClassicSquads")}</p><Link className="football-button football-button--outline" href="/login?next=/profile">{ui("signIn")}</Link></div>}
  </section>;
}

export async function AccountSettingsPanels() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  const google = user?.identities?.find((identity) => identity.provider === "google");
  const googleAvatar = googleAvatarUrl(google?.identity_data?.avatar_url ?? google?.identity_data?.picture);
  const account: SettingsAccount | null = !error && user ? {
    email: user.email ?? "", name: typeof user.user_metadata.display_name === "string" ? user.user_metadata.display_name.trim().slice(0, 40) : "",
    avatar: profileAvatarChoice(user.user_metadata.profile_avatar, !!googleAvatar), googleAvatar,
    googleEmail: google ? (typeof google.identity_data?.email === "string" ? google.identity_data.email : user.email ?? "") : null,
  } : null;
  return {
    profile: <ProfileSettingsContent account={account} />,
    security: <SecuritySettings signedIn={!!account} hasPassword={user?.identities?.some((identity) => identity.provider === "email") ?? false} />,
  };
}
