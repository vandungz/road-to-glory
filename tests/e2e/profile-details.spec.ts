import { test, expect, expectNoHorizontalOverflow } from "./helpers";
import { guides, guideStorageKey } from "../../features/onboarding/guides";

test.beforeEach(async ({ page }) => {
  await page.addInitScript((keys) => { for (const key of keys) localStorage.setItem(key, "seen"); }, Object.keys(guides).map((id) => guideStorageKey(id as keyof typeof guides)));
});

test("profile rows, game avatars and Google connection status fit supported screens", async ({ page }, testInfo) => {
  await page.goto("/dev/settings-preview");
  await expect(page.getByText("player@example.invalid", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Liên kết Google", exact: true })).toBeVisible();
  for (const viewport of [{ width: 1024, height: 600 }, { width: 1280, height: 800 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await expect(page.locator(".football-profile-row").last()).toBeInViewport({ ratio: 1 });
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`profile-${viewport.width}.png`), caret: "initial" });
  }
  await page.getByRole("button", { name: "Đổi ảnh đại diện", exact: true }).click();
  const modal = page.getByRole("dialog", { name: "Đổi ảnh đại diện", exact: true });
  await expect(modal.getByRole("radio")).toHaveCount(4);
  await expect(modal).toHaveCSS("opacity", "1");
  await page.screenshot({ path: testInfo.outputPath("avatar-picker.png"), caret: "initial" });
  await modal.getByRole("radio", { name: "Nhạc trưởng", exact: true }).focus();
  await page.keyboard.press("Space");
  await expect(modal.getByRole("radio", { name: "Nhạc trưởng", exact: true })).toBeChecked();
  await modal.getByRole("button", { name: "Lưu ảnh đại diện", exact: true }).click();
  await expect(modal).toHaveCount(0);
  await expect(page.locator(".football-profile-identity img")).toHaveAttribute("src", /\/media\/avatars\/playmaker-v1\.webp$/);
  await page.screenshot({ path: testInfo.outputPath("profile-selected.png"), caret: "initial" });
  await page.getByRole("button", { name: "Đổi tên", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Đổi tên", exact: true }).getByRole("textbox", { name: "Tên hiển thị", exact: true })).toHaveValue("Minh An");
  await page.keyboard.press("Escape");
  await page.goto("/dev/settings-preview?connected=1");
  await expect(page.getByText("google@example.invalid", { exact: true })).toBeVisible();
  await expect(page.getByText("Đã liên kết", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Liên kết Google", exact: true })).toHaveCount(0);
});

test("delete focus rings have clearance and pending state belongs to the active button only", async ({ page }, testInfo) => {
  await page.goto("/dev/settings-preview?tab=security");
  await page.getByRole("button", { name: "Xóa tài khoản", exact: true }).click();
  const modal = page.getByRole("dialog", { name: "Xóa tài khoản", exact: true });
  await expect(modal).toHaveCSS("opacity", "1");
  const password = modal.getByLabel("Mật khẩu hiện tại", { exact: true });
  await password.fill("dummy-not-submitted"); await password.focus();
  const clearance = await password.evaluate((input) => {
    const label = input.closest("label")!.querySelector("span")!.getBoundingClientRect();
    const box = input.getBoundingClientRect(); const css = getComputedStyle(input);
    return box.top - label.bottom - parseFloat(css.outlineWidth) - parseFloat(css.outlineOffset);
  });
  expect(clearance).toBeGreaterThanOrEqual(6);
  await page.screenshot({ path: testInfo.outputPath("delete-focus.png"), caret: "initial" });
  await modal.getByRole("textbox", { name: "Nhập DELETE để xác nhận", exact: true }).fill("DELETE");
  await modal.getByRole("button", { name: "Xóa tài khoản", exact: true }).click();
  await expect(page.locator("button[aria-busy='true']")).toHaveCount(1);
  await expect(page.locator(".football-password-form button")).not.toHaveAttribute("aria-busy", "true");
  await expect(modal.getByRole("alert")).toContainText("Bản xem trước");
  await modal.getByRole("button", { name: "Hủy", exact: true }).click();
  const form = page.locator(".football-password-form");
  await form.getByLabel("Mật khẩu hiện tại", { exact: true }).fill("dummy-old-password");
  await form.getByLabel("Mật khẩu mới (ít nhất 8 ký tự)", { exact: true }).fill("dummy-new-password");
  await form.getByLabel("Nhập lại mật khẩu mới", { exact: true }).fill("dummy-new-password");
  await form.getByRole("button", { name: "Đổi mật khẩu", exact: true }).click();
  await expect(page.locator("button[aria-busy='true']")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Xóa tài khoản", exact: true })).toBeDisabled();
  await expect(form.getByRole("status")).toContainText("Bản xem trước");
});
