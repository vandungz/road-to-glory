import { test, expect, expectNoHorizontalOverflow } from "./helpers";

test("Classic fits the viewport and scrolls only the other-squad rows", async ({ page }, testInfo) => {
  for (const viewport of [{ width: 1024, height: 768 }, { width: 1280, height: 720 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/dev/classic-preview");
    const archive = page.getByRole("region", { name: "Danh sách đội hình khác", exact: true });
    await expect(archive).toBeVisible();
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
