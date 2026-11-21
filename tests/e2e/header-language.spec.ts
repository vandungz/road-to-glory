import { test, expect, expectNoHorizontalOverflow } from "./helpers";
import { QUICK_MODE_STORAGE_KEY } from "../../features/quick-mode/lib/quick-mode-storage";

test("header language switch preserves the Quick form and career, and waits during spins", async ({ page }) => {
  await page.goto("/quick");
  const language = page.locator(".football-header-language");
  await expect(language).toHaveText("EN");
  await page.getByRole("textbox", { name: "Tên cầu thủ", exact: true }).fill("Header Language Test");
  await language.click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("textbox", { name: "Player name", exact: true })).toHaveValue("Header Language Test");
  await expect(language).toHaveText("VI");
  await page.getByRole("button", { name: "Start career", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Debut age", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Spin", exact: true }).click();
  await expect(language).toBeDisabled();
  await expect(page.getByRole("heading", { name: "Career length", exact: true })).toBeVisible();
  await expect(language).toBeEnabled();
  const before = await page.evaluate((key) => sessionStorage.getItem(key), QUICK_MODE_STORAGE_KEY);
  await language.click();
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  await expect(page.getByRole("heading", { name: "Độ dài sự nghiệp", exact: true })).toBeVisible();
  expect(await page.evaluate((key) => sessionStorage.getItem(key), QUICK_MODE_STORAGE_KEY)).toBe(before);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  await expect(page.getByRole("heading", { name: "Độ dài sự nghiệp", exact: true })).toBeVisible();
});

test("Classic header language preserves unsaved player details and the selected career tab", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 700 });
  await page.goto("/dev/classic-interactions-preview");
  await page.getByRole("textbox", { name: "Tên cầu thủ", exact: true }).fill("Unsaved Classic Player");
  await page.locator(".football-header-language").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("textbox", { name: "Player name", exact: true })).toHaveValue("Unsaved Classic Player");
  await expectNoHorizontalOverflow(page);
  await page.goto("/dev/career-workspace");
  await page.getByRole("tab", { name: "Contract", exact: true }).click();
  await page.locator(".football-header-language").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  await expect(page.getByRole("tab", { name: "Hợp đồng", exact: true })).toHaveAttribute("aria-selected", "true");
  await expectNoHorizontalOverflow(page);
  for (const width of [1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator(".football-header-language")).toBeInViewport({ ratio: 1 });
    await expectNoHorizontalOverflow(page);
  }
});

test("shared game headers expose one language switch on each feature page", async ({ page }) => {
  for (const path of ["/dev/classic-preview", "/dev/transfer-window-preview", "/settings", "/profile"]) {
    await page.goto(path);
    await expect(page.getByRole("banner").locator(".football-header-language")).toHaveCount(1);
    await expect(page.locator(".football-header-language")).toBeVisible();
  }
});

test("homepage header groups utilities and account actions with consistent geometry", async ({ page }, testInfo) => {
  await page.goto("/dev/design-preview?view=Home");
  const header = page.getByRole("banner");
  await expect(header.locator(".football-guide-help")).toHaveText("Hướng dẫn");
  for (const viewport of [{ width: 1024, height: 700 }, { width: 1280, height: 800 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    const controls = header.locator(".football-header-tools button, .football-header-account a, .football-header-account button");
    await expect(controls).toHaveCount(5);
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
