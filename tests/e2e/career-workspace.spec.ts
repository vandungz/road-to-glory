import { test, expect, expectNoHorizontalOverflow } from "./helpers";

test("career fills the viewport without a phase strip and club history scrolls independently", async ({ page }, testInfo) => {
  for (const viewport of [{ width: 1024, height: 768 }, { width: 1280, height: 720 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    for (const many of [false, true]) {
      await page.goto(`/dev/career-workspace?clubs=${many ? "many" : "one"}`);
      await expect(page.locator(".football-season-strip")).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(viewport.height + 1);
      const main = (await page.locator(".football-dashboard__grid").boundingBox())!;
      expect(viewport.height - main.y - main.height).toBeLessThanOrEqual(20);
      const summary = page.locator(".football-story-rail__summary");
      expect(await summary.evaluate((node) => parseFloat(getComputedStyle(node).paddingTop))).toBeGreaterThanOrEqual(16);
      const sticker = page.locator(".football-panini-sticker");
      const strip = sticker.locator(".football-panini-sticker__stats");
      await strip.scrollIntoViewIfNeeded();
      const stickerBox = (await sticker.boundingBox())!;
      const stripBox = (await strip.boundingBox())!;
      expect(stripBox.y + stripBox.height).toBeLessThanOrEqual(stickerBox.y + stickerBox.height + 1);
      await expect(strip.locator("strong")).toHaveCount(6);
      const clubs = page.getByRole("region", { name: "Các câu lạc bộ trong sự nghiệp", exact: true });
      if (many) {
        const header = (await page.locator(".football-story-rail__header").boundingBox())!;
        await clubs.focus();
        await page.keyboard.press("End");
        await expect.poll(() => clubs.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
        expect((await page.locator(".football-story-rail__header").boundingBox())!.y).toBe(header.y);
        expect(await page.evaluate(() => scrollY)).toBe(0);
      }
      const action = (await page.getByRole("button", { name: "Quay bánh xe", exact: true }).boundingBox())!;
      expect(action.y + action.height).toBeLessThanOrEqual(viewport.height);
      await expectNoHorizontalOverflow(page);
    }
    await page.screenshot({ path: testInfo.outputPath(`career-${viewport.width}.png`), fullPage: true });
  }
});

test("competition dialogs are wide and retain result details and continuation", async ({ page }) => {
  for (const cup of [false, true]) {
    await page.goto(`/dev/career-workspace${cup ? "?step=cup" : ""}`);
    await page.getByRole("button", { name: "Quay bánh xe", exact: true }).click();
    const dialog = page.getByRole("dialog");
    expect((await dialog.boundingBox())!.width).toBeGreaterThanOrEqual(800);
    await expect(dialog.getByText(cup ? "Hành trình" : "Bảng xếp hạng", { exact: true })).toBeVisible();
    if (!cup) await expect(dialog.locator(".football-mini-table__row")).toHaveCount(20);
    await dialog.getByRole("button", { name: "Tiếp tục hành trình", exact: true }).click();
    await expect(dialog).toBeHidden();
  }
});

test("recap scrolls only its information column while the whole artwork stays still", async ({ page }, testInfo) => {
  for (const viewport of [{ width: 1024, height: 768 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/dev/career-workspace");
    await page.getByRole("button", { name: /Tủ danh hiệu/ }).last().click();
    const dialog = page.getByRole("dialog");
    const art = dialog.locator(".football-editorial-art");
    const before = (await art.boundingBox())!;
    const info = dialog.locator(".football-modal-body");
    await info.evaluate((node) => { node.scrollTop = node.scrollHeight; });
    expect((await art.boundingBox())!.y).toBe(before.y);
    expect((await art.boundingBox())!.height).toBe(before.height);
    expect(await dialog.locator(".football-season-close__layout").evaluate((node) => node.scrollTop)).toBe(0);
    await expect(info).toHaveCSS("overflow-y", "auto");
    const header = (await dialog.locator(".football-modal-header").boundingBox())!;
    const footer = (await dialog.locator(".football-modal-footer").boundingBox())!;
    expect(before.y).toBeGreaterThanOrEqual(header.y + header.height);
    expect(before.y + before.height).toBeLessThanOrEqual(footer.y + 1);
    await page.screenshot({ path: testInfo.outputPath(`recap-scroll-${viewport.width}.png`), fullPage: true });
    await page.keyboard.press("Escape");
  }
});

test("transfer stays in one viewport with scrollable offer/search lists and unchanged negotiation", async ({ page }, testInfo) => {
  for (const viewport of [{ width: 1024, height: 768 }, { width: 1280, height: 720 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/dev/transfer-window-preview");
    await page.getByRole("button", { name: "Lời đề nghị 2" }).click();
    const offers = page.getByRole("region", { name: "Danh sách lời đề nghị", exact: true });
    expect((await offers.locator(".football-transfer-offer").first().boundingBox())!.height).toBeLessThan(220);
    await expect(offers).toHaveCSS("overflow-y", "auto");
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(viewport.height + 1);
    await offers.getByRole("button", { name: "Đàm phán với Brighton" }).click();
    await expect(page.getByRole("button", { name: "Gửi đề nghị lương" })).toBeVisible();
    await page.getByRole("button", { name: /Danh sách đề nghị/ }).click();
    await page.getByRole("button", { name: /Tìm CLB chủ động/ }).click();
    const search = page.getByRole("region", { name: "Danh sách CLB tìm kiếm", exact: true });
    await expect(search).toHaveCSS("overflow-y", "auto");
    expect((await search.boundingBox())!.height).toBeGreaterThanOrEqual(160);
    await expect(search.locator(".football-transfer-club-row")).toHaveCount(2);
    await expect(page.getByPlaceholder("Tìm theo tên CLB...")).toBeVisible();
    await expect(page.getByPlaceholder("Tìm theo tên CLB...")).toHaveCSS("border-top-width", "0px");
    await expectNoHorizontalOverflow(page);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(viewport.height + 1);
    await page.screenshot({ path: testInfo.outputPath(`transfer-${viewport.width}.png`), fullPage: true });
  }
});
