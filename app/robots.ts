import type { MetadataRoute } from "next";
import { landingSeoSite } from "@/lib/landing-seo";

export default function robots(): MetadataRoute.Robots {
  const { origin, indexable } = landingSeoSite();
  return {
    rules: indexable
      ? { userAgent: "*", allow: ["/$", "/en$", "/privacy$", "/terms$"], disallow: ["/api/", "/auth/", "/dev/"] }
      : { userAgent: "*", disallow: "/" },
    ...(indexable && origin ? { sitemap: `${origin}/sitemap.xml` } : {}),
  };
}
