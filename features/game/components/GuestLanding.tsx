import { SupportLink } from "@/components/shared/SupportLink";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowDown, ArrowUp, Monitor } from "lucide-react";
import { EditorialArt } from "@/components/shared/EditorialArt";
import { LandingQuickLink, LandingTrailer } from "./LandingTrailer";
import { LandingFaqItem, LandingLanguageLink, LandingSectionMotion } from "./LandingEnhancements";
import { LandingStartup } from "./LandingStartup";

export function GuestLanding() {
  const t = useTranslations("landing");
  const ui = useTranslations("ui");
  const locale = useLocale();
  const targetLocale = locale === "vi" ? "en" : "vi";
  const careerMoments = ["debut", "season", "legacy"] as const;
  const questions = ["wheel", "account", "devices"] as const;

  return (
    <div id="landing-top" className="football-guest-landing" data-entry-state="splash">
      <LandingStartup />
      <LandingSectionMotion />
      <header className="football-guest-landing__header">
        <Link className="football-guest-landing__brand" href={locale === "en" ? "/en" : "/"}>Road to Glory</Link>
        <nav className="football-guest-landing__nav" aria-label={t("navigation")}>
          <a href="#landing-gameplay">{t("gameplayLink")}</a>
          <a href="#landing-modes">{t("modesLink")}</a>
          <a href="#landing-career">{t("careerNav")}</a>
          <a href="#landing-faq">{t("faqLink")}</a>
        </nav>
        <div className="football-landing-utilities"><SupportLink iconOnly /><LandingLanguageLink target={targetLocale} label={t("switchLanguage")} /></div>
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
        <section className="football-guest-landing__section football-guest-landing__gameplay" aria-labelledby="landing-gameplay-title">
          <div className="football-guest-landing__section-copy">
            <h2 id="landing-gameplay-title">{t("storyTitle")}</h2>
            <p>{t("gameplayDescription")}</p>
            <p className="football-guest-landing__probability">{t("probabilityDescription")}</p>
            <a className="football-guest-landing__text-link" href="#landing-career">
              {t("careerLink")}<ArrowDown size={16} aria-hidden="true" />
            </a>
          </div>
          <LandingTrailer copy={{ title: t("trailer"), description: t("trailerDescription"), unavailable: t("trailerUnavailable") }} />
          <dl className="football-guest-landing__odds">
            {(["player", "club", "nation"] as const).map((factor) => <div key={factor}>
              <dt>{t(`odds.${factor}.title`)}</dt><dd>{t(`odds.${factor}.description`)}</dd>
            </div>)}
          </dl>
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
          <div className="football-guest-landing__trophy-frame">
            <EditorialArt asset="ballon-dor-trophy" className="football-guest-landing__trophy"
              sizes="(max-width: 739px) 80vw, (max-width: 1450px) 40vw, 570px" />
          </div>
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
              <li><a href="#landing-career">{t("careerNav")}</a></li>
            </ul>
          </nav>
          <div>
            <h2>{t("footer.community")}</h2>
            <ul><li><a href="mailto:vdz.indie@gmail.com">{t("footer.contact")}</a></li><li><SupportLink /></li></ul>
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
