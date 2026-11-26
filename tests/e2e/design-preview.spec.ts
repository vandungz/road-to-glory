import { test, expect, expectNoHorizontalOverflow } from "./helpers";
import { NATIONALITY_POOL } from "../../lib/wheel-engine/weight-pools";

test("squad profile keeps keyboard focus inside the dialog and restores it", async ({ page }, testInfo) => {
  await page.goto("/dev/design-preview");
  const trigger = page.getByRole("button", { name: "Mở hồ sơ Cầu thủ thử nghiệm tên dài Nguyễn", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Hồ sơ sự nghiệp của Cầu thủ thử nghiệm tên dài Nguyễn" });
  await expect(dialog).toBeVisible();
  await expect.poll(() => dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await expect(dialog.getByRole("button", { name: /Xóa|Thay cầu thủ/ })).toHaveCount(0);
  await page.setViewportSize({ width: 1024, height: 800 });
  const cardSize = await dialog.locator(".football-player-sticker").evaluate((card) => ({ height: card.clientHeight, content: card.scrollHeight }));
  expect(cardSize.content).toBeLessThanOrEqual(cardSize.height + 1);
  await page.keyboard.press("Shift+Tab");
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Tab");
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("player-profile.png"), fullPage: true });
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("shop states render and a failed purchase remains recoverable without writes", async ({ page }, testInfo) => {
  const mutations: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") mutations.push(request.url());
  });
  await page.goto("/dev/design-preview");
  await page.getByRole("tab", { name: "Cửa hàng", exact: true }).click();
  const trigger = page.getByRole("button", { name: "Mở cửa hàng thử nghiệm" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Cửa hàng", exact: true });
  await expect(dialog).toBeVisible();
  for (const viewport of [{ width: 1024, height: 768 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    await expect.poll(() => dialog.evaluate((node) => node.getAnimations().every((animation) => animation.playState === "finished"))).toBe(true);
    const layout = await dialog.evaluate((node) => {
      const body = node.querySelector(".football-shop-content__body")!;
      const footer = node.querySelector(".football-shop-content__footer")!;
      const bounds = node.getBoundingClientRect();
      return { gap: footer.getBoundingClientRect().top - body.getBoundingClientRect().bottom, inset: body.getBoundingClientRect().left - bounds.left, bottom: footer.getBoundingClientRect().bottom, overflow: getComputedStyle(body).overflowY };
    });
    expect(layout.gap).toBeGreaterThanOrEqual(0);
    expect(layout.inset).toBeGreaterThanOrEqual(24);
    expect(layout.bottom).toBeLessThanOrEqual(viewport.height);
    expect(layout.overflow).toMatch(/auto|scroll/);
  }
  const buy = dialog.getByRole("button", { name: "Mua", exact: true }).first();
  await buy.scrollIntoViewIfNeeded();
  const before = await buy.boundingBox();
  await buy.click();
  await expect(buy).toHaveAttribute("aria-busy", "true");
  await expect(buy).toBeDisabled();
  await expect(buy.locator(".football-button__pending")).toBeVisible();
  const pending = await buy.boundingBox();
  expect(pending?.width).toBe(before?.width);
  expect(pending?.height).toBe(before?.height);
  await expect(dialog.getByRole("alert")).toHaveText("Giao dịch thất bại");
  await expect(dialog.getByRole("button", { name: "Mua", exact: true }).first()).toBeEnabled();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("shop-error.png"), fullPage: true });
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(mutations).toEqual([]);
});

test("a hidden modal releases the mobile notice and retains its state on desktop", async ({ page }) => {
  await page.goto("/dev/design-preview");
  await page.getByRole("button", { name: "Mở hồ sơ Cầu thủ thử nghiệm tên dài Nguyễn", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(dialog).toBeHidden();
  const home = page.locator(".football-desktop-notice").getByRole("link");
  await home.focus();
  await page.keyboard.press("Escape");
  await expect(home).toBeFocused();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Tab");
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("national player cards preserve identity and render across desktop sizes", async ({ page }, testInfo) => {
  await page.goto("/dev/design-preview");
  await page.getByRole("tab", { name: "Thẻ cầu thủ", exact: true }).click();
  await expect(page.locator(".football-panini-sticker")).toHaveCount(11);
  await expect(page.locator(".football-player-sticker")).toHaveCount(11);
  for (const width of [1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await expectNoHorizontalOverflow(page);
    const paniniOvr = page.locator(".football-panini-sticker__ovr").first();
    await expect(paniniOvr).toBeVisible();
    await expect(paniniOvr.locator("strong")).toHaveText(/^[0-9]+$/);
    const archivePortrait = page.locator(".football-player-sticker__portrait").first();
    const number = (await archivePortrait.locator("strong").boundingBox())!;
    const label = (await archivePortrait.locator("small").boundingBox())!;
    expect(label.y).toBeGreaterThanOrEqual(number.y + number.height);
  }
  const themes = await page.locator(".football-panini-sticker").first().evaluate((card, countries) => {
    const original = card.getAttribute("data-nation")!;
    const colors = countries.map((country) => {
      card.setAttribute("data-nation", country.replace(/\s+/g, ""));
      return getComputedStyle(card).getPropertyValue("--nation-primary").trim();
    });
    card.setAttribute("data-nation", original);
    return colors;
  }, NATIONALITY_POOL.map((item) => item.value));
  expect(themes.every((color) => color && color !== "#B9361C")).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: testInfo.outputPath("national-player-cards.png"), fullPage: true });
});

test("squad completion action remains readable at every desktop width", async ({ page }) => {
  await page.goto("/dev/design-preview");
  const button = page.getByRole("button", { name: "Chốt đội hình", exact: true });
  for (const width of [1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    const box = await button.boundingBox();
    await expect(button).toBeInViewport();
    expect(await button.evaluate((element) => element.scrollWidth)).toBeLessThanOrEqual(Math.ceil(box!.width));
    expect(box!.height).toBeLessThanOrEqual(64);
    await expectNoHorizontalOverflow(page);
  }
});

test("PvE populated and empty states preserve their links", async ({ page }, testInfo) => {
  await page.goto("/dev/design-preview");
  await page.getByRole("tab", { name: "PvE", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Chọn đội hình dự giải" })).toBeVisible();
  await expect(page.locator(".football-pve-lobby__session")).toHaveCount(2);
  await expect(page.locator(".football-pve-lobby__session").first()).toHaveAttribute("href", "/pve/design-preview-unstarted");
  await page.screenshot({ path: testInfo.outputPath("pve-lobby.png"), fullPage: true });
  await page.getByRole("button", { name: "Hiện trạng thái trống" }).click();
  await expect(page.getByRole("heading", { name: "Chưa có đội hình đủ điều kiện" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Mở Classic" })).toHaveAttribute("href", "/classic");
});

test("transfer negotiation retains selection, completion callback and skip action", async ({ page }, testInfo) => {
  await page.goto("/dev/transfer-window-preview");
  await page.getByRole("button", { name: "Lời đề nghị 2" }).click();
  await page.getByRole("button", { name: "Đàm phán với Brighton" }).click();
  await expect(page.getByRole("button", { name: "Gửi đề nghị lương" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("transfer-negotiation.png"), fullPage: true });
  await page.getByRole("button", { name: "Gửi đề nghị lương" }).click();
  await expect(page.getByText("Last action: Offer transfer: Brighton", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Bỏ qua.*ở lại CLB/ }).click();
  await expect(page.getByText("Last action: Reject all / stay", { exact: true })).toBeVisible();
});

test("retirement keeps its save callback and national card readable", async ({ page }, testInfo) => {
  await page.goto("/dev/design-preview");
  await page.getByRole("tab", { name: "Giải nghệ", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Hành trình sự nghiệp" })).toBeVisible();
  await page.getByRole("button", { name: "Lưu thẻ vào Hall of Fame" }).click();
  await expect(page.getByRole("status")).toHaveText("Đã kiểm tra nút lưu. Không ghi dữ liệu thử nghiệm.");
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("retirement.png"), fullPage: true });
});
