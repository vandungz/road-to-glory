import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import NotFound from "../not-found";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("notFound");
  return { title: `${t("title")} | Road to Glory`, robots: { index: false } };
}

/** Middleware rewrites invalid URLs here with HTTP 404 before rendering starts. */
export default function MissingPage() {
  return <NotFound />;
}
