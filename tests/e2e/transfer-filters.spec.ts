import { test, expect } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/dev/transfer-window-preview");
  await page.getByRole("button", { name: /Tìm CLB chủ động/ }).click();
  await expect(page.locator(".football-transfer-club-row")).toHaveCount(2);
});

test("search has one focus boundary and redundant dividers are absent", async ({ page }) => {
  const input = page.getByRole("searchbox", { name: "Tên CLB", exact: true });
  await input.focus();
  await expect(input).toHaveCSS("border-top-width", "0px");
  await expect(input).toHaveCSS("outline-style", "none");
  await expect(page.locator(".football-search-field")).toHaveCSS("outline-style", "solid");
  await expect(page.locator(".football-transfer-window__header")).toHaveCSS("border-bottom-width", "0px");
  await expect(page.locator(".football-transfer-club-row").last()).toHaveCSS("border-bottom-width", "0px");
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  await input.fill("No matching club");
  await expect(page.getByText("Không tìm thấy CLB phù hợp với bộ lọc.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Xóa tên clb", exact: true }).click();
  await expect(input).toBeFocused();
  await expect(page.locator(".football-transfer-club-row")).toHaveCount(2);
});

test("league and prestige filters support search, keyboard selection and reset", async ({ page }) => {
  const league = page.getByRole("combobox", { name: "Lọc theo giải đấu", exact: true });
  await league.click();
  const popup = page.getByRole("dialog", { name: "Lọc theo giải đấu", exact: true });
  const query = popup.getByRole("textbox");
  await expect(query).toBeFocused();
  await query.fill("eredivisie");
  await expect(popup.getByRole("option")).toHaveCount(1);
  await query.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(league).toBeFocused();
  await expect(league).toContainText("Eredivisie");
  await expect(page.locator(".football-transfer-club-row")).toHaveCount(1);
  await expect(page.locator(".football-transfer-club-row")).toContainText("Ajax");
  await page.getByRole("button", { name: "Xóa bộ lọc", exact: true }).click();
  await page.getByRole("combobox", { name: "Lọc theo danh tiếng", exact: true }).click();
  await page.getByRole("option", { name: "2 sao", exact: true }).click();
  await expect(page.locator(".football-transfer-club-row")).toHaveCount(1);
  await expect(page.locator(".football-transfer-club-row")).toContainText("St. Pauli");
});

test("fee choices show complete labels, update the quote and close within the viewport", async ({ page }, testInfo) => {
  for (const viewport of [{ width: 1024, height: 768 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    const row = page.locator(".football-transfer-club-row").filter({ hasText: "Ajax" });
    const initialFee = await row.locator("dd").first().innerText();
    const price = row.getByRole("combobox", { name: "Mức phí đề xuất cho Ajax", exact: true });
    await price.click();
    const popup = page.getByRole("dialog", { name: "Mức phí đề xuất cho Ajax", exact: true });
    await expect(popup.getByText("Giảm cơ hội được CLB đồng ý")).toBeVisible();
    const bounds = (await popup.boundingBox())!;
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
    await page.screenshot({ path: testInfo.outputPath(`fee-${viewport.width}.png`) });
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await expect(price).toContainText("Giá cao");
    if (viewport.width === 1024) await expect(row.locator("dd").first()).not.toHaveText(initialFee);
    await expect(price).toBeFocused();
    await price.click();
    await page.keyboard.press("Escape");
    await expect(price).toHaveAttribute("aria-expanded", "false");
    expect(await page.evaluate(() => scrollY)).toBe(0);
  }
});
