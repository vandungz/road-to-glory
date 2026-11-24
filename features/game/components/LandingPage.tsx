import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { landingSeoSite, landingStructuredData, landingAlternates } from "@/lib/landing-seo";
import { GuestLanding } from "./GuestLanding";
import type { Locale } from "@/i18n/locale";

export async function landingMetadata(locale: Locale): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "landing" });
  const title = t("seoTitle");
  const description = t("description");
  const { origin, indexable } = landingSeoSite();
  const alternates = origin ? landingAlternates(origin, locale) : undefined;
  const image = { url: "/media/landing/career-gameplay-v2-cover.webp", width: 960, height: 536, alt: t("previewAlt") };
  return {
    metadataBase: origin ? new URL(origin) : undefined,
    title, description, alternates,
    robots: { index: indexable, follow: true },
    openGraph: {
      type: "website", url: alternates?.canonical, siteName: "Road to Glory",
      locale: locale === "vi" ? "vi_VN" : "en_US",
      alternateLocale: locale === "vi" ? "en_US" : "vi_VN",
      title, description, images: [image],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export async function LandingPage() {
  const { origin } = landingSeoSite();
  const t = await getTranslations("landing");
  const locale = await getLocale();
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return <>
    {/* Browsers hide the nonce attribute before React hydrates this server script. */}
    {origin && <script type="application/ld+json" nonce={nonce} suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: landingStructuredData(origin, t("description"), locale) }} />}
    <GuestLanding />
  </>;
}
