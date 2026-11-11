import { test, expect, expectNoHorizontalOverflow } from "./helpers";

test("Classic fits the viewport and scrolls only the other-squad rows", async ({ page }, testInfo) => {
  for (const viewport of [{ width: 1024, height: 600 }, { width: 1280, height: 720 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/dev/classic-preview");
    const archive = page.getByRole("region", { name: "Danh sách đội hình khác", exact: true });
    await expect(archive).toBeVisible();
    await expect(page.getByRole("banner").getByRole("link", { name: "Về chọn chế độ" })).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeInViewport({ ratio: 1 });
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(viewport.height + 1);
    await expectNoHorizontalOverflow(page);
    const active = (await page.locator(".football-classic-lobby__active").boundingBox())!;
    const art = (await page.locator(".football-editorial-art").boundingBox())!;
    const overflow = await archive.evaluate((node) => node.scrollHeight - node.clientHeight);
    if (overflow > 1) {
      await archive.focus();
      await page.keyboard.press("End");
      await expect.poll(() => archive.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
      expect((await page.locator(".football-classic-lobby__active").boundingBox())!.y).toBe(active.y);
      expect((await page.locator(".football-editorial-art").boundingBox())!.y).toBe(art.y);
      expect(await page.evaluate(() => scrollY)).toBe(0);
    }
    const last = archive.getByRole("link").last();
    await last.focus();
    const row = (await last.boundingBox())!;
    const region = (await archive.boundingBox())!;
    expect(row.y + row.height).toBeLessThanOrEqual(region.y + region.height + 1);
    await page.screenshot({ path: testInfo.outputPath(`classic-${viewport.width}.png`), fullPage: true });
  }
});

test("squad board keeps the full pitch, footer and actions visible when the lineup scrolls", async ({ page }, testInfo) => {
  for (const viewport of [{ width: 1024, height: 600 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    for (const view of ["squad", "complete"]) {
      await page.goto(`/dev/classic-preview?view=${view}`);
      const pitch = page.getByRole("region", { name: "Sân đấu chiến thuật" });
      const lineup = page.getByRole("region", { name: "Danh sách cầu thủ xuất phát" });
      const action = view === "squad"
        ? page.getByRole("button", { name: "Tiếp tục draft GK", exact: true })
        : page.getByRole("link", { name: "Vào giải PvE" });
      await expect(page.getByRole("banner").getByRole("link", { name: "Đội hình", exact: true })).toBeVisible();
      await expect(page.getByRole("contentinfo")).toBeInViewport({ ratio: 1 });
      await expect(action).toBeInViewport({ ratio: 1 });
      await expect(pitch).toBeInViewport({ ratio: 1 });
      expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(viewport.height + 1);
      const main = page.getByRole("main");
      expect(await main.evaluate((element) => element.scrollHeight - element.clientHeight)).toBeLessThanOrEqual(1);
      const pitchRect = (await pitch.boundingBox())!;
      const buttons = await pitch.getByRole("button").all();
      expect(buttons).toHaveLength(11);
      for (const button of buttons) {
        const box = (await button.boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(pitchRect.x);
        expect(box.x + box.width).toBeLessThanOrEqual(pitchRect.x + pitchRect.width);
        expect(box.y).toBeGreaterThanOrEqual(pitchRect.y);
        expect(box.y + box.height).toBeLessThanOrEqual(pitchRect.y + pitchRect.height);
      }
      await expectNoHorizontalOverflow(page);
      await page.screenshot({ path: testInfo.outputPath(`${view}-${viewport.width}.png`) });
      if (viewport.width === 1024) {
        await lineup.focus();
        await page.keyboard.press("End");
        await expect.poll(() => lineup.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
        await expect(lineup.getByRole("button").last()).toBeInViewport({ ratio: 0.99 });
        expect(await pitch.boundingBox()).toEqual(pitchRect);
        await expect(action).toBeInViewport({ ratio: 1 });
      }
    }
  }
});
