import { test, expect, expectNoHorizontalOverflow, startQuickRun } from "./helpers";
import { QUICK_MODE_STORAGE_KEY } from "../../features/quick-mode/lib/quick-mode-storage";
import { DEBUT_AGE_POOL } from "../../lib/wheel-engine/weight-pools";
import { getAppearancePool, getAssistPool, getCleanSheetPool, getClubCountPool, getGoalPool, getQuickOverall } from "../../features/quick-mode/lib/quick-mode-engine";
import { getQuickModeOptions } from "../../features/quick-mode/lib/quick-mode-options";
import type { QuickModeState } from "../../features/quick-mode/types";

test("guest identity, wheel, reload and narrow-screen resize preserve progression", async ({ page }, testInfo) => {
  await startQuickRun(page);
  const spin = page.getByRole("button", { name: "Quay vòng", exact: true });
  await spin.click();
  await expect(page.getByRole("button", { name: "Đang quay…" })).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".football-desktop-notice")).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.getByRole("heading", { name: "Độ dài sự nghiệp", exact: true })).toBeVisible();
  const saved = await page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)!), QUICK_MODE_STORAGE_KEY);
  expect(saved.setupStep).toBe(1);
  expect(DEBUT_AGE_POOL.map((item) => item.value)).toContain(saved.player.debutAge);
  expect(saved.player.name).toBe("Nguyễn Minh Thử Nghiệm");
  expect(saved.player.nationality).toBe("Brazil");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Độ dài sự nghiệp", exact: true })).toBeVisible();
  await spin.click();
  await expect.poll(() => page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)!).setupStep, QUICK_MODE_STORAGE_KEY)).toBe(2);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("quick-career.png"), fullPage: true });
});

test("reduced motion keeps a wheel result functional", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await startQuickRun(page, "France");
  await page.getByRole("button", { name: "Quay vòng", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Độ dài sự nghiệp", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Quay vòng", exact: true })).toBeEnabled();
});

test("setup validates a short name and keyboard focus is visible", async ({ page }) => {
  await page.goto("/quick");
  const name = page.getByRole("textbox", { name: "Tên cầu thủ" });
  await name.fill("A");
  await expect(page.getByRole("button", { name: "Bắt đầu hành trình", exact: true })).toBeDisabled();
  await name.fill("Cầu thủ kiểm thử");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("combobox", { name: /^Quốc gia/ })).toBeFocused();
  const outline = await page.getByRole("combobox", { name: /^Quốc gia/ }).evaluate((element) => getComputedStyle(element).outlineStyle);
  expect(outline).not.toBe("none");
  await expect(page.getByRole("button", { name: "Bắt đầu hành trình", exact: true })).toBeEnabled();
});

test("Quick Mode fits the desktop viewport and retains the trait in the player rail", async ({ page }, testInfo) => {
  await startQuickRun(page, "Panama");
  const rail = page.getByRole("complementary", { name: "Thông tin và chỉ số cầu thủ" });
  const spin = page.getByRole("button", { name: "Quay vòng", exact: true });
  const expectFixedPage = async () => {
    await expectNoHorizontalOverflow(page);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(page.viewportSize()!.height);
  };

  await page.setViewportSize({ width: 1885, height: 1054 });
  await expect(spin).toBeInViewport({ ratio: 1 });
  await expect(rail.getByText("OVR", { exact: true })).toHaveCount(0);
  await expect(page.locator(".football-spinner-wheel__label-text")).toBeEmpty();
  await expect(page.getByText("Nguyễn Minh Thử Nghiệm", { exact: true })).toHaveCount(1);
  await expectFixedPage();
  await page.screenshot({ path: testInfo.outputPath("quick-opening.png") });

  const state = await page.evaluate((key): QuickModeState => JSON.parse(sessionStorage.getItem(key)!), QUICK_MODE_STORAGE_KEY);
  state.setupStep = 10;
  const maxClubs = Math.max(...getClubCountPool().map(({ value }) => value));
  Object.assign(state.player, { debutAge: 17, careerLength: maxClubs * 3, stats: { pac: 5, sho: 5, dri: 5, pas: 5, str: 5, def: 5, iq: 5 } });
  const load = async () => {
    await page.evaluate(({ key, state }) => sessionStorage.setItem(key, JSON.stringify(state)), { key: QUICK_MODE_STORAGE_KEY, state });
    await page.reload();
  };
  await page.setViewportSize({ width: 1024, height: 600 });
  await load();
  await expect(page.getByRole("heading", { name: "Đặc tính cầu thủ", exact: true })).toBeVisible();
  await page.evaluate(() => { Math.random = () => 0.01; });
  await expect(spin).toBeInViewport({ ratio: 1 });
  await spin.click();
  const liveLabel = page.locator(".football-spinner-wheel__label-text");
  await expect(liveLabel).not.toBeEmpty();
  await expect(liveLabel).toHaveCSS("font-size", "20px");
  const labelBox = (await liveLabel.boundingBox())!;
  const wheelBox = (await page.locator(".football-spinner-wheel__stage").boundingBox())!;
  expect(wheelBox.y - labelBox.y - labelBox.height).toBeGreaterThanOrEqual(12);
  await expect(rail.getByText("Cristiano Ronaldo", { exact: true })).toBeVisible();
  await expect(liveLabel).toBeEmpty();
  await expect(rail.locator("dt").filter({ hasText: /^Shooting$/ }).locator("+ dd")).toHaveText("7");
  await expectFixedPage();
  await page.mouse.move(0, 0);
  await page.screenshot({ path: testInfo.outputPath("quick-trait.png") });

  const { clubs, leagues } = getQuickModeOptions();
  const journeyClubs = leagues.flatMap((league) => clubs.find((club) => club.leagueId === league.id) ?? []).slice(0, maxClubs);
  const [club] = journeyClubs;
  state.player = await page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)!).player, QUICK_MODE_STORAGE_KEY);
  state.phase = "career";
  state.careerStep = 4;
  state.lastResult = "1";
  state.player.clubCount = maxClubs;
  Object.assign(state.clubDraft, { clubId: club.id, clubName: club.name, leagueId: club.leagueId, leagueName: club.leagueName, prestige: club.prestige, seasons: 3 });
  await load();
  await expect(page.getByRole("heading", { name: "Cúp quốc nội", exact: true })).toBeVisible();
  await expect(rail.getByText("Cristiano Ronaldo", { exact: true })).toBeVisible();
  await expect(liveLabel).toBeEmpty();
  await expect(page.getByText(club.name, { exact: true })).toBeVisible();
  await expect(spin).toBeInViewport({ ratio: 1 });
  await expectFixedPage();
  await page.screenshot({ path: testInfo.outputPath("quick-club.png") });

  state.phase = "complete";
  state.clubs = journeyClubs.map((club, clubIndex) => ({
    clubIndex, clubId: club.id, clubName: club.name, leagueId: club.leagueId, leagueName: club.leagueName, prestige: club.prestige,
    seasons: 3, leagueTitles: 1, domesticCups: 1, internationalCups: 0, internationalCupTypes: [], improvements: [],
  }));
  state.finale = { goals: 100, assists: 40, ballonDorWins: 1, otherAwardCount: 1, otherAwardTypes: ["Golden Boot"] };
  await load();
  const records = page.getByRole("region", { name: "Chi tiết sự nghiệp" });
  const replay = page.getByRole("link", { name: "Chơi Quick Mode mới", exact: true });
  await expect(page.locator(".football-quick-summary__totals dt").filter({ hasText: "Trận giữ sạch lưới" }).locator("+ dd")).toHaveText("—");
  const appearancesTotal = page.getByText("Số trận ra sân", { exact: true }).locator("+ dd");
  await expect(appearancesTotal).toHaveText("—");
  await expect(page.getByText("Tuổi ra mắt", { exact: true })).toHaveCount(0);
  await expect(records.getByRole("rowheader")).toHaveCount(maxClubs);
  await expect(records.getByText(club.name, { exact: true })).toHaveCount(1);
  await expect(replay).toBeInViewport({ ratio: 1 });
  await expectFixedPage();
  await records.focus();
  await page.keyboard.press("End");
  await expect.poll(() => records.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await expect(replay).toBeInViewport({ ratio: 1 });
  await expect(records.getByRole("columnheader", { name: "Cúp quốc tế" })).toBeInViewport();
  await records.evaluate((element) => { element.scrollTop = 0; element.blur(); });
  await page.screenshot({ path: testInfo.outputPath("quick-long-summary.png") });

  state.player.position = "GK";
  state.phase = "finale";
  state.finaleStep = 3;
  await load();
  const appearancesHeading = page.getByRole("heading", { name: "Số trận ra sân", exact: true });
  await expect(appearancesHeading).toBeVisible();
  await spin.click();
  await expect(page.getByRole("heading", { name: "Trận giữ sạch lưới", exact: true })).toBeVisible();
  await page.evaluate(() => { Math.random = () => 0.45; });
  await spin.click();
  const awardHeading = page.getByRole("heading", { name: "Giải cá nhân khác?", exact: true });
  await expect(awardHeading).toBeVisible();
  expect(await page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)!).finale.cleanSheets, QUICK_MODE_STORAGE_KEY)).toBeGreaterThan(0);
  await page.reload();
  await expect(awardHeading).toBeVisible();
});

test("Quick Mode shows each stat gain before the club closes and applies it only once", async ({ page }, testInfo) => {
  await startQuickRun(page);
  const { clubs } = getQuickModeOptions();
  const [club] = clubs;
  const baseStats = { pac: 5, sho: 5, dri: 6, pas: 5, str: 5, def: 5, iq: 5 };
  await page.evaluate(({ key, club, baseStats }) => {
    const state: QuickModeState = JSON.parse(sessionStorage.getItem(key)!);
    Object.assign(state, { phase: "career", careerStep: 11 });
    Object.assign(state.player, { debutAge: 17, careerLength: 12, clubCount: 1, stats: baseStats });
    Object.assign(state.clubDraft, { clubId: club.id, clubName: club.name, leagueId: club.leagueId, leagueName: club.leagueName,
      prestige: club.prestige, seasons: 12, improvementCount: 2, improvementTarget: "pac" });
    sessionStorage.setItem(key, JSON.stringify(state));
  }, { key: QUICK_MODE_STORAGE_KEY, club, baseStats });
  await page.reload();
  const spin = page.getByRole("button", { name: "Quay vòng", exact: true });
  const rail = page.getByRole("complementary", { name: "Thông tin và chỉ số cầu thủ" });
  const pace = rail.locator("dd[aria-label^='Pace:']");
  const ovr = rail.locator(".football-quick-play__tracker-ovr strong");
  await expect(page.getByRole("heading", { name: "Nâng Pace", exact: true })).toBeVisible();
  await expect(pace).toHaveText("5");
  await expect(ovr).toHaveText(String(getQuickOverall(baseStats)));
  await page.evaluate(() => { Math.random = () => 0.01; });
  await spin.click();
  await expect(page.getByRole("heading", { name: "Chọn chỉ số 2", exact: true })).toBeVisible();
  await expect(pace).toHaveAttribute("aria-label", "Pace: 6, tăng 1");
  await expect(pace.getByText("+1", { exact: true })).toBeVisible();
  await expect(ovr).toHaveText(String(getQuickOverall({ ...baseStats, pac: 6 })));
  await page.screenshot({ path: testInfo.outputPath("quick-live-gain.png") });

  await page.reload();
  await expect(pace).toHaveAttribute("aria-label", "Pace: 6, tăng 1");
  await page.evaluate(() => { Math.random = () => 0.01; });
  await spin.click();
  await expect(page.getByRole("heading", { name: "Nâng Shooting", exact: true })).toBeVisible();
  await spin.click();
  await expect(page.getByRole("heading", { name: "Số trận ra sân", exact: true })).toBeVisible();
  await expect(pace).toHaveAttribute("aria-label", "Pace: 6, tăng 1");
  await expect(rail.locator("dd[aria-label^='Shooting:']")).toHaveAttribute("aria-label", "Shooting: 6, tăng 1");
  await expect(ovr).toHaveText(String(getQuickOverall({ ...baseStats, pac: 6, sho: 6 })));
});

test("Quick Mode weights favor high G/A for elite careers and reward defensive roles for clean sheets", () => {
  const stats = { pac: 10, sho: 10, dri: 10, pas: 10, str: 10, def: 9, iq: 10, ref: 10, pos: 10, han: 10 };
  const elite = { stats, careerLength: 20, leagueTitles: 10, domesticCups: 6, internationalCups: 3 };
  const noTitles = { ...elite, leagueTitles: 0, domesticCups: 0, internationalCups: 0 };
  const average = (pool: { value: number | "1000+"; weight: number }[]) =>
    pool.reduce((sum, item) => sum + (item.value === "1000+" ? 1200 : item.value) * item.weight, 0)
    / pool.reduce((sum, item) => sum + item.weight, 0);

  const goals = getGoalPool("ST", elite);
  const appearances = getAppearancePool(elite);
  expect(appearances.at(0)?.value).toBe(16 * elite.careerLength);
  expect(appearances.at(-1)?.value).toBe(56 * elite.careerLength);
  expect(average(appearances)).toBeGreaterThan(average(getAppearancePool(noTitles)));
  expect(getAppearancePool(elite, 500).every(({ value }) => value >= 500)).toBe(true);
  expect(average(goals)).toBeGreaterThan(550);
  expect(average(goals)).toBeGreaterThan(average(getGoalPool("ST", noTitles)));
  expect(average(goals)).toBeGreaterThan(average(getGoalPool("ST", { ...elite, stats: { ...stats, sho: 5 } })));
  expect(average(getAssistPool("ST", elite))).toBeGreaterThan(200);
  expect(average(getAssistPool("CAM", elite))).toBeGreaterThan(450);
  expect(goals.filter((item) => item.weight >= 10).length).toBeGreaterThan(3);
  expect(average(getCleanSheetPool("GK", elite))).toBeGreaterThan(average(getCleanSheetPool("CB", elite)));
  expect(average(getCleanSheetPool("CB", elite))).toBeGreaterThan(average(getCleanSheetPool("ST", elite)));
  expect(average(getCleanSheetPool("GK", elite))).toBeGreaterThan(average(getCleanSheetPool("GK", { ...elite, stats: {} })));
  expect(getCleanSheetPool("GK", elite).every((item) => item.value >= 0 && item.value <= 600)).toBe(true);
});

test("a complete guest career reaches summary, survives reload and can restart", async ({ page }, testInfo) => {
  test.setTimeout(360_000);
  await startQuickRun(page);
  const portrait = page.locator(".football-player-portrait");
  const portraitSrc = await portrait.locator("img").getAttribute("src");
  expect(portraitSrc).toMatch(/\/p0[1-6]\/default\.webp$/);
  // Deterministic browser-only random draws keep this regression repeatable.
  await page.evaluate(() => { Math.random = () => 0.01; });
  const phases = new Set<string>();
  for (let spins = 0; spins < 100; spins += 1) {
    const before = await page.evaluate((key) => sessionStorage.getItem(key)!, QUICK_MODE_STORAGE_KEY);
    const state = JSON.parse(before);
    phases.add(state.phase);
    if (state.phase === "complete") break;
    await page.getByRole("button", { name: "Quay vòng", exact: true }).click();
    await expect.poll(() => page.evaluate((key) => sessionStorage.getItem(key), QUICK_MODE_STORAGE_KEY)).not.toBe(before);
  }
  expect([...phases]).toEqual(["setup", "career", "finale", "complete"]);
  const { appearances, cleanSheets } = await page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)!).finale, QUICK_MODE_STORAGE_KEY);
  expect(appearances).toBeGreaterThan(0);
  expect(cleanSheets).toBeLessThanOrEqual(appearances);
  const appearancesTotal = page.getByText("Số trận ra sân", { exact: true }).locator("+ dd");
  await expect(appearancesTotal).toHaveText(String(appearances));
  const cleanSheetTotal = page.locator(".football-quick-summary__totals dt").filter({ hasText: "Trận giữ sạch lưới" }).locator("+ dd");
  await expect(cleanSheetTotal).toHaveText(String(cleanSheets));
  await expect(page.getByText("Sự nghiệp đã hoàn tất", { exact: true })).toBeVisible();
  await expect(portrait.locator("img")).toHaveAttribute("src", portraitSrc!);
  await expect(portrait.locator("video")).toHaveCount(0);
  await expect(page.getByRole("table", { name: "Hành trình qua các CLB" }).getByRole("rowheader")).toHaveCount(1);
  await page.reload();
  await expect(page.getByText("Sự nghiệp đã hoàn tất", { exact: true })).toBeVisible();
  await expect(appearancesTotal).toHaveText(String(appearances));
  await expect(cleanSheetTotal).toHaveText(String(cleanSheets));
  await expect(portrait.locator("img")).toHaveAttribute("src", portraitSrc!);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("quick-summary.png"), fullPage: true });
  await page.getByRole("link", { name: "Chơi Quick Mode mới", exact: true }).click();
  await expect(page).toHaveURL(/\/quick$/);
  await expect(page.getByRole("textbox", { name: "Tên cầu thủ" })).toHaveValue("");
  await expect(portrait).toHaveCount(0);
});

test("a legacy Quick save keeps its portrait when reopening setup and resuming", async ({ page }) => {
  await startQuickRun(page);
  await page.getByRole("button", { name: "Quay vòng", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Độ dài sự nghiệp", exact: true })).toBeVisible();
  await page.evaluate((key) => {
    const state = JSON.parse(sessionStorage.getItem(key)!);
    delete state.player.portraitId;
    sessionStorage.setItem(key, JSON.stringify(state));
  }, QUICK_MODE_STORAGE_KEY);
  await page.reload();
  const image = page.locator(".football-player-portrait img");
  await expect(image).toBeAttached();
  const source = await image.getAttribute("src");
  expect(source).toMatch(/\/p0[1-6]\/default\.webp$/);
  await page.getByRole("link", { name: "Về thiết lập", exact: true }).click();
  await expect(image).toHaveAttribute("src", source!);
  await expect(page.locator(".football-player-portrait video")).toHaveCount(0);
  const name = page.getByRole("textbox", { name: "Tên cầu thủ" });
  await name.clear();
  await expect(name).toHaveValue("");
  await name.fill("Nguyễn Minh");
  await page.getByRole("button", { name: "Tiếp tục hành trình", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Độ dài sự nghiệp", exact: true })).toBeVisible();
  await expect(image).toHaveAttribute("src", source!);
});
