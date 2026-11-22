import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { EditorialArt } from "@/components/shared/EditorialArt";
import { HeaderLanguageButton } from "@/features/settings/components/HeaderLanguageButton";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  const common = await getTranslations("common");
  const footer = await getTranslations("landing.footer");
  return (
    <div className="football-not-found">
      <meta name="robots" content="noindex" />
      <header className="football-not-found__header">
        <Link href="/" className="football-not-found__brand">Road to Glory</Link>
        <div className="football-header-tools"><HeaderLanguageButton /></div>
      </header>
      <main className="football-not-found__main" data-mount="page" id="not-found-main">
        <div className="football-not-found__content">
          <p className="football-not-found__code" aria-hidden="true">404</p>
          <h1>{t("title")}</h1>
          <p className="football-not-found__description">{t("description")}</p>
          <Link href="/" className="football-button football-button--primary">{common("home")}</Link>
        </div>
        <div className="football-not-found__art" aria-hidden="true">
          <EditorialArt asset="heritage-touch" priority />
        </div>
      </main>
      <footer className="football-not-found__footer">
        <span>{t("footer")}</span>
        <nav aria-label={footer("policies")}>
          <Link href="/privacy">{footer("privacy")}</Link>
          <Link href="/terms">{footer("terms")}</Link>
        </nav>
      </footer>
    </div>
  );
}
