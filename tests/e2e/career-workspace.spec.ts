import { test, expect, expectNoHorizontalOverflow } from "./helpers";

async function settleDialog(dialog: import("@playwright/test").Locator) {
  await expect(dialog).toBeVisible();
  await expect.poll(() => dialog.evaluate((node) => node.getAnimations().every((animation) => animation.playState === "finished"))).toBe(true);
}

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

test("competition dialogs are wide and retain result details and continuation", async ({ page }, testInfo) => {
  for (const cup of [false, true]) {
    await page.goto(`/dev/career-workspace${cup ? "?step=cup" : ""}`);
    await page.getByRole("button", { name: "Quay bánh xe", exact: true }).click();
    const dialog = page.getByRole("dialog");
    expect((await dialog.boundingBox())!.width).toBeGreaterThanOrEqual(800);
    await expect(dialog.getByText(cup ? "Hành trình" : "Bảng xếp hạng", { exact: true })).toBeVisible();
    if (!cup) await expect(dialog.locator(".football-season-result__rank-row")).toHaveCount(20);
    else await page.screenshot({ path: testInfo.outputPath("domestic-cup.png") });
    await dialog.getByRole("button", { name: "Tiếp tục hành trình", exact: true }).click();
    await expect(dialog).toBeHidden();
  }
});

test("archived competition results keep the media and stats visible while only the table scrolls", async ({ page }, testInfo) => {
  for (const viewport of [{ width: 1024, height: 600 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/dev/career-workspace");
    await page.getByRole("tab", { name: "Mùa giải", exact: true }).click();
    await page.getByRole("combobox", { name: "Chọn mùa giải" }).click();
    await page.getByRole("option", { name: /Tuổi 34/ }).click();

    await page.getByRole("button", { name: /FIFA World Cup/ }).click();
    const national = page.getByRole("dialog", { name: "FIFA World Cup" });
    await expect(national.getByText("England", { exact: true })).toBeVisible();
    await expect(national.getByText("Brighton & Hove Albion")).toHaveCount(0);
    await expect(national.getByText("Vòng bảng: hòa 1–1 trước Pháp")).toBeVisible();
    await expect(national.getByText("7.87")).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`national-${viewport.width}.png`) });
    await national.getByRole("button", { name: "Đóng", exact: true }).click();

    await page.getByRole("button", { name: /UEFA Champions League/ }).click();
    const continental = page.getByRole("dialog", { name: "UEFA Champions League" });
    await expect(continental.getByText("Tứ kết: thua 0–1")).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`continental-${viewport.width}.png`) });
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: /Premier League.*Hạng|Premier League.*Top/ }).click();
    const league = page.getByRole("dialog", { name: "Premier League" });
    const table = league.getByRole("region", { name: "Bảng xếp hạng" });
    const summary = league.getByRole("region", { name: "Kết quả và thống kê" });
    const media = summary.locator(".football-editorial-art");
    const footer = league.locator(".football-modal-footer");
    await expect(media).toHaveJSProperty("complete", true);
    await settleDialog(league);
    const artBefore = (await media.boundingBox())!;
    const statsBefore = (await summary.locator("dl").boundingBox())!;
    const footerBefore = (await footer.boundingBox())!;
    expect(artBefore.height).toBeGreaterThan(160);
    expect(statsBefore.y + statsBefore.height).toBeLessThanOrEqual(footerBefore.y);
    await table.focus();
    await page.keyboard.press("End");
    await expect.poll(() => table.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
    expect(await media.boundingBox()).toEqual(artBefore);
    expect(await summary.locator("dl").boundingBox()).toEqual(statsBefore);
    expect(await footer.boundingBox()).toEqual(footerBefore);
    expect(await league.locator(".football-season-result__body").evaluate((node) => node.scrollTop)).toBe(0);
    await page.screenshot({ path: testInfo.outputPath(`league-${viewport.width}.png`) });
    await page.keyboard.press("Escape");
  }
});

test("recap scrolls only its information column while the whole artwork stays still", async ({ page }, testInfo) => {
  for (const viewport of [{ width: 1024, height: 768 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/dev/career-workspace");
    await page.getByRole("button", { name: /Tủ danh hiệu/ }).last().click();
    const dialog = page.getByRole("dialog");
    const art = dialog.locator(".football-editorial-art");
    await settleDialog(dialog);
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

test("Ballon d’Or nomination shows its odds and gives each outcome a direct next action", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1024, height: 600 });
  for (const { step, chance, result, action, next } of [
    { step: "ballon-no", chance: 1, result: "Chưa được đề cử năm này", action: "Tiếp tục phát triển chỉ số", next: /Tăng trưởng chỉ số/i },
    { step: "ballon-yes", chance: 40, result: "Được đề cử Top 10", action: "Sang vòng xếp hạng", next: /Xếp hạng Ballon/ },
  ]) {
    await page.goto(`/dev/career-workspace?step=${step}`);
    await expect(page.getByText(`Cơ hội vào top 10: ${chance}%`)).toBeVisible();
    await page.getByRole("button", { name: "Quay vòng danh hiệu" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText(result, { exact: true })).toBeVisible();
    const trophy = dialog.locator(".football-ballon-nomination__art");
    if (step === "ballon-yes") {
      await expect.poll(() => trophy.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(640);
      expect((await trophy.boundingBox())!.height).toBeGreaterThanOrEqual(230);
    } else {
      await expect(trophy).toHaveCount(0);
      const box = (await dialog.boundingBox())!;
      expect(box.width).toBeLessThanOrEqual(420);
      expect(box.height).toBeLessThan(240);
    }
    await expect(dialog.getByRole("button", { name: action })).toBeInViewport({ ratio: 1 });
    await page.screenshot({ path: testInfo.outputPath(`${step}.png`), animations: "disabled" });
    await dialog.getByRole("button", { name: action }).click();
    await expect(page.getByRole("heading", { name: next })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }
});
