import { test, expect, expectNoHorizontalOverflow, startQuickRun } from "./helpers";
import { guides, type GuideId } from "../../features/onboarding/guides";
import vi from "../../i18n/messages/vi.json";
import { QUICK_MODE_STORAGE_KEY } from "../../features/quick-mode/lib/quick-mode-storage";

const popover = ".football-guide";
const helpLabel = "Hướng dẫn trang này";

async function walkGuide(page: import("@playwright/test").Page, id: GuideId) {
  const guide = page.locator(popover);
  await expect(guide).toBeVisible();
  for (let index = 0; index < guides[id].targets.length; index++) {
    await expect(page.locator(`.driver-active-element[data-guide="${guides[id].targets[index]}"]`)).toHaveCount(1);
    await expect(guide.locator(".driver-popover-progress-text")).toHaveText(`${index + 1} / ${guides[id].targets.length}`);
    const bounds = (await guide.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(page.viewportSize()!.height + 1);
    if (id === "quickPlay") {
      const spin = (await page.getByRole("button", { name: "Quay vòng", exact: true }).boundingBox())!;
      expect(bounds.x >= spin.x + spin.width || bounds.x + bounds.width <= spin.x || bounds.y >= spin.y + spin.height || bounds.y + bounds.height <= spin.y).toBe(true);
    }
    await guide.getByRole("button", { name: index === guides[id].targets.length - 1 ? "Đã hiểu" : "Tiếp", exact: true }).click();
  }
  await expect(guide).toHaveCount(0);
}


async function checkHelpModal(page: import("@playwright/test").Page, id: GuideId) {
  const modal = page.getByRole("dialog", { name: "Giới thiệu & hướng dẫn", exact: true });
  await expect(modal).toBeVisible();
  await expect(page.locator(popover)).toHaveCount(0);
  await expect(modal.locator(".football-modal-body section")).toHaveCount(guides[id].targets.length);
  for (const target of guides[id].targets) {
    await expect(modal.getByRole("heading", { name: vi.onboarding.steps[target].title, exact: true })).toBeVisible();
    await expect(modal.getByText(vi.onboarding.steps[target].description, { exact: true })).toBeVisible();
  }
}

test("first visit stays interactive and Help opens a reading modal", async ({ page }) => {
  await page.goto("/quick");
  const guide = page.locator(".football-guide");
  await expect(guide).toBeVisible();
  await expect(guide).toContainText("Tạo một lượt chơi nhanh");
  await expect(guide).toHaveAttribute("aria-modal", "false");
  const name = page.getByRole("textbox", { name: "Tên cầu thủ" });
  await name.click();
  await name.fill("Guide Test");
  await expect(name).toHaveValue("Guide Test");
  await expect(guide).toHaveCount(0);
  const help = page.getByRole("button", { name: "Hướng dẫn trang này", exact: true });
  await help.click();
  await checkHelpModal(page, "quickSetup");
  await page.keyboard.press("Escape");
  await expect(help).toBeFocused();
  await page.reload();
  await expect(help).toBeVisible();
  await page.waitForTimeout(900);
  await expect(guide).toHaveCount(0);
  await help.click();
  await checkHelpModal(page, "quickSetup");
  await page.getByRole("dialog", { name: "Giới thiệu & hướng dẫn" }).getByRole("button", { name: "Đã hiểu", exact: true }).click();
  await expect(page.locator(".football-page-help")).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});

const pages: [GuideId, string][] = [
  ["home", "/dev/design-preview?view=Home"],
  ["classic", "/dev/classic-preview"],
  ["squad", "/dev/classic-preview?view=squad"],
  ["profileSetup", "/dev/classic-interactions-preview"],
  ["career", "/dev/career-workspace"],
  ["transfer", "/dev/transfer-window-preview"],
  ["shop", `/dev/design-preview?view=${encodeURIComponent("Cửa hàng")}`],
  ["retirement", `/dev/design-preview?view=${encodeURIComponent("Giải nghệ")}`],
  ["pve", `/dev/design-preview?view=PvE`],
  ["tournament", "/dev/onboarding?view=tournament"],
  ["profile", "/dev/onboarding?view=profile"],
  ["settings", "/settings"],
];
for (const [id, url] of pages) test(`${id}: every configured anchor is explained on the actual feature`, async ({ page }) => {
  await page.goto(url);
  await walkGuide(page, id);
  await page.getByRole("button", { name: helpLabel, exact: true }).click();
  await checkHelpModal(page, id);
});

test("draft and negotiation register when those views become available", async ({ page }) => {
  await page.goto("/dev/draft-preview");
  await page.getByRole("button", { name: "Vòng quay quyết định", exact: true }).click();
  await walkGuide(page, "draft");
  await page.goto("/dev/transfer-window-preview");
  await page.getByRole("button", { name: /^Lời đề nghị/ }).first().click();
  // Navigation is by the real transfer tabs; do not call a server mutation in this fixture.
  const offer = page.locator(".football-transfer-offers button").first();
  await offer.click();
  await walkGuide(page, "negotiation");
});

test("Quick Mode playing and summary have separate contexts", async ({ page }) => {
  await startQuickRun(page);
  await walkGuide(page, "quickPlay");
  await page.evaluate((key) => {
    const state = JSON.parse(sessionStorage.getItem(key)!);
    state.phase = "complete";
    sessionStorage.setItem(key, JSON.stringify(state));
  }, QUICK_MODE_STORAGE_KEY);
  await page.reload();
  await walkGuide(page, "quickSummary");
});

test("busy states, missing anchors, dialogs and route changes cancel safely", async ({ page }) => {
  await page.goto("/dev/onboarding");
  const guide = page.locator(popover);
  await expect(page.getByRole("button", { name: helpLabel, exact: true })).toBeDisabled();
  await page.waitForTimeout(800);
  await expect(guide).toHaveCount(0);
  await page.getByRole("button", { name: "Toggle busy" }).click();
  await page.waitForTimeout(800);
  await expect(guide).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("football-life:guide:settings:v3"))).toBeNull();
  await page.getByRole("button", { name: "Toggle target" }).click();
  await expect(guide).toBeVisible();
  await page.getByRole("button", { name: "Open fixture dialog" }).click();
  await expect(page.getByRole("dialog", { name: "Fixture dialog" })).toBeVisible();
  await expect(guide).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: helpLabel, exact: true }).click();
  await checkHelpModal(page, "settings");
  await page.goto("/settings");
  await expect(page.locator(".football-page-help")).toHaveCount(0);
  await expect(page.locator(".driver-layer")).toHaveCount(0);
  await page.waitForTimeout(800);
  await expect(guide).toHaveCount(0);
});

test("storage denial, English and reduced motion support tour and help modal", async ({ page, context }) => {
  await context.addCookies([{ name: "football-life-locale", value: "en", url: "http://localhost:3000" }]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => Object.defineProperty(window, "localStorage", { get() { throw new DOMException("Blocked", "SecurityError"); } }));
  await page.goto("/quick");
  const guide = page.locator(popover);
  await expect(guide).toContainText("Set up a quick run");
  await expect(guide).toHaveAttribute("lang", "en");
  await expect(page.locator("body")).not.toHaveClass(/driver-fade/);
  await guide.getByRole("button", { name: "Skip", exact: true }).click();
  await page.getByRole("button", { name: "Help for this page", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Introduction & help", exact: true })).toBeVisible();
  await expect(guide).toHaveCount(0);
  await page.keyboard.press("Escape");
});

test("landing and login stay untouched; policies offer on-demand help only", async ({ page }) => {
  for (const url of ["/", "/login"]) {
    await page.goto(url);
    await expect(page.locator(".football-guide-help")).toHaveCount(0);
    await expect(page.locator(popover)).toHaveCount(0);
  }
  for (const url of ["/privacy", "/terms"]) {
    await page.goto(url);
    await expect(page.getByRole("button", { name: helpLabel, exact: true })).toBeVisible();
    await page.waitForTimeout(800);
    await expect(page.locator(popover)).toHaveCount(0);
    await page.getByRole("button", { name: helpLabel, exact: true }).click();
    await checkHelpModal(page, "policy");
    await page.keyboard.press("Escape");
  }
});

test("guide fits supported sizes, preserves keyboard tabs and offers inline help", async ({ page }, testInfo) => {
  await page.addInitScript(() => localStorage.removeItem("football-life:guide:career:v2"));
  for (const viewport of [{ width: 1024, height: 700 }, { width: 1280, height: 800 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/dev/career-workspace");
    await expect(page.locator(popover)).toBeVisible();
    await expect(page.locator(popover)).toHaveCSS("opacity", "1");
    const panel = (await page.locator(popover).boundingBox())!;
    const spin = (await page.getByRole("button", { name: "Quay bánh xe", exact: true }).boundingBox())!;
    expect(panel.x >= spin.x + spin.width || panel.x + panel.width <= spin.x || panel.y >= spin.y + spin.height || panel.y + panel.height <= spin.y).toBe(true);
    await page.screenshot({ path: `.hallmark/shots/onboarding-career-${viewport.width}x${viewport.height}.png` });
    await walkGuide(page, "career");
    await expectNoHorizontalOverflow(page);
  }
  await page.reload();
  await expect(page.locator(popover)).toBeVisible();
  const cardTab = page.getByRole("tab", { name: "Thẻ cầu thủ", exact: true });
  await cardTab.focus();
  await cardTab.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Mùa giải", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(popover)).toHaveCount(0);
  await page.reload();
  await expect(page.locator(popover)).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".football-desktop-notice")).toBeVisible();
  await expect(page.locator(popover)).toHaveCount(0);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/dev/transfer-window-preview");
  if (await page.locator(popover).count()) await page.keyboard.press("Escape");
  const hint = page.getByRole("button", { name: "Các lựa chọn chuyển nhượng", exact: true });
  await hint.focus();
  await expect(page.getByRole("tooltip").filter({ hasText: "Xem khả năng ở lại" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("transfer-inline-help.png") });
});

test("the compatible Ballon d’Or result page has on-demand help", async ({ page }) => {
  await page.goto("/dev/onboarding?view=ballonResult");
  await page.getByRole("button", { name: helpLabel, exact: true }).click();
  await checkHelpModal(page, "ballonResult");
});

test("Help replaces an active tour with one dialog and fits short screens", async ({ page }) => {
  await page.goto("/dev/career-workspace");
  await expect(page.locator(popover)).toBeVisible();
  const help = page.getByRole("button", { name: helpLabel, exact: true });
  await help.click();
  await checkHelpModal(page, "career");
  await expect(page.getByRole("dialog")).toHaveCount(1);
  const modal = page.locator(".football-page-help");
  for (const viewport of [{ width: 1024, height: 600 }, { width: 1280, height: 800 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await expect(modal).toHaveCSS("opacity", "1");
    const panel = (await modal.boundingBox())!;
    expect(panel.y).toBeGreaterThanOrEqual(0);
    expect(panel.y + panel.height).toBeLessThanOrEqual(viewport.height);
    await expect(modal.getByRole("button", { name: "Đã hiểu", exact: true })).toBeInViewport({ ratio: 1 });
  }
  await page.keyboard.press("Escape");
  await expect(help).toBeFocused();
  await page.waitForTimeout(900);
  await expect(page.locator(popover)).toHaveCount(0);
});
