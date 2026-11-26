import { test, expect, expectNoHorizontalOverflow } from "./helpers";

test("cabinet preserves categories, keyboard tabs and close focus", async ({ page }) => {
  await page.goto("/dev/trophy-cabinet?few=1");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Tổng thành tích (2)")).toBeVisible();
  await expect(dialog.locator("img")).toHaveAttribute("src", /trophy-collection-v2\.webp(?:&|$)/);
  await expect(dialog.locator(".football-trophy-row")).toHaveCount(1);
  await expect.poll(() => dialog.locator("img").evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await dialog.getByRole("tab", { name: "Danh hiệu CLB" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(dialog.getByRole("tab", { name: "Danh hiệu cá nhân" })).toHaveAttribute("aria-selected", "true");
  await expect(dialog.getByRole("tabpanel")).toContainText("Ballon");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: "Open cabinet" }).click();
  await dialog.getByRole("button", { name: "Đóng tủ danh hiệu", exact: true }).last().click();
  await expect(page.getByRole("button", { name: "Open cabinet" })).toBeFocused();
});

test("long cabinet scrolls records while art, tabs and footer remain visible", async ({ page }) => {
  await page.goto("/dev/trophy-cabinet");
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".football-trophy-row")).toHaveCount(14);
  for (const viewport of [{ width: 1024, height: 600 }, { width: 1280, height: 800 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await expect.poll(() => dialog.evaluate((node) => node.getAnimations().every((animation) => animation.playState === "finished"))).toBe(true);
    const panel = dialog.getByRole("tabpanel");
    expect(await panel.evaluate((node) => node.scrollHeight > node.clientHeight)).toBe(true);
    await panel.evaluate((node) => { node.scrollTop = node.scrollHeight; });
    await expect(dialog.locator(".football-trophy-row").last()).toBeInViewport({ ratio: 1 });
    await expect(dialog.getByRole("tablist")).toBeInViewport({ ratio: 1 });
    await expect(dialog.getByRole("button", { name: "Đóng tủ danh hiệu", exact: true }).last()).toBeInViewport({ ratio: 1 });
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `.hallmark/shots/trophy-cabinet-${viewport.width}.png` });
  }
});

test("empty cabinet and English copy remain readable", async ({ page }) => {
  await page.goto("/dev/trophy-cabinet?empty=1");
  await expect(page.getByRole("dialog")).toContainText("Tổng thành tích (0)");
  await expect(page.getByRole("dialog").locator(".football-empty-state")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.goto("/settings?tab=language");
  await page.getByRole("radio", { name: "English", exact: true }).check();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.goto("/dev/trophy-cabinet?empty=1");
  await expect(page.getByRole("dialog")).toContainText("Total honours (0)");
  await expect(page.getByRole("dialog")).toContainText("No honours yet");
});
