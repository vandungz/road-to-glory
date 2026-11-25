import { test, expect, expectNoHorizontalOverflow, startQuickRun } from "./helpers";

test("guest header is simplified and settings remain accessible", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1024, height: 600 });
  await page.goto("/");
  const account = page.getByRole("navigation", { name: "Tài khoản và cài đặt" });
  await expect(account).toHaveCount(0);
  await expect(page.getByRole("banner").getByRole("link", { name: "Cài đặt" })).toHaveCount(0);
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/settings#profile$/);
  await expect(page.getByRole("heading", { name: "Hồ sơ" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Đăng nhập", exact: true })).toHaveAttribute("href", "/login?next=/profile");
  await expect(page.getByRole("textbox", { name: "Tên hiển thị" })).toHaveCount(0);
  await expect(account).toHaveCount(0);
  await expect(page.getByRole("contentinfo")).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("profile-guest.png"), caret: "initial" });

  await page.getByRole("link", { name: "Trang chủ" }).click();
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Cài đặt" })).toHaveCount(0);
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Cài đặt" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Theo hệ thống" })).toHaveCount(0);
  await expect(page.getByRole("switch", { name: "Hiệu ứng âm thanh", exact: true })).toBeChecked();
  await expect(page.getByRole("contentinfo")).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("settings.png"), caret: "initial" });
});

test("audio settings sync across tabs while system reduced motion and the Quick run remain intact", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await startQuickRun(page);
  await expect(page.getByRole("navigation", { name: "Tài khoản và cài đặt" })).toHaveCount(0);
  const settings = await page.context().newPage();
  await settings.goto("/settings");
  const mute = settings.getByRole("switch", { name: "Tắt toàn bộ âm thanh", exact: true });
  await mute.focus();
  await settings.keyboard.press("Space");
  await expect(mute).toBeChecked();
  await page.getByRole("button", { name: "Âm thanh", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Âm thanh", exact: true }).getByRole("switch", { name: "Tắt toàn bộ âm thanh", exact: true })).toBeChecked();
  await page.keyboard.press("Escape");
  await settings.reload();
  await expect(mute).toBeChecked();
  await settings.close();
  await page.bringToFront();

  await expect(page.getByRole("heading", { name: "Tuổi ra mắt" })).toBeVisible();
  await page.getByRole("button", { name: "Quay vòng", exact: true }).click();
  await expect(page.getByRole("button", { name: "Đang quay…" })).toBeDisabled();
  await expect(page.locator(".football-spinner-wheel__disc")).toHaveCSS("transform", "none");
  await expect(page.getByRole("heading", { name: "Độ dài sự nghiệp" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Quay vòng", exact: true })).toBeEnabled();
});
