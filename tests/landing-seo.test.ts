import assert from "node:assert/strict";
import { landingSeoSite, landingStructuredData, landingAlternates } from "../lib/landing-seo";
import robots from "../app/robots";
import sitemap from "../app/sitemap";
import { appRouteAccess } from "../lib/app-routes";

const original = { ...process.env };
try {
  Object.assign(process.env, { NODE_ENV: "production", VERCEL_ENV: "production", NEXT_PUBLIC_SITE_URL: "https://game.example" });
  assert.deepEqual(landingSeoSite(), { origin: "https://game.example", indexable: true });
  assert.equal(robots().sitemap, "https://game.example/sitemap.xml");
  assert.deepEqual(sitemap().map(({ url }) => url), ["https://game.example/", "https://game.example/en"]);
  for (const route of ["/en", "/robots.txt", "/sitemap.xml"]) assert.equal(appRouteAccess(route), "public");
  for (const locale of ["vi", "en"] as const) {
    const alternates = landingAlternates("https://game.example", locale);
    assert.equal(alternates.canonical, locale === "en" ? "https://game.example/en" : "https://game.example/");
    assert.deepEqual(alternates.languages, { vi: "https://game.example/", en: "https://game.example/en", "x-default": "https://game.example/" });
    assert.equal(JSON.parse(landingStructuredData("https://game.example", "Game", locale)).url, alternates.canonical);
  }
  process.env.VERCEL_ENV = "preview";
  assert.equal(landingSeoSite().indexable, false);
  assert.deepEqual(sitemap(), []);
  assert.deepEqual(robots().rules, { userAgent: "*", disallow: "/" });
  for (const invalid of ["", "not a URL", "https://game.example/unsafe", "http://game.example"]) {
    process.env.NEXT_PUBLIC_SITE_URL = invalid;
    assert.deepEqual(landingSeoSite(), { origin: undefined, indexable: false });
  }
  const json = landingStructuredData("https://game.example", "</script><script>alert(1)</script>", "vi");
  assert.ok(!json.includes("<"));
  assert.equal(JSON.parse(json).description, "</script><script>alert(1)</script>");
  assert.equal(JSON.parse(json)["@type"], "VideoGame");
  console.log("Landing SEO: canonical, preview protection, crawl routes and JSON-LD escaping passed.");
} finally {
  process.env = original;
}
