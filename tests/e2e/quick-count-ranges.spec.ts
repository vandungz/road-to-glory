import { test, expect, startQuickRun } from "./helpers";
import { getQuickCountRanges, resolveQuickCountRange } from "../../features/quick-mode/lib/quick-count-ranges";
import { getAppearancePool, getAssistPool, getCleanSheetPool, getGoalPool } from "../../features/quick-mode/lib/quick-mode-engine";
import { QUICK_MODE_STORAGE_KEY } from "../../features/quick-mode/lib/quick-mode-storage";
import { NATIONALITY_POOL, getNationalContinentalCup } from "../../lib/wheel-engine/weight-pools";
import { getFlagEmoji } from "../../types/squad";
import { generateFictionalName } from "../../lib/name-gen";
import type { QuickModeState } from "../../features/quick-mode/types";

const context = { stats: { pac: 10, sho: 10, dri: 10, pas: 10, str: 10, def: 10, iq: 10 }, careerLength: 20, leagueTitles: 10, domesticCups: 6, internationalCups: 3 };

test("Vietnam is available with its flag, continental competition and local names", () => {
  expect(NATIONALITY_POOL.filter(({ value }) => value === "Vietnam")).toHaveLength(1);
  expect(getFlagEmoji("Vietnam")).toBe("🇻🇳");
  expect(getNationalContinentalCup("Vietnam")).toBe("AFC Asian Cup");
  expect(generateFictionalName("Vietnam")).toMatch(/^(Nguyễn|Trần|Lê|Phạm|Hoàng|Huỳnh|Phan|Vũ|Đặng|Bùi) /);
});

test("count buckets retain deterministic weights, cover contiguous integers and resolve inclusive bounds", () => {
  for (const pool of [getGoalPool("ST", context), getAssistPool("CM", context), getAppearancePool(context), getCleanSheetPool("GK", context)]) {
    const ranges = getQuickCountRanges(pool);
    expect(ranges).toEqual(getQuickCountRanges(pool));
    expect(ranges.map(({ weight }) => weight)).toEqual(pool.map(({ weight }) => weight));
    ranges.forEach((item, index) => {
      if (index > 0) expect(item.range.min).toBe(ranges[index - 1].range.max + 1);
      expect(resolveQuickCountRange(item.range, (min) => min)).toBe(item.range.min);
      expect(resolveQuickCountRange(item.range, (_, max) => max)).toBe(item.range.max);
      const draws = Array.from({ length: 100 }, () => resolveQuickCountRange(item.range));
      expect(draws.every((value) => Number.isInteger(value) && value >= item.range.min && value <= item.range.max)).toBe(true);
    });
  }
  const goals = getQuickCountRanges(getGoalPool("ST", context));
  expect(goals[0]).toMatchObject({ label: "0", range: { min: 0, max: 0 } });
  expect(goals.at(-1)).toMatchObject({ label: "1000+", range: { min: 1001, max: 1300 } });
  expect(goals.find(({ value }) => value === 400)?.label).toBe("301–400");
});

test("appearance ranges respect saved clean sheets and clean-sheet ranges never exceed appearances", () => {
  const appearances = getQuickCountRanges(getAppearancePool(context, 500), 500);
  expect(appearances.every(({ range }) => range.min >= 500)).toBe(true);
  for (const total of [0, 1, 37, 119, 500, 1120]) {
    const sheets = getQuickCountRanges(getCleanSheetPool("GK", context), 0, total);
    expect(sheets.length).toBeGreaterThan(0);
    expect(sheets.every(({ range }) => range.min >= 0 && range.max <= total)).toBe(true);
  }
});

test("Classic setup can select Vietnam and generate a Vietnamese name", async ({ page }) => {
  await page.goto("/dev/classic-interactions-preview");
  await page.getByRole("combobox", { name: "Quốc gia", exact: true }).click();
  await page.getByRole("textbox", { name: "Tìm trong quốc gia", exact: true }).fill("Vietnam");
  await page.getByRole("option", { name: "Vietnam", exact: true }).click();
  await page.getByRole("button", { name: "Tạo tên cầu thủ ngẫu nhiên", exact: true }).click();
  await expect(page.locator("#classic-player-name")).toHaveValue(/^(Nguyễn|Trần|Lê|Phạm|Hoàng|Huỳnh|Phan|Vũ|Đặng|Bùi) /);
});

test("Vietnam Quick career resolves all four count wheels and preserves exact values on reload", async ({ page }) => {
  await startQuickRun(page, "Vietnam");
  await page.evaluate(({ key, context }) => {
    const state: QuickModeState = JSON.parse(sessionStorage.getItem(key)!);
    Object.assign(state, { phase: "finale", finaleStep: 0 });
    Object.assign(state.player, { position: "GK", debutAge: 17, careerLength: context.careerLength, stats: context.stats });
    sessionStorage.setItem(key, JSON.stringify(state));
  }, { key: QUICK_MODE_STORAGE_KEY, context });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Số trận ra sân", exact: true })).toBeVisible();
  await page.evaluate(() => { Math.random = () => 0.45; });
  for (const field of ["appearances", "goals", "assists", "cleanSheets"] as const) {
    await expect(page.locator(".football-spinner-wheel")).toContainText(/\d+–\d+/);
    await page.getByRole("button", { name: "Quay vòng", exact: true }).click();
    await expect.poll(() => page.evaluate(({ key, field }) => JSON.parse(sessionStorage.getItem(key)!).finale[field], { key: QUICK_MODE_STORAGE_KEY, field })).not.toBeNull();
  }
  const saved = await page.evaluate((key): QuickModeState => JSON.parse(sessionStorage.getItem(key)!), QUICK_MODE_STORAGE_KEY);
  expect(saved.player.nationality).toBe("Vietnam");
  for (const value of [saved.finale.appearances, saved.finale.goals, saved.finale.assists, saved.finale.cleanSheets]) expect(Number.isInteger(value)).toBe(true);
  expect(saved.finale.appearances!).toBeGreaterThan(0);
  expect(saved.finale.cleanSheets!).toBeLessThanOrEqual(saved.finale.appearances!);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Số lần đoạt Ballon d’Or", exact: true })).toBeVisible();
  const restored = await page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)!).finale, QUICK_MODE_STORAGE_KEY);
  expect(restored).toEqual(saved.finale);
});
