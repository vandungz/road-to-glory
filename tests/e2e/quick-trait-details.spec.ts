import { test, expect, startQuickRun, expectNoHorizontalOverflow } from "./helpers";
import { QUICK_MODE_STORAGE_KEY } from "../../features/quick-mode/lib/quick-mode-storage";
import { QUICK_TRAITS } from "../../features/quick-mode/lib/traits";
import type { QuickModeState, QuickPosition } from "../../features/quick-mode/types";

for (const scenario of [
  { id: "xavi", position: "ST" as QuickPosition, bonuses: ["Passing+2", "Football IQ+1"] },
  { id: "buffon", position: "GK" as QuickPosition, bonuses: ["Reflexes+2", "Positioning+1"] },
]) {
  test(`${scenario.id} bonuses remain visible in a saved career and its summary`, async ({ page }, testInfo) => {
    await startQuickRun(page);
    await expect(page.locator(".football-quick-play__trait")).toHaveCount(0);
    const trait = QUICK_TRAITS.find(({ id }) => id === scenario.id)!;
    await page.evaluate(({ key, trait, position }) => {
      const state: QuickModeState = JSON.parse(sessionStorage.getItem(key)!);
      state.setupStep = 11;
      Object.assign(state.player, { position, trait, debutAge: 17, careerLength: 15,
        stats: { pac: 5, sho: 5, dri: 5, pas: 10, str: 5, def: 5, iq: 10, ref: 10, pos: 10, div: 5, han: 5, kic: 5, spd: 5 } });
      sessionStorage.setItem(key, JSON.stringify(state));
    }, { key: QUICK_MODE_STORAGE_KEY, trait, position: scenario.position });
    await page.reload();
    const details = page.locator(".football-quick-play__trait");
    await expect(details.getByText(trait.name, { exact: true })).toBeVisible();
    for (const bonus of scenario.bonuses) await expect(details.locator("li").filter({ hasText: bonus })).toBeVisible();
    await expect(details.locator("small")).toHaveCount(0);
    const savedStats = await page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)!).player.stats, QUICK_MODE_STORAGE_KEY);
    await page.reload();
    await expect(details).toContainText(scenario.bonuses[0]);
    expect(await page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)!).player.stats, QUICK_MODE_STORAGE_KEY)).toEqual(savedStats);
    await page.setViewportSize({ width: 1024, height: 600 });
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`${scenario.id}-bonuses.png`) });
    await page.evaluate((key) => {
      const state = JSON.parse(sessionStorage.getItem(key)!);
      state.phase = "complete";
      sessionStorage.setItem(key, JSON.stringify(state));
    }, QUICK_MODE_STORAGE_KEY);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Sự nghiệp đã hoàn tất", exact: true })).toBeVisible();
    for (const bonus of scenario.bonuses) await expect(details).toContainText(bonus);
  });
}
