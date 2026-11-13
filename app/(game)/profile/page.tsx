import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/shared/AppShell";
import { DisplayNameForm } from "@/features/auth/components/DisplayNameForm";
import { getGameSessionsForUser } from "@/features/game/services/game-session.service";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const ui = await getTranslations("ui");
  return { title: ui("profile") + " | Football Life", description: ui("profileDescription") };
}

export default async function ProfilePage() {
  const ui = await getTranslations("ui");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const sessions = user ? await getGameSessionsForUser(user.id).catch(() => null) : [];
  const completed = sessions?.filter((session) => session.status === "completed").length ?? 0;
  const active = sessions?.find((session) => session.status === "in_progress");
  const displayName = user?.user_metadata.display_name;
  const initialName = typeof displayName === "string" ? displayName.trim().slice(0, 40) : "";

  return (
    <AppShell className="football-account-shell" backHref="/" backLabel="home">
      <section className="football-account">
        <h1>{ui("profile")}</h1>
        {user ? (
          <div className="football-account-sheet football-account-profile">
            <section aria-labelledby="account-details-title">
              <h2 id="account-details-title">{ui("account")}</h2>
              <dl className="football-account-email"><dt>Email</dt><dd>{user.email ?? ui("noEmailAddress")}</dd></dl>
              <DisplayNameForm initialName={initialName} />
            </section>
            <section aria-labelledby="account-squads-title">
              <h2 id="account-squads-title">{ui("classicSquads")}</h2>
              {sessions ? (
                <dl className="football-account-record">
                  <div><dt>{ui("draftInProgress")}</dt><dd>{sessions.length - completed}</dd></div>
                  <div><dt>{ui("completed")}</dt><dd>{completed}</dd></div>
                </dl>
              ) : <p>{ui("couldNotLoadSquadsReloadThePageToTryAgain")}</p>}
              <div className="football-account-actions">
                {active && <Link className="football-button football-button--outline" href={`/classic/${active.id}`}>{ui("resumeNamed", { name: active.name })}</Link>}
                <Link className="football-button football-button--quiet" href="/classic">{ui("squadList")}</Link>
              </div>
            </section>
          </div>
        ) : (
          <div className="football-account-sheet football-account-guest">
            <p>{ui("signInToSeeYourProfileAndClassicSquads")}</p>
            <Link className="football-button football-button--primary" href="/login?next=/profile">{ui("signIn")}</Link>
          </div>
        )}
      </section>
    </AppShell>
  );
}
