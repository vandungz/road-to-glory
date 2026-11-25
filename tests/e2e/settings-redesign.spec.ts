import { test, expect, expectNoHorizontalOverflow, startQuickRun } from "./helpers";
import { guides, guideStorageKey } from "../../features/onboarding/guides";
import { QUICK_MODE_STORAGE_KEY } from "../../features/quick-mode/lib/quick-mode-storage";
import assets from "../../features/audio/audio-assets.json";

test.beforeEach(async ({ page }) => {
  await page.addInitScript((keys) => { for (const key of keys) localStorage.setItem(key, "seen"); }, Object.keys(guides).map((id) => guideStorageKey(id as keyof typeof guides)));
});

test("draft has a readable live label and one spin status", async ({ page }, testInfo) => {
  await page.goto("/dev/draft-preview");
  await page.getByRole("button", { name: "Vòng quay quyết định", exact: true }).click();
  const label = page.locator(".football-draft-setup .football-spinner-wheel__label-text");
  expect(await label.evaluate((node) => Number.parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(28);
  await expect(page.locator(".football-draft-setup__cta > span")).toHaveCount(0);
  await expect(page.locator(".football-draft-setup__result")).toHaveCount(0);
  await page.setViewportSize({ width: 1024, height: 600 });
  await expect(page.getByRole("button", { name: "Quay bánh xe", exact: true })).toBeInViewport({ ratio: 1 });
  await page.getByRole("button", { name: "Quay bánh xe", exact: true }).click();
  await expect(page.getByRole("button", { name: "Bánh xe đang quay", exact: true })).toBeDisabled();
  await page.getByRole("banner").getByRole("button", { name: "Âm thanh", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Âm thanh", exact: true }).getByRole("slider", { name: "Âm lượng hiệu ứng" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText("Đang quay...", { exact: true })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("draft-label.png") });
});

test("career header is compact and audio popover has labelled horizontal sliders", async ({ page }, testInfo) => {
  await page.goto("/dev/career-workspace");
  const header = page.getByRole("banner");
  await expect(header.locator(".football-wheel-header__context")).toHaveCount(0);
  await expect(header.getByRole("link", { name: "Cửa hàng", exact: true })).toHaveCount(0);
  await expect(header.getByRole("button", { name: "Tủ danh hiệu", exact: true })).toHaveCount(0);
  await expect(header.getByRole("link", { name: "Cài đặt", exact: true })).toBeVisible();
  const audio = header.getByRole("button", { name: "Âm thanh", exact: true });
  await audio.click();
  const panel = page.getByRole("dialog", { name: "Âm thanh", exact: true });
  await expect(panel.getByRole("slider", { name: "Âm lượng hiệu ứng" })).toBeFocused();
  await panel.getByRole("slider", { name: "Âm lượng hiệu ứng" }).fill("35");
  await expect(panel.getByText("35%", { exact: true })).toBeVisible();
  const row = panel.locator(".football-audio-volume").first();
  const [name, slider, value] = await Promise.all([row.locator("label").boundingBox(), row.locator("input").boundingBox(), row.locator("output").boundingBox()]);
  expect(slider!.x).toBeGreaterThan(name!.x);
  expect(value!.x).toBeGreaterThan(slider!.x);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("header-audio.png") });
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(audio).toBeFocused();
});

test("transfer header keeps help as its only right-hand control", async ({ page }) => {
  await page.goto("/dev/transfer-window-preview");
  const header = page.getByRole("banner");
  await expect(header.getByRole("button", { name: "Hướng dẫn trang này", exact: true })).toBeVisible();
  await expect(header.locator(".football-header-tools button")).toHaveCount(1);
  await expect(header.locator(".football-header-language, .football-transfer-shell__header-meta, [data-audio-controls]")).toHaveCount(0);
});

test("settings combine the profile, audio and language without a motion section", async ({ page }, testInfo) => {
  await page.goto("/dev/settings-preview");
  await expect(page.getByRole("textbox", { name: "Tên hiển thị" })).toHaveValue("Minh An");
  await expect(page.getByText("player@example.invalid", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Chuyển động", exact: true })).toHaveCount(0);
  await expect(page.getByText("Tùy chọn được lưu trên trình duyệt này.", { exact: true })).toHaveCount(0);
  for (const width of [1024, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`settings-${width}.png`) });
  }
  await page.getByRole("navigation", { name: "Cài đặt", exact: true }).getByRole("link", { name: "Ngôn ngữ", exact: true }).click();
  await expect(page.getByRole("radio", { name: "English", exact: true })).toBeInViewport();
});

test("Quick music switches from Floating Cities to Cipher with the career phase", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("football-life:audio:v1", JSON.stringify({ music: true, effects: false, musicVolume: 0.1 })));
  const requested: string[] = [];
  page.on("request", (request) => { if (request.url().includes("/media/audio/")) requested.push(request.url()); });
  await startQuickRun(page);
  await expect.poll(() => requested.some((url) => url.endsWith(assets.music))).toBe(true);
  expect(requested.some((url) => url.endsWith(assets.cipher))).toBe(false);
  await page.evaluate((key) => {
    const state = JSON.parse(sessionStorage.getItem(key)!);
    state.phase = "career";
    Object.assign(state.player, { debutAge: 17, careerLength: 15, clubCount: 1, stats: { pac: 8, sho: 8, dri: 8, pas: 8, str: 8, def: 8, iq: 8 } });
    sessionStorage.setItem(key, JSON.stringify(state));
  }, QUICK_MODE_STORAGE_KEY);
  await page.reload();
  await expect(page.locator(".football-quick-mode__stage-head h1")).toBeVisible();
  await page.getByRole("button", { name: "Âm thanh", exact: true }).click();
  await expect.poll(() => requested.some((url) => url.endsWith(assets.cipher))).toBe(true);
});
