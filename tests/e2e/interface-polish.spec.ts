import { test, expect, expectNoHorizontalOverflow } from "./helpers";

test("device guidance copies a clean link and falls back when clipboard is unavailable", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (text: string) => { sessionStorage.setItem("copied-link", text); } } }));
  await page.goto("/quick?source=example#fragment");
  await page.getByRole("button", { name: "Sao chép liên kết", exact: true }).click();
  await expect(page.getByRole("button", { name: "Đã sao chép liên kết", exact: true })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem("copied-link"))).toBe("http://localhost:3000/quick");
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("desktop-guidance.png") });
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { value: undefined }));
  await page.getByRole("button", { name: "Đã sao chép liên kết", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Chạm và giữ liên kết để sao chép:" })).toHaveValue("http://localhost:3000/quick");
});

test("profile header, unlabeled avatar choices and attribution location stay consistent", async ({ page }) => {
  await page.goto("/dev/design-preview?view=Home");
  const profile = page.getByRole("banner").locator('a[href="/settings?tab=profile"]');
  await expect(profile.locator("img")).toHaveAttribute("src", /\/media\/avatars\/playmaker-v1\.webp$/);
  await expect(page.getByRole("link", { name: "Credits", exact: true })).toHaveCount(0);
  await page.goto("/dev/settings-preview");
  await expect(page.getByText("Email chính", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Đổi ảnh đại diện", exact: true }).click();
  const choices = page.locator(".football-avatar-options");
  await expect(choices).toHaveText("");
  await expect(choices.getByRole("radio")).toHaveCount(4);
  await page.goto("/terms");
  await expect(page.locator(".football-audio-attribution")).toContainText("Kevin MacLeod");
  await expect(page.locator('.football-audio-attribution a[href="https://creativecommons.org/licenses/by/4.0/"]')).toBeVisible();
});

test("shared scrollbar removes arrows and track while preserving native scrolling", async ({ page }) => {
  await page.goto("/terms");
  const styles = await page.locator("html").evaluate((element) => ({
    size: getComputedStyle(element, "::-webkit-scrollbar").width,
    button: getComputedStyle(element, "::-webkit-scrollbar-button").display,
    track: getComputedStyle(element, "::-webkit-scrollbar-track").backgroundColor,
    radius: getComputedStyle(element, "::-webkit-scrollbar-thumb").borderRadius,
  }));
  expect(styles).toMatchObject({ size: "8px", button: "none", track: "rgba(0, 0, 0, 0)" });
  expect(parseFloat(styles.radius)).toBeGreaterThan(0);
  await page.mouse.move(700, 400); await page.mouse.wheel(0, 600);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
});
