import { readFile } from "node:fs/promises";
import { chromium, firefox } from "@playwright/test";
import { test, expect, expectNoHorizontalOverflow } from "./helpers";

// Explicit opt-in: this fixture is a dedicated QA account, never a user's session.
const fixturePath = process.env.RTG_AUTH_FIXTURE_PATH;
for (const engine of [chromium, firefox]) {
  test(`authenticated workspace survives direct navigation and reload in ${engine.name()}`, async ({ baseURL }, testInfo) => {
    test.skip(!fixturePath, "Set RTG_AUTH_FIXTURE_PATH to a private, isolated QA fixture.");
    test.setTimeout(120_000);
    const fixture = JSON.parse(await readFile(fixturePath!, "utf8")) as {
      email: string; password: string; url: string; transferUrl: string; storageStatePath?: string;
    };
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, storageState: fixture.storageStatePath });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(`${page.url()}: ${error.stack ?? error.message}`));
      page.on("console", (message) => { if (message.type() === "error") errors.push(`${page.url()}: ${message.text()} at ${JSON.stringify(message.location())}`); });
      if (!fixture.storageStatePath) {
        const loginResponse = await page.goto(new URL("/login", baseURL).href);
        const csp = loginResponse!.headers()["content-security-policy"];
        expect(csp.includes("'unsafe-eval'")).toBe(process.env.RTG_PRODUCTION_CHECK !== "1");
        await page.waitForLoadState("networkidle");
        await page.getByLabel("Email", { exact: true }).fill(fixture.email);
        await page.getByLabel("Mật khẩu", { exact: true }).fill(fixture.password);
        await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
        await expect(page).not.toHaveURL(/\/login/);
        await page.waitForLoadState("networkidle");
      }
      await page.goto(new URL("/", baseURL).href);
      await expect(page.locator(".football-homepage-shell")).toBeVisible();
      await expect(page.locator(".football-guest-landing")).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Đăng xuất" })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(901);
      for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 720 }, { width: 1024, height: 768 }]) {
        await page.setViewportSize(viewport);
        await page.goto(new URL(new URL(fixture.url).pathname, baseURL).href);
        await expect(page.locator(".football-career-shell")).toBeVisible();
        await page.reload();
        await expect(page.locator(".football-story-rail__summary")).toHaveCSS("padding-top", "16px");
        await expect(page.locator(".football-season-strip")).toHaveCount(0);
        expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(viewport.height + 1);
        const grid = (await page.locator(".football-dashboard__grid").boundingBox())!;
        expect(viewport.height - grid.y - grid.height).toBeLessThanOrEqual(20);
        await expect(page.getByRole("region", { name: "Các câu lạc bộ trong sự nghiệp", exact: true })).toHaveCSS("overflow-y", "auto");
        const strip = page.locator(".football-panini-sticker__stats");
        await strip.scrollIntoViewIfNeeded();
        await expect(strip.locator("strong")).toHaveCount(6);
        await expectNoHorizontalOverflow(page);
        await page.getByRole("tab", { name: "Hợp đồng", exact: true }).click();
        await expect(page.getByRole("button", { name: "Xem lựa chọn hợp đồng", exact: true })).toHaveCount(1);
        await expect(page.locator(".football-contract-summary button")).toHaveCount(0);
        await page.getByRole("tab", { name: "Mùa giải", exact: true }).click();
        await page.getByRole("combobox", { name: "Chọn mùa giải", exact: true }).click();
        await page.getByRole("option").first().click();
        await expect(page.locator(".football-season-profile__club")).toBeVisible();
        await expect(page.locator("select")).toHaveCount(0);
        await page.screenshot({ path: testInfo.outputPath(`career-${engine.name()}-${viewport.width}.png`) });

        await page.goto(new URL(new URL(fixture.transferUrl).pathname, baseURL).href);
        await page.getByRole("button", { name: /Tìm CLB chủ động/ }).waitFor();
        await page.reload();
        await page.getByRole("button", { name: /Tìm CLB chủ động/ }).click();
        const list = page.getByRole("region", { name: "Danh sách CLB tìm kiếm", exact: true });
        await expect(list.locator(".football-transfer-club-row").first()).toBeVisible();
        await expect(list).toHaveCSS("overflow-y", "auto");
        expect((await list.boundingBox())!.height).toBeGreaterThanOrEqual(160);
        expect((await list.locator(".football-transfer-club-row").first().boundingBox())!.height).toBeLessThan(220);
        await list.focus();
        await page.keyboard.press("End");
        await expect.poll(() => list.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
        await expect(page.getByPlaceholder("Tìm theo tên CLB...")).toBeVisible();
        await expect(page.getByPlaceholder("Tìm theo tên CLB...")).toHaveCSS("border-top-width", "0px");
        expect(await page.evaluate(() => scrollY)).toBe(0);
        expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(viewport.height + 1);
        await expectNoHorizontalOverflow(page);
        await page.screenshot({ path: testInfo.outputPath(`transfer-${engine.name()}-${viewport.width}.png`) });
        if (viewport.width === 1440) {
          await page.getByRole("combobox", { name: "Lọc theo giải đấu", exact: true }).click();
          const popup = page.getByRole("dialog", { name: "Lọc theo giải đấu", exact: true });
          expect(await popup.getByRole("option").count()).toBeGreaterThan(20);
          const menu = popup.getByRole("listbox");
          expect(await menu.evaluate((node) => node.scrollHeight)).toBeGreaterThan(await menu.evaluate((node) => node.clientHeight));
          expect((await popup.boundingBox())!.height).toBeLessThanOrEqual(360);
          await page.screenshot({ path: testInfo.outputPath(`leagues-${engine.name()}.png`) });
          await popup.getByRole("textbox").fill("Premier League");
          await popup.getByRole("option", { name: "Premier League Hạng 1", exact: true }).click();
          await expect(list).toHaveAttribute("aria-busy", "false");
          await expect(list.locator(".football-transfer-club-row__identity p").first()).toHaveText("Premier League");
          const firstClub = await list.locator("h3").first().innerText();
          await page.getByRole("button", { name: "Sau", exact: true }).click();
          await expect(list.locator("h3").first()).not.toHaveText(firstClub);
          await page.getByRole("button", { name: "Xóa bộ lọc", exact: true }).click();
        }
      }
      expect(errors, "Authenticated routes must have no browser errors").toEqual([]);
    } finally {
      await browser.close();
    }
  });
}
