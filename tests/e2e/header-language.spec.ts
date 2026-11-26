import { test, expect, expectNoHorizontalOverflow, startQuickRun } from "./helpers";
import { QUICK_MODE_STORAGE_KEY } from "../../features/quick-mode/lib/quick-mode-storage";

test("language is configured in Settings and preserves the Quick run", async ({ page }) => {
  await startQuickRun(page);
  await expect(page.locator(".football-header-language")).toHaveCount(0);
  const before = await page.evaluate((key) => sessionStorage.getItem(key), QUICK_MODE_STORAGE_KEY);
  await page.goto("/settings?tab=language");
  await page.getByRole("radio", { name: "English", exact: true }).check();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.goto("/quick/play");
  await expect(page.getByRole("heading", { name: "Debut age", exact: true })).toBeVisible();
  expect(await page.evaluate((key) => sessionStorage.getItem(key), QUICK_MODE_STORAGE_KEY)).toBe(before);
});

test("gameplay headers omit language controls and Help has no clipped tooltip", async ({ page }) => {
  for (const path of ["/dev/career-workspace", "/dev/classic-interactions-preview", "/dev/classic-preview", "/settings"]) {
    await page.goto(path);
    await expect(page.getByRole("banner").locator(".football-header-language")).toHaveCount(0);
    const help = page.getByRole("button", { name: "Hướng dẫn trang này", exact: true });
    await help.hover();
    await expect(page.getByRole("tooltip")).toHaveCount(0);
  }
});

test("homepage header groups utilities and account actions with consistent geometry", async ({ page }, testInfo) => {
  await page.goto("/dev/design-preview?view=Home");
  const header = page.getByRole("banner");
  await expect(header.locator(".football-guide-help")).toHaveText("Hướng dẫn");
  for (const viewport of [{ width: 1024, height: 700 }, { width: 1280, height: 800 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    const controls = header.locator(".football-header-tools button, .football-header-tools > a, .football-header-account a, .football-header-account button");
    await expect(controls).toHaveCount(6);
    await expect(header.getByRole("button", { name: "Âm thanh", exact: true })).toBeVisible();
    const boxes = await controls.evaluateAll((elements) => elements.map((element) => {
      const box = element.getBoundingClientRect();
      return { height: box.height, centre: box.y + box.height / 2 };
    }));
    for (const box of boxes) {
      expect(box.height).toBe(40);
      expect(Math.abs(box.centre - boxes[0].centre)).toBeLessThanOrEqual(1);
    }
    await expect(header.locator(".football-header-language")).toHaveCSS("border-top-width", "0px");
    await expectNoHorizontalOverflow(page);
  }
  await header.getByRole("button", { name: "Hướng dẫn trang này", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Giới thiệu & hướng dẫn", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await header.locator(".football-header-language").click();
  await expect(header.locator(".football-guide-help")).toHaveText("Help");
  await page.screenshot({ path: testInfo.outputPath("header-home-en.png") });
});
