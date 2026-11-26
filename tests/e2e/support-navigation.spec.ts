import { test, expect, expectNoHorizontalOverflow } from "./helpers";

const url = "https://ko-fi.com/justinnguyen29";
test("settings Information groups policies and support without overflowing", async ({ page }, testInfo) => {
  await page.goto("/settings?tab=information");
  await expect(page.getByRole("tab", { name: "Thông tin", exact: true })).toHaveAttribute("aria-selected", "true");
  const panel = page.getByRole("tabpanel");
  await expect(panel.getByRole("link", { name: "Chính sách bảo mật", exact: true })).toHaveAttribute("href", "/privacy");
  await expect(panel.getByRole("link", { name: "Điều khoản sử dụng", exact: true })).toHaveAttribute("href", "/terms");
  for (const width of [1024, 1280, 1920]) {
    await page.setViewportSize({ width, height: width === 1024 ? 600 : 800 });
    await expect(panel).toBeInViewport({ ratio: 1 });
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `.hallmark/shots/settings-information-${width}.png` });
  }
  await page.getByRole("tab", { name: "Thông tin", exact: true }).focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("tab", { name: "Hồ sơ", exact: true })).toBeFocused();
  await page.goBack();
  await expect(page.getByRole("tab", { name: "Thông tin", exact: true })).toHaveAttribute("aria-selected", "true");
  await panel.getByRole("link", { name: "Chính sách bảo mật", exact: true }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await page.screenshot({ path: testInfo.outputPath("privacy-navigation.png") });
});

test("support remains in headers and is absent from footers without embedding payment scripts", async ({ page }) => {
  const externalRequests: string[] = [];
  page.on("request", (request) => { if (request.url().includes("ko-fi.com")) externalRequests.push(request.url()); });
  for (const route of ["/", "/en", "/dev/design-preview?view=Home", "/dev/career-workspace", "/dev/transfer-window-preview", "/settings?tab=information", "/terms"]) {
    await page.goto(route);
    const heart = page.locator("header a.football-support-link").first();
    await expect(heart).toBeVisible();
    await expect(heart).toHaveAttribute("href", url);
    await expect(heart).toHaveAttribute("target", "_blank");
    await expect(heart).toHaveAttribute("rel", "noopener noreferrer");
    await expect(heart).toHaveAccessibleName(/Ko-fi/);
    await heart.focus();
    await expect(heart).toBeFocused();
    await expect(page.locator("footer a.football-support-link")).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  }
  expect(externalRequests).toEqual([]);
  await page.goto("/");
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await expectNoHorizontalOverflow(page);
    await expect(page.locator("header a.football-support-link")).toBeVisible();
  }
});
