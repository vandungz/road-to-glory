import { getCanonicalSiteUrl } from "./auth/site-url";
import type { Locale } from "@/i18n/locale";

export function landingAlternates(origin: string, locale: Locale) {
  const languages = { vi: `${origin}/`, en: `${origin}/en`, "x-default": `${origin}/` };
  return { canonical: languages[locale], languages };
}

/** Preview and local builds must never advertise themselves as the public game. */
export function landingSeoSite() {
  let origin: string | undefined;
  try {
    origin = getCanonicalSiteUrl();
  } catch {
    // A missing public origin must not publish a localhost canonical or sitemap.
  }
  const indexable = Boolean(origin) && process.env.NODE_ENV === "production"
    && (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === "production");
  return { origin, indexable };
}

export function landingStructuredData(origin: string, description: string, locale: string) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: "Road to Glory",
    alternateName: "Football Life",
    url: `${origin}${locale === "en" ? "/en" : "/"}`,
    description,
    image: `${origin}/media/landing/career-gameplay-v2-cover.webp`,
    inLanguage: locale,
    genre: ["Sports", "Simulation"],
    gamePlatform: "Web browser",
    playMode: "https://schema.org/SinglePlayer",
    isAccessibleForFree: true,
  }).replace(/</g, "\\u003c");
}
