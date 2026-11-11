import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/shared/AppShell";
import { DisplayNameForm } from "@/features/auth/components/DisplayNameForm";
import { LogoutButton } from "@/features/auth/components/LogoutButton";
import { getGameSessionsForUser } from "@/features/game/services/game-session.service";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Hồ sơ | Football Life",
  description: "Quản lý tên hiển thị và xem đội hình Classic của bạn.",
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const sessions = user ? await getGameSessionsForUser(user.id).catch(() => null) : [];
  const completed = sessions?.filter((session) => session.status === "completed").length ?? 0;
  const active = sessions?.find((session) => session.status === "in_progress");
  const displayName = user?.user_metadata.display_name;
  const initialName = typeof displayName === "string" ? displayName.trim().slice(0, 40) : "";

  return (
    <AppShell className="football-account-shell" backHref="/" backLabel="Trang chủ">
      <section className="football-account">
        <h1>Hồ sơ</h1>
        {user ? (
          <div className="football-account-sheet football-account-profile">
            <section aria-labelledby="account-details-title">
              <h2 id="account-details-title">Tài khoản</h2>
              <dl className="football-account-email"><dt>Email</dt><dd>{user.email ?? "Chưa có email"}</dd></dl>
              <DisplayNameForm initialName={initialName} />
              <LogoutButton />
            </section>
            <section aria-labelledby="account-squads-title">
              <h2 id="account-squads-title">Đội hình Classic</h2>
              {sessions ? (
                <dl className="football-account-record">
                  <div><dt>Đang draft</dt><dd>{sessions.length - completed}</dd></div>
                  <div><dt>Đã hoàn thành</dt><dd>{completed}</dd></div>
                </dl>
              ) : <p>Chưa tải được đội hình. Hãy tải lại trang để thử lại.</p>}
              <div className="football-account-actions">
                {active && <Link className="football-button football-button--outline" href={`/classic/${active.id}`}>Tiếp tục {active.name}</Link>}
                <Link className="football-button football-button--quiet" href="/classic">Danh sách đội hình</Link>
              </div>
            </section>
          </div>
        ) : (
          <div className="football-account-sheet football-account-guest">
            <p>Đăng nhập để xem hồ sơ và đội hình Classic.</p>
            <Link className="football-button football-button--primary" href="/login?next=/profile">Đăng nhập</Link>
          </div>
        )}
      </section>
    </AppShell>
  );
}
