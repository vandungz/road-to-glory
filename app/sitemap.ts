import type { MetadataRoute } from "next";
import { landingSeoSite } from "@/lib/landing-seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const { origin, indexable } = landingSeoSite();
  return indexable && origin
    ? ["/", "/en"].map((path) => ({ url: `${origin}${path}` }))
    : [];
}
