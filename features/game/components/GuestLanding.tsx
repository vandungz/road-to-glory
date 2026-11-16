import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowDown, ArrowUp, Monitor } from "lucide-react";
import { EditorialArt } from "@/components/shared/EditorialArt";
import { LandingQuickLink, LandingTrailer } from "./LandingTrailer";
import { LandingDeferredArt, LandingFaqItem, LandingLanguageButton, LandingSectionMotion } from "./LandingEnhancements";

const updates = [
  { date: "2026-11-13", key: "languageAndAwards" },
  { date: "2026-11-12", key: "careerRecords" },
] as const;

export function GuestLanding() {
  const t = useTranslations("landing");
  const ui = useTranslations("ui");
  const locale = useLocale();
  const targetLocale = locale === "vi" ? "en" : "vi";
  const updateDate = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" });
  const careerMoments = ["debut", "season", "legacy"] as const;
  const questions = ["wheel", "account", "devices"] as const;

  return (
    <div id="landing-top" className="football-guest-landing">
      <LandingSectionMotion />
      <header className="football-guest-landing__header">
        <Link className="football-guest-landing__brand" href="/">Road to Glory</Link>
        <nav className="football-guest-landing__nav" aria-label={t("navigation")}>
          <a href="#landing-gameplay">{t("gameplayLink")}</a>
          <a href="#landing-modes">{t("modesLink")}</a>
          <a href="#landing-updates">{t("updatesLink")}</a>
          <a href="#landing-faq">{t("faqLink")}</a>
        </nav>
        <LandingLanguageButton target={targetLocale} label={t("switchLanguage")} />
      </header>
      <main className="football-guest-landing__main">
        <section className="football-guest-landing__hero" aria-labelledby="guest-landing-title">
          <div className="football-guest-landing__intro">
            <h1 id="guest-landing-title">{t("headline")}</h1>
            <p>{t("intro")}</p>
            <div className="football-guest-landing__actions">
              <LandingQuickLink />
              <Link className="football-guest-landing__classic" href="/login?next=/classic" prefetch={false}>
                {ui("signInToPlayClassic")}
              </Link>
            </div>
            <p className="football-guest-landing__desktop">
              <Monitor size={18} aria-hidden="true" />
              {t("desktop")}
            </p>
          </div>
          <div className="football-guest-landing__pitch" aria-hidden="true">
            <EditorialArt asset="heritage-run" className="football-guest-landing__art" priority />
          </div>
        </section>
        <section id="landing-gameplay" className="football-guest-landing__section football-guest-landing__gameplay" aria-labelledby="landing-gameplay-title">
          <div className="football-guest-landing__section-copy">
            <h2 id="landing-gameplay-title">{t("storyTitle")}</h2>
            <p>{t("gameplayDescription")}</p>
            <a className="football-guest-landing__text-link" href="#landing-career">
              {t("careerLink")}<ArrowDown size={16} aria-hidden="true" />
            </a>
          </div>
          <LandingTrailer copy={{
            title: t("trailer"),
            description: t("trailerDescription"),
            unavailable: t("trailerUnavailable"),
          }} />
        </section>
        <section id="landing-career" className="football-guest-landing__section football-guest-landing__career" aria-labelledby="landing-career-title">
          <div className="football-guest-landing__career-copy">
            <h2 id="landing-career-title">{t("careerTitle")}</h2>
            <ol className="football-guest-landing__moments">
              {careerMoments.map((moment) => (
                <li key={moment}>
                  <h3>{t(`career.${moment}.title`)}</h3>
                  <p>{t(`career.${moment}.description`)}</p>
                </li>
              ))}
            </ol>
          </div>
          <LandingDeferredArt>
            <EditorialArt asset="ballon-dor-trophy" className="football-guest-landing__trophy"
              sizes="(max-width: 739px) 80vw, (max-width: 1450px) 40vw, 570px" />
          </LandingDeferredArt>
        </section>
        <section id="landing-modes" className="football-guest-landing__section football-guest-landing__modes" aria-labelledby="landing-modes-title">
          <h2 id="landing-modes-title">{t("modesTitle")}</h2>
          <div className="football-guest-landing__mode-list">
            <article>
              <h3>Quick Mode</h3>
              <p>{t("quickDescription")}</p>
              <LandingQuickLink className="football-guest-landing__text-link" label={t("quickAction")} />
            </article>
            <article>
              <h3>Classic</h3>
              <p>{t("classicDescription")}</p>
              <Link className="football-guest-landing__text-link" href="/login?next=/classic" prefetch={false}>{t("classicAction")}</Link>
            </article>
            <article>
              <h3>PvE Tournament</h3>
              <p>{t("pveDescription")}</p>
              <Link className="football-guest-landing__text-link" href="/login?next=/pve" prefetch={false}>{t("pveAction")}</Link>
            </article>
          </div>
        </section>
        <section id="landing-updates" className="football-guest-landing__section football-guest-landing__updates" aria-labelledby="landing-updates-title">
          <h2 id="landing-updates-title">{t("updatesTitle")}</h2>
          <div className="football-guest-landing__update-list">
            {updates.map(({ date, key }) => (
              <article key={key}>
                <time dateTime={date}>{updateDate.format(new Date(date))}</time>
                <div>
                  <h3>{t(`updates.${key}.title`)}</h3>
                  <p>{t(`updates.${key}.description`)}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section id="landing-faq" className="football-guest-landing__section football-guest-landing__faq" aria-labelledby="landing-faq-title">
          <h2 id="landing-faq-title">{t("faqTitle")}</h2>
          <div className="football-guest-landing__questions">
            {questions.map((question) => (
              <LandingFaqItem key={question} question={t(`faq.${question}.question`)} answer={t(`faq.${question}.answer`)} />
            ))}
          </div>
        </section>
      </main>
      <footer className="football-guest-landing__footer">
        <section className="football-guest-landing__closing" aria-labelledby="landing-closing-title">
          <h2 id="landing-closing-title">{t("closingTitle")}</h2>
          <div className="football-guest-landing__actions">
            <LandingQuickLink label={t("closingAction")} />
          </div>
          <p className="football-guest-landing__desktop">
            <Monitor size={18} aria-hidden="true" />
            {t("closingDesktop")}
          </p>
        </section>
        <div className="football-guest-landing__footer-grid">
          <span className="football-guest-landing__brand">Football Life</span>
          <nav aria-labelledby="landing-footer-game">
            <h2 id="landing-footer-game">{t("footer.game")}</h2>
            <ul>
              <li><a href="#landing-gameplay">{t("footer.gameplay")}</a></li>
              <li><a href="#landing-modes">{t("footer.modes")}</a></li>
              <li><a href="#landing-updates">{t("updatesTitle")}</a></li>
            </ul>
          </nav>
          <div>
            <h2>{t("footer.community")}</h2>
            <ul><li>{t("footer.contact")}</li><li>{t("footer.donate")}</li></ul>
          </div>
          <div>
            <h2>{t("footer.policies")}</h2>
            <ul><li><Link href="/privacy">{t("footer.privacy")}</Link></li><li><Link href="/terms">{t("footer.terms")}</Link></li></ul>
          </div>
        </div>
        <div className="football-guest-landing__footer-end">
          <small>{t("footer.pending")}</small>
          <a className="football-guest-landing__text-link" href="#landing-top">
            {t("backToTop")}<ArrowUp size={16} aria-hidden="true" />
          </a>
        </div>
      </footer>
    </div>
  );
}
