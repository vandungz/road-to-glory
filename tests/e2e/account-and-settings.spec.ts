import { test, expect, expectNoHorizontalOverflow, startQuickRun } from "./helpers";

test("guest header is simplified and settings remain accessible", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1024, height: 600 });
  await page.goto("/");
  const account = page.getByRole("navigation", { name: "Tài khoản và cài đặt" });
  await expect(account).toHaveCount(0);
  await expect(page.getByRole("banner").getByRole("link", { name: "Cài đặt" })).toHaveCount(0);
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByRole("heading", { name: "Hồ sơ" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Đăng nhập", exact: true })).toHaveAttribute("href", "/login?next=/profile");
  await expect(page.getByRole("textbox", { name: "Tên hiển thị" })).toHaveCount(0);
  await expect(account).toHaveCount(0);
  await expect(page.getByRole("contentinfo")).toBeInViewport({ ratio: 1 });
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("profile-guest.png") });

  await page.getByRole("link", { name: "Trang chủ" }).click();
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Cài đặt" })).toHaveCount(0);
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Cài đặt" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Theo hệ thống" })).toBeChecked();
  await expect(page.getByRole("radio", { name: "Luôn giảm chuyển động" })).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole("contentinfo")).toBeInViewport({ ratio: 1 });
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("settings.png") });
});

test("settings in another tab reduce wheel motion and preserve the current Quick run", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await startQuickRun(page);
  await expect(page.getByRole("navigation", { name: "Tài khoản và cài đặt" })).toHaveCount(0);
  const settings = await page.context().newPage();
  await settings.goto("/settings");
  const reduce = settings.getByRole("radio", { name: "Luôn giảm chuyển động" });
  await reduce.focus();
  await settings.keyboard.press("Space");
  await expect(reduce).toBeChecked();
  await expect(settings.locator("html")).toHaveAttribute("data-game-reduced-motion", "");
  await expect(page.locator("html")).toHaveAttribute("data-game-reduced-motion", "");
  await settings.reload();
  await expect(reduce).toBeChecked();
  await settings.close();
  await page.bringToFront();

  await expect(page.getByRole("heading", { name: "Tuổi ra mắt" })).toBeVisible();
  await page.getByRole("button", { name: "Quay vòng", exact: true }).click();
  await expect(page.getByRole("button", { name: "Đang quay…" })).toBeDisabled();
  await expect(page.locator(".football-spinner-wheel__disc")).toHaveCSS("transform", "none");
  await expect(page.getByRole("heading", { name: "Độ dài sự nghiệp" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Quay vòng", exact: true })).toBeEnabled();
});
