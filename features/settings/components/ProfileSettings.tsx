import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { DisplayNameForm } from "@/features/auth/components/DisplayNameForm";
import { getGameSessionsForUser } from "@/features/game/services/game-session.service";

export interface SettingsAccount {
  email: string;
  name: string;
  inProgress: number;
  completed: number;
  activeId?: string;
  activeName?: string;
  squadsUnavailable?: boolean;
}

export async function ProfileSettingsContent({ account }: { account: SettingsAccount | null }) {
  const ui = await getTranslations("ui");
  return <section id="profile" className="football-settings-section" data-guide="settings-profile" aria-labelledby="settings-profile-title">
    <h2 id="settings-profile-title">{ui("profile")}</h2>
    {account ? <div className="football-settings-profile">
      <div data-guide="account-profile">
        <dl className="football-account-email"><dt>Email</dt><dd>{account.email}</dd></dl>
        <DisplayNameForm initialName={account.name} />
      </div>
      <div data-guide="account-squads">
        <h3>{ui("classicSquads")}</h3>
        {account.squadsUnavailable ? <p>{ui("couldNotLoadSquadsReloadThePageToTryAgain")}</p> :
          <dl className="football-account-record"><div><dt>{ui("draftInProgress")}</dt><dd>{account.inProgress}</dd></div><div><dt>{ui("completed")}</dt><dd>{account.completed}</dd></div></dl>}
        <div className="football-account-actions">
          {account.activeId && <Link className="football-button football-button--outline" href={`/classic/${account.activeId}`}>{ui("resumeNamed", { name: account.activeName ?? "" })}</Link>}
          <Link className="football-button football-button--quiet" href="/classic">{ui("squadList")}</Link>
        </div>
      </div>
    </div> : <div className="football-settings-guest"><p>{ui("signInToSeeYourProfileAndClassicSquads")}</p><Link className="football-button football-button--outline" href="/login?next=/profile">{ui("signIn")}</Link></div>}
  </section>;
}

export async function ProfileSettings() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <ProfileSettingsContent account={null} />;
  const sessions = await getGameSessionsForUser(user.id).catch(() => null);
  const completed = sessions?.filter((session) => session.status === "completed").length ?? 0;
  const active = sessions?.find((session) => session.status === "in_progress");
  return <ProfileSettingsContent account={{ email: user.email ?? "", name: typeof user.user_metadata.display_name === "string" ? user.user_metadata.display_name.trim().slice(0, 40) : "",
    inProgress: (sessions?.length ?? 0) - completed, completed, activeId: active?.id, activeName: active?.name, squadsUnavailable: sessions === null }} />;
}
