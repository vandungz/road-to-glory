import { expect, test } from "@playwright/test";

const id = "00000000-0000-4000-8000-000000000001";
const badPaths = ["/a-page-that-does-not-exist", "/missing/deep/link", "/classic/invalid", `/classic/${id}/draft/0.png`, `/classic/${id}/draft/11`, "/pve/not-a-uuid", "/auth/typo", "/404"];

test("invalid URLs preserve the address and return real localized 404 responses", async ({ page, request }) => {
  for (const path of badPaths) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status(), path).toBe(404);
    expect(response.headers()["location"]).toBeUndefined();
    expect(response.headers()["x-frame-options"]).toBe("DENY");
    expect(await response.text()).toContain("Không tìm thấy trang");
  }
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(badPaths[0]);
  await expect(page).toHaveURL(new RegExp(badPaths[0] + "$"));
  await expect(page.getByRole("heading", { name: "Không tìm thấy trang", exact: true })).toBeVisible();
  await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
  await expect(page).toHaveTitle(/Không tìm thấy trang/);
  await page.locator(".football-header-language").click();
  await expect(page.getByRole("heading", { name: "Page not found", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Page not found", exact: true })).toBeVisible();
  await page.getByRole("main").getByRole("link", { name: "Home", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(errors).toEqual([]);
});

test("real protected routes still require authentication", async ({ request }) => {
  for (const path of ["/classic", "/pve", `/classic/${id}`, `/pve/${id}`, `/${id}/draft/0`]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(new URL(response.headers()["location"], response.url()).pathname).toBe("/login");
  }
});

for (const width of [375, 768, 1024, 1280, 1920]) {
  test(`404 recovery fits ${width}px and respects reduced motion`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/missing/viewport");
    await expect(page.getByRole("heading", { name: "Không tìm thấy trang", exact: true })).toBeVisible();
    await expect(page.locator(".football-desktop-notice")).toBeHidden();
    const action = page.getByRole("main").getByRole("link", { name: "Trang chủ", exact: true });
    await expect(action).toBeInViewport();
    await action.focus();
    expect(await action.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe("none");
    expect(await page.locator("#not-found-main").evaluate((element) => getComputedStyle(element).animationDuration)).toBe("0s");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `output/playwright/not-found-${width}.png`, fullPage: true });
  });
}

test("404 content and home recovery are available without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL,
    extraHTTPHeaders: process.env.RTG_PRODUCTION_CHECK === "1" ? { "x-forwarded-proto": "https" } : undefined });
  const page = await context.newPage();
  await page.goto("/missing/no-script");
  await expect(page.getByRole("heading", { name: "Không tìm thấy trang", exact: true })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "Trang chủ", exact: true })).toHaveAttribute("href", "/");
  await context.close();
});
