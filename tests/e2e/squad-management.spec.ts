import { test, expect, expectNoHorizontalOverflow } from "./helpers";

test("incomplete squads can delete with a transfer reminder and explicit confirmation", async ({ page }, testInfo) => {
  await page.goto("/dev/classic-preview?view=squad");
  await page.getByRole("button", { name: "Xóa đội hình", exact: true }).click();
  const modal = page.getByRole("dialog");
  await expect(modal).toContainText("Bạn còn 1 lượt chuyển cầu thủ");
  await page.setViewportSize({ width: 1024, height: 600 });
  await expect(modal).toBeInViewport({ ratio: 1 });
  const submit = modal.getByRole("button", { name: "Xóa đội hình", exact: true });
  await expect(submit).toBeDisabled();
  await modal.getByRole("textbox", { name: "Nhập DELETE để xác nhận", exact: true }).fill("DELETE");
  await submit.click();
  await expect(page.locator("button[aria-busy=true]")).toHaveCount(1);
  await expect(modal.getByRole("alert")).toContainText("Bản xem trước");
  await page.screenshot({ path: `.hallmark/shots/delete-squad.png` });
  await modal.getByRole("button", { name: /Hủy|Huỷ/, exact: true }).click();
  await expect(modal).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  await page.goto("/dev/classic-preview?view=squad&used=1");
  await page.getByRole("button", { name: "Xóa đội hình", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toContainText("Bạn còn 1 lượt");
  await page.screenshot({ path: testInfo.outputPath("used-move-delete.png") });
});

test("retired player actions live in a compact management panel and the move form stays usable", async ({ page }) => {
  await page.goto("/dev/classic-interactions-preview?view=archive");
  await expect(page.locator(".football-career-dialog__management")).toHaveCount(0);
  await page.getByRole("button", { name: "Quản lý cầu thủ", exact: true }).click();
  let modal = page.getByRole("dialog");
  await expect(modal.getByRole("button", { name: /Chuyển sang đội hình khác/ })).toBeVisible();
  for (const width of [1024, 1280, 1920]) {
    await page.setViewportSize({ width, height: width === 1024 ? 600 : 900 });
    await expect(modal).toBeInViewport({ ratio: 1 });
    await page.screenshot({ path: `.hallmark/shots/player-management-${width}.png` });
  }
  await modal.getByRole("button", { name: /Chuyển sang đội hình khác/ }).click();
  await expect(modal).toContainText("Lượt chuyển duy nhất");
  await expect(modal.getByRole("button", { name: "Xác nhận chuyển", exact: true })).toBeDisabled();
  await modal.getByRole("combobox").click();
  await page.getByRole("option").first().click();
  await page.screenshot({ path: `.hallmark/shots/player-move-form.png` });
  await modal.getByRole("button", { name: "Xác nhận chuyển", exact: true }).click();
  await expect(page.locator("button[aria-busy=true]")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(modal).toBeVisible();
  await expect(modal.getByRole("alert")).toContainText("Bản xem trước");
  await modal.getByRole("button", { name: "Quay lại", exact: true }).click();
  await modal.getByRole("button", { name: /Thay cầu thủ/ }).click();
  await expect(modal).toContainText("Hồ sơ sự nghiệp");
  await modal.getByRole("button", { name: /Hủy|Huỷ/, exact: true }).click();
  await page.keyboard.press("Escape");
  modal = page.getByRole("dialog");
  await expect(modal.getByRole("button", { name: "Quản lý cầu thủ", exact: true })).toBeVisible();
});

test("occupied destination requires fresh explicit consent before deleting its named player", async ({ page }) => {
  await page.goto("/dev/classic-interactions-preview?view=archive");
  await page.getByRole("button", { name: "Quản lý cầu thủ", exact: true }).click();
  const modal = page.getByRole("dialog");
  await modal.getByRole("button", { name: /Chuyển sang đội hình khác/ }).click();
  await modal.getByRole("combobox").click();
  await page.getByRole("option").nth(1).click();
  await expect(modal).toContainText("Cầu thủ B và toàn bộ hồ sơ sự nghiệp sẽ bị xóa vĩnh viễn");
  const comparison = modal.locator(".football-move-comparison");
  await expect(comparison.locator("section")).toHaveCount(2);
  await expect(modal).not.toContainText("Chưa có đội hình khác có vị trí phù hợp");
  await expect(comparison.locator("section").first()).toContainText("Cầu thủ thử nghiệm 2");
  await expect(comparison.locator("section").last()).toContainText("Cầu thủ B");
  await expect(comparison.locator("section").last()).toContainText("88");
  await expect(comparison.locator("img")).toHaveCount(2);
  await expect(comparison.locator("video")).toHaveCount(0);
  const confirm = modal.getByRole("button", { name: "Xóa và chuyển", exact: true });
  const input = modal.getByRole("textbox", { name: "Nhập DELETE để xác nhận xóa Cầu thủ B", exact: true });
  await expect(confirm).toBeDisabled();
  for (const width of [1024, 1280, 1920]) {
    await page.setViewportSize({ width, height: width === 1024 ? 600 : 900 });
    await expect(modal).toBeInViewport({ ratio: 1 });
    await expect(confirm).toBeInViewport({ ratio: 1 });
    await modal.locator(".football-modal-body").evaluate((element) => { element.scrollTop = 0; });
    await page.screenshot({ path: `.hallmark/shots/player-replacement-${width}.png` });
  }
  await input.fill("delete"); await expect(confirm).toBeDisabled();
  await input.fill("DELETE"); await expect(confirm).toBeEnabled();
  await modal.getByRole("combobox").click(); await page.getByRole("option").first().click();
  await expect(input).toHaveCount(0);
  await modal.getByRole("combobox").click(); await page.getByRole("option").nth(1).click();
  await expect(input).toHaveValue(""); await expect(confirm).toBeDisabled();
  await input.fill("DELETE"); await confirm.click();
  await expect(page.locator("button[aria-busy=true]")).toHaveCount(1);
  await expect(modal.getByRole("alert")).toContainText("Bản xem trước");
  await modal.getByRole("button", { name: "Quay lại", exact: true }).click();
  await modal.getByRole("button", { name: /Chuyển sang đội hình khác/ }).click();
  await expect(modal.getByRole("button", { name: "Xác nhận chuyển", exact: true })).toBeDisabled();
});

test("readonly squad loading can be cancelled without a late response restoring the move form", async ({ page }) => {
  await page.goto("/dev/classic-interactions-preview?view=archive");
  await page.getByRole("button", { name: "Quản lý cầu thủ", exact: true }).click();
  const modal = page.getByRole("dialog");
  await modal.getByRole("button", { name: /Chuyển sang đội hình khác/ }).click();
  await expect(modal.getByRole("button", { name: "Quay lại", exact: true })).toBeEnabled();
  await modal.getByRole("button", { name: "Quay lại", exact: true }).click();
  await expect(modal.locator(".football-player-options")).toBeVisible();
  await expect(modal).not.toContainText("Đang tìm đội hình phù hợp");
  await expect(modal.getByRole("combobox")).toHaveCount(0);
});
