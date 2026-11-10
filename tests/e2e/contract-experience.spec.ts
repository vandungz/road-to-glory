import { test, expect, expectNoHorizontalOverflow } from "./helpers";

test("Quick Mode uses the shared searchable country and position controls", async ({ page }) => {
  await page.goto("/quick");
  await expect(page.locator("select")).toHaveCount(0);
  await page.getByRole("combobox", { name: "Quốc gia", exact: true }).click();
  await expect(page.locator(".football-filter__search")).toHaveCSS("display", "flex");
  await page.getByRole("textbox", { name: "Tìm trong quốc gia", exact: true }).fill("Brazil");
  await page.getByRole("option", { name: "Brazil", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Quốc gia", exact: true })).toContainText("Brazil");
  await page.getByRole("combobox", { name: "Vị trí", exact: true }).click();
  await page.getByRole("option", { name: "GK", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Vị trí", exact: true })).toContainText("GK");
  await expectNoHorizontalOverflow(page);
});

test("step five has one contract action, a read-only dossier and a shared season selector", async ({ page }, testInfo) => {
  await page.goto("/dev/career-workspace?step=transfer");
  await expect(page.getByRole("heading", { name: "Quyết định mùa tới", exact: true })).toBeVisible();
  await expect(page.getByText("Báo cáo thành tích", { exact: true })).toHaveCount(0);
  await page.getByRole("tab", { name: "Hợp đồng", exact: true }).click();
  await expect(page.getByRole("button", { name: "Xem lựa chọn hợp đồng", exact: true })).toHaveCount(1);
  await expect(page.locator(".football-contract-summary button")).toHaveCount(0);
  await expect(page.locator(".football-contract-summary")).toContainText("Brighton & Hove Albion");
  await page.screenshot({ path: testInfo.outputPath("step-five.png") });
  await page.getByRole("tab", { name: "Mùa giải", exact: true }).click();
  await page.getByRole("combobox", { name: "Chọn mùa giải", exact: true }).click();
  await page.getByRole("option").first().click();
  await expect(page.locator(".football-season-profile__club")).toContainText("Brighton & Hove Albion");
  await expect(page.locator("select")).toHaveCount(0);
  await page.getByRole("button", { name: "Xem lựa chọn hợp đồng", exact: true }).click();
  await expect(page).toHaveURL(/\/dev\/transfer-window-preview$/);
});

test("accepting the club renewal skips the wage negotiation screen", async ({ page }) => {
  await page.goto("/dev/transfer-window-preview");
  await page.getByRole("button", { name: "Đồng ý gia hạn", exact: true }).click();
  await expect(page.getByRole("status").first()).toContainText("Offer renewal: Feyenoord");
  await expect(page.locator(".football-contract-negotiation")).toHaveCount(0);
});

test("negotiation centers both columns in the full-height panel and keeps choices reachable", async ({ page }, testInfo) => {
  await page.goto("/dev/transfer-window-preview");
  await page.getByRole("button", { name: "Lời đề nghị 2", exact: true }).click();
  await page.getByRole("button", { name: "Đàm phán với Brighton", exact: true }).click();
  for (const viewport of [{ width: 1885, height: 1054 }, { width: 1440, height: 900 }, { width: 1280, height: 720 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(viewport);
    const submit = page.getByRole("button", { name: "Gửi đề nghị lương", exact: true });
    const button = (await submit.boundingBox())!;
    expect(button.y + button.height).toBeLessThanOrEqual(viewport.height);
    const panel = (await page.locator(".football-contract-negotiation").boundingBox())!;
    const main = (await page.locator(".football-app-shell__main").boundingBox())!;
    expect(panel.y - main.y).toBeCloseTo(16, 0);
    expect(main.y + main.height - (panel.y + panel.height)).toBeCloseTo(16, 0);
    const panelCenterY = panel.y + panel.height / 2;
    const copy = (await page.locator(".football-contract-negotiation__copy").boundingBox())!;
    expect(copy.y + copy.height / 2).toBeCloseTo(panelCenterY, 0);
    const art = page.locator(".football-contract-negotiation__art img");
    await expect.poll(() => art.evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    const box = (await art.boundingBox())!;
    expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(380);
    expect(box.width).toBeLessThanOrEqual(480);
    expect(box.y + box.height / 2).toBeCloseTo(panelCenterY, 0);
    await expect(page.locator(".football-contract-negotiation__mood")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(page.locator(".football-contract-negotiation__options label").first()).toHaveCSS("border-left-width", "0px");
    await page.getByRole("radio", { name: /Tăng lương/ }).check();
    await expect(page.getByRole("radio", { name: /Tăng lương/ })).toBeChecked();
    await expectNoHorizontalOverflow(page);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(viewport.height + 1);
    await page.screenshot({ path: testInfo.outputPath(`contract-${viewport.width}.png`) });
  }
  await page.getByRole("button", { name: "Gửi đề nghị lương", exact: true }).click();
  await expect(page.getByRole("status").first()).toContainText("Offer transfer: Brighton");
});
