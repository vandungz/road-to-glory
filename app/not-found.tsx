import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/shared/AppShell";

export default async function NotFound() {
  const t = await getTranslations("ui");
  const common = await getTranslations("common");
  return (
    <AppShell>
      <section className="football-account">
        <h1>{t("pageNotFound")}</h1>
        <Link href="/" className="football-button football-button--primary">{common("home")}</Link>
      </section>
    </AppShell>
  );
}
