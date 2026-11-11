import { test, expect, expectNoHorizontalOverflow } from "./helpers";

for (const width of [1024, 1280, 1440, 1920]) {
  test(`desktop ${width}px keeps entry points visible and fits the canvas`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: width === 1024 ? 600 : 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Hôm nay bạn chơi gì?" })).toBeVisible();
    const quickMode = page.getByRole("link", { name: "Chơi Quick Mode", exact: true });
    await expect(quickMode).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole("link", { name: "Vào giải đấu", exact: true })).toBeInViewport({ ratio: 1 });
    await expect(page.getByText("Football Life © Road to Glory — mùa 2025/26", { exact: true })).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole("link", { name: "Road to Glory", exact: true })).toHaveAttribute("href", "/");
    await expect(page.getByRole("button", { name: "Chạy lại chuyển động" })).toHaveCount(0);
    const main = page.getByRole("main");
    expect(await main.evaluate((element) => element.scrollHeight - element.clientHeight)).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(page.viewportSize()!.height);
    await expect(page.locator(".football-desktop-notice")).toBeHidden();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`home-${width}.png`), fullPage: true });
    await quickMode.click();
    await expect(page).toHaveURL(/\/quick$/);
    await expect(page.getByRole("textbox", { name: "Tên cầu thủ" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
}

test("home with an active squad fits a short desktop and keeps account actions", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1024, height: 600 });
  await page.goto("/dev/design-preview?view=Home");
  await expect(page.getByRole("button", { name: "Tiếp tục Đội hình thử nghiệm 1" })).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole("link", { name: "Tất cả đội hình" })).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole("button", { name: "Đăng xuất" })).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole("link", { name: "Vào giải đấu" })).toBeInViewport({ ratio: 1 });
  await expect(page.getByText("Football Life © Road to Glory — mùa 2025/26", { exact: true })).toBeInViewport({ ratio: 1 });
  expect(await page.getByRole("main").evaluate((element) => element.scrollHeight - element.clientHeight)).toBeLessThanOrEqual(1);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("home-active-1024.png") });
});

for (const route of ["/", "/quick", "/quick/play", "/login", "/auth/reset-password", "/classic", "/pve"]) {
  test(`narrow screen gates direct navigation to ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route);
    await expect(page.getByRole("heading", { name: "Hãy mở game trên máy tính" })).toBeVisible();
    await expect(page.locator(".football-desktop-content")).toBeHidden();
    await expectNoHorizontalOverflow(page);
  });
}

test("1023px is gated, 1024px restores the same form draft", async ({ page }) => {
  await page.goto("/quick");
  const name = page.getByRole("textbox", { name: "Tên cầu thủ" });
  await name.fill("Giữ nguyên bản nháp");
  await page.setViewportSize({ width: 1023, height: 768 });
  await expect(page.getByRole("heading", { name: "Hãy mở game trên máy tính" })).toBeVisible();
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(name).toBeVisible();
  await expect(name).toHaveValue("Giữ nguyên bản nháp");
});

test("entry and mobile notice stay visible with JavaScript disabled", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Hôm nay bạn chơi gì?" })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("heading", { name: "Hãy mở game trên máy tính" })).toBeVisible();
  await context.close();
});

test("protected routes retain the login boundary", async ({ page }) => {
  await page.goto("/classic");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("textbox").first()).toBeVisible();
});
