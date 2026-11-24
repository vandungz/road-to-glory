import { test, expect } from "./helpers";
import { localeCookie } from "../../i18n/locale";

test("landing exposes SEO and hero imagery without waiting for JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  const response = await page.goto("/");
  await expect(page).toHaveTitle("Road to Glory — Game mô phỏng sự nghiệp bóng đá");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href",
    process.env.RTG_PRODUCTION_CHECK === "1" ? /^https:\/\/[^/]+\/?$/ : /^https?:\/\/[^/]+\/?$/);
  const structured = page.locator('script[type="application/ld+json"]');
  const schema = JSON.parse(await structured.textContent() ?? "{}");
  expect(schema["@type"]).toBe("VideoGame");
  expect(schema.isAccessibleForFree).toBe(true);
  const nonce = await structured.evaluate((script: HTMLScriptElement) => script.nonce);
  expect(nonce).toBeTruthy();
  if (process.env.RTG_PRODUCTION_CHECK === "1") {
    expect(response?.headers()["content-security-policy"]).toContain(`'nonce-${nonce}'`);
  }
  const hero = page.locator(".football-guest-landing__art");
  await expect(hero).toHaveAttribute("loading", "eager");
  await expect(hero).toHaveAttribute("fetchpriority", "high");
  await expect(hero).toBeVisible();
  expect(await hero.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  await expect(page.locator(".football-guest-landing__trophy")).toHaveAttribute("loading", "lazy");
  await expect(page.locator("#landing-updates")).toHaveCount(0);
  const faq = page.locator("details").first();
  await faq.locator("summary").click();
  await expect(faq.locator("p")).toBeVisible();
  for (const path of ["/robots.txt", "/sitemap.xml"]) {
    const response = await context.request.get(path);
    expect(response.status()).toBe(200);
    expect(await response.text()).not.toContain("<!DOCTYPE html>");
  }
  await context.close();
});

test("login and game pages stay out of search results", async ({ page }) => {
  for (const path of ["/login", "/quick"]) {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
  }
});

test("hero stays visible after hydration and English metadata follows the language", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".football-guest-landing__hero")).not.toHaveClass(/__entered/);
  await page.getByRole("link", { name: "Chuyển sang tiếng Anh" }).click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(page).toHaveTitle("Road to Glory — Football Career Wheel Game");
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content", "en_US");
  await expect(page.getByRole("link", { name: "Career", exact: true }).first()).toHaveAttribute("href", "#landing-career");
});

for (const locale of ["vi", "en"] as const) {
  test(`${locale} landing URL wins over cookies and browser language without JavaScript`, async ({ browser, baseURL }) => {
    const opposite = locale === "en" ? "vi" : "en";
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false, locale: opposite, viewport: { width: 390, height: 844 } });
    await context.addCookies([{ name: localeCookie, value: opposite, url: baseURL! }]);
    const page = await context.newPage();
    const path = locale === "en" ? "/en" : "/";
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.getByRole("heading", { name: locale === "en" ? "A season can turn on a spin" : "Một lượt quay đổi cả mùa" })).toBeVisible();
    const canonical = new URL((await page.locator('link[rel="canonical"]').getAttribute("href"))!).href;
    const origin = new URL(canonical).origin;
    expect(canonical).toBe(`${origin}${path}`);
    for (const [language, url] of [["vi", `${origin}/`], ["en", `${origin}/en`], ["x-default", `${origin}/`]]) {
      const href = await page.locator(`link[rel="alternate"][hreflang="${language}"]`).getAttribute("href");
      expect(new URL(href!).href).toBe(url);
    }
    expect(new URL((await page.locator('meta[property="og:url"]').getAttribute("content"))!).href).toBe(canonical);
    const data = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? "{}");
    expect(data.url).toBe(canonical);
    expect(data.inLanguage).toBe(locale);
    await expect(page.locator(".football-desktop-notice")).toBeHidden();
    await page.getByRole("link", { name: locale === "en" ? "Switch to Vietnamese" : "Chuyển sang tiếng Anh" }).click();
    await expect(page).toHaveURL(locale === "en" ? /\/$/ : /\/en$/);
    await expect(page.locator("html")).toHaveAttribute("lang", opposite);
    await context.close();
  });
}

test("English landing can be opened directly and carries its language into Quick Mode", async ({ page }) => {
  await page.goto("/en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("banner").getByRole("link", { name: "Road to Glory", exact: true })).toHaveAttribute("href", "/en");
  await page.getByRole("link", { name: "Play Quick Mode", exact: true }).click();
  await expect(page).toHaveURL(/\/quick$/);
  await expect(page.getByRole("textbox", { name: "Player name" })).toBeVisible();
});
