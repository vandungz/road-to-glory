import { test, expect, expectNoHorizontalOverflow } from "./helpers";
import { EDITORIAL_ASSETS } from "../../components/shared/EditorialArt";
import type { Locator } from "@playwright/test";

async function paintedImageSize(image: Locator) {
  await expect.poll(() => image.evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  return image.evaluate((node) => {
    const img = node as HTMLImageElement;
    const box = img.getBoundingClientRect();
    const css = getComputedStyle(img);
    const width = box.width - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight);
    const height = box.height - parseFloat(css.paddingTop) - parseFloat(css.paddingBottom);
    const scale = Math.min(width / img.naturalWidth, height / img.naturalHeight);
    return { width: img.naturalWidth * scale, height: img.naturalHeight * scale };
  });
}

test("all editorial assets decode and fit supported desktop sizes", async ({ page }, testInfo) => {
  await page.goto("/dev/design-preview");
  await page.getByRole("tab", { name: "Media", exact: true }).click();
  const images = page.locator(".football-editorial-art");
  await expect(images).toHaveCount(EDITORIAL_ASSETS.length);
  for (const image of await images.all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }
  for (const width of [1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await expectNoHorizontalOverflow(page);
  }
  await page.screenshot({ path: testInfo.outputPath("media-library.png"), fullPage: true });
});

test("entry art preserves actions and reduced-motion uses static images", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 900 });
  for (const route of ["/", "/quick", "/login"]) {
    await page.goto(route);
    const art = page.locator(".football-editorial-art").first();
    await expect(art).toBeVisible();
    await expect.poll(() => art.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    expect((await art.boundingBox())!.height).toBeGreaterThanOrEqual(300);
    for (const video of await page.locator("video").all()) await expect(video).toHaveJSProperty("paused", true);
    await expectNoHorizontalOverflow(page);
  }
});


test("season recap gives artwork a side column and keeps actions visible", async ({ page }, testInfo) => {
  await page.goto("/dev/design-preview");
  await page.getByRole("tab", { name: "Tổng kết", exact: true }).click();
  await page.getByRole("button", { name: "Mở tổng kết thử nghiệm" }).click();
  const dialog = page.getByRole("dialog");
  for (const width of [1024, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    const art = await dialog.locator(".football-editorial-art").boundingBox();
    expect(art!.width).toBeGreaterThan(280);
    expect(art!.height).toBeGreaterThanOrEqual(320);
    const action = dialog.getByRole("button", { name: "Tiếp tục phát triển chỉ số" });
    await expect(action).toBeVisible();
    const button = await action.boundingBox();
    expect(button!.y + button!.height).toBeLessThanOrEqual(800);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`recap-${width}.png`), fullPage: true });
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("management screens keep records directly below compact headings and art beside records", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/dev/design-preview");
  for (const width of [1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const tab of ["Classic", "PvE", "Giải nghệ"]) {
      await page.getByRole("tab", { name: tab, exact: true }).click();
      const scope = page.locator(tab === "Classic" ? ".football-classic-lobby" : tab === "PvE" ? ".football-pve-lobby" : ".football-retired-stage");
      const header = scope.locator(tab === "Classic" ? ".football-classic-lobby__intro" : tab === "PvE" ? ".football-pve-lobby__intro" : ".football-retired-stage__header");
      await expect(header.locator("img")).toHaveCount(0);
      expect((await header.boundingBox())!.height).toBeLessThanOrEqual(200);
      const art = scope.locator(".football-editorial-rail");
      const records = scope.locator(tab === "Classic" ? ".football-classic-lobby__list" : tab === "PvE" ? ".football-pve-lobby__list" : ".football-retired-stage__details");
      const artBox = (await art.boundingBox())!;
      const dataBox = (await records.boundingBox())!;
      if (tab === "Giải nghệ") {
        expect(dataBox.width).toBeGreaterThanOrEqual(360);
        const clippedText = await scope.locator(".football-retired-stage__club strong, .football-retired-stage__stat span").evaluateAll((nodes) => nodes.filter((node) => node.scrollWidth > node.clientWidth + 1).map((node) => node.textContent));
        expect(clippedText).toEqual([]);
      }
      expect(artBox.x).toBeGreaterThanOrEqual(dataBox.x + dataBox.width);
      expect(Math.abs(artBox.y - dataBox.y)).toBeLessThanOrEqual(1);
      expect(dataBox.y - ((await header.boundingBox())!.y + (await header.boundingBox())!.height)).toBeLessThanOrEqual(32);
      await expectNoHorizontalOverflow(page);
      await page.screenshot({ path: testInfo.outputPath(`${tab}-${width}.png`), fullPage: true });
    }
  }
});

test("a single PvE session keeps the same compact heading and record-first layout", async ({ page }, testInfo) => {
  await page.goto("/dev/design-preview");
  await page.getByRole("tab", { name: "PvE", exact: true }).click();
  await page.getByRole("button", { name: "Hiện một đội hình", exact: true }).click();
  await expect(page.locator(".football-pve-lobby__session")).toHaveCount(1);
  await expect(page.locator(".football-pve-lobby__intro img")).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("pve-single.png"), fullPage: true });
});

test("multi-player scenes retain a meaningful painted area rather than a small image inside a large box", async ({ page }) => {
  for (const width of [1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/dev/design-preview?view=PvE");
    const scene = page.locator(".football-pve-lobby__content .football-editorial-art");
    const painted = await paintedImageSize(scene);
    expect(painted.width).toBeGreaterThanOrEqual(width === 1024 ? 320 : 440);
    await page.getByRole("tab", { name: "Tổng kết", exact: true }).click();
    await page.getByRole("button", { name: "Mở tổng kết thử nghiệm" }).click();
    const recap = await paintedImageSize(page.getByRole("dialog").locator(".football-editorial-art"));
    expect(recap.width).toBeGreaterThanOrEqual(390);
    await page.keyboard.press("Escape");
  }
});
