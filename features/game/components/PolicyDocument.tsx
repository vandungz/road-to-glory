import { SupportLink } from "@/components/shared/SupportLink";
import { HelpButton } from "@/features/onboarding/HelpButton";
import { PageGuide } from "@/features/onboarding/GuideProvider";
import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "next-intl/server";
import vi from "@/i18n/legal/vi.json";
import en from "@/i18n/legal/en.json";
import { LandingLanguageButton } from "./LandingEnhancements";
import { AudioAttribution } from "@/features/audio/AudioAttribution";

type PolicyKind = "privacy" | "terms";
const contactEmail = "vdz.indie@gmail.com";

export async function policyMetadata(kind: PolicyKind): Promise<Metadata> {
  const copy = (await getLocale()) === "en" ? en : vi;
  return { title: `${copy[kind].title} | Road to Glory`, description: copy[kind].intro, robots: { index: false, follow: true } };
}

export async function PolicyDocument({ kind }: { kind: PolicyKind }) {
  const english = (await getLocale()) === "en";
  const copy = english ? en : vi;
  const document = copy[kind];
  const related = kind === "privacy" ? "terms" : "privacy";
  const contactSection = kind === "privacy" ? "contact" : "complaints";

  return (
    <div className="football-policy">
      <PageGuide id="policy" />
      <header className="football-policy__header">
        <Link className="football-guest-landing__brand" href="/">Road to Glory</Link>
        <HelpButton /><SupportLink iconOnly />
        <LandingLanguageButton label={copy.switchLanguage} target={english ? "vi" : "en"} />
      </header>
      <main className="football-policy__main">
        <header>
          <h1>{document.title}</h1>
          <p>{document.intro}</p>
          <p className="football-policy__draft">{copy.draft}</p>
        </header>
        <div className="football-policy__layout">
          <nav data-guide="policy-navigation" aria-label={copy.contents}>
            <ul>
              {document.sections.map(({ id, title }) => <li key={id}><a href={`#${id}`}>{title}</a></li>)}
            </ul>
          </nav>
          <article>
            {document.sections.map(({ id, title, paragraphs }) => (
              <section data-guide={id === contactSection ? "policy-contact" : undefined} key={id} id={id} aria-labelledby={`${id}-title`}>
                <h2 id={`${id}-title`}>{title}</h2>
                {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {kind === "terms" && id === "content" && <AudioAttribution />}
                {id === contactSection && <p><a href={`mailto:${contactEmail}`}>{contactEmail}</a></p>}
              </section>
            ))}
          </article>
        </div>
      </main>
      <footer className="football-policy__footer">
        <Link href="/">{copy.home}</Link>
        <Link href={`/${related}`}>{copy[related].title}</Link>
      </footer>
    </div>
  );
}
