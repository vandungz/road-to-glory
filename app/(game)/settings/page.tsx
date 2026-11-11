import type { Metadata } from "next";
import { AppShell } from "@/components/shared/AppShell";
import { MotionSettings } from "@/features/settings/components/MotionSettings";

export const metadata: Metadata = {
  title: "Cài đặt | Football Life",
  description: "Điều chỉnh chuyển động cho các chế độ chơi.",
};

export default function SettingsPage() {
  return (
    <AppShell className="football-account-shell" backHref="/" backLabel="Trang chủ">
      <section className="football-account">
        <h1>Cài đặt</h1>
        <div className="football-account-sheet">
          <MotionSettings />
        </div>
      </section>
    </AppShell>
  );
}
