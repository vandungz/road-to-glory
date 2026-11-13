import { test, expect, expectNoHorizontalOverflow } from "./helpers";

test("loading layouts keep navigation, show one status and fit short desktop windows", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1024, height: 600 });
  for (const [view, title, columns] of [
    ["career", "Sự nghiệp", 3],
    ["quick", "Quick Mode", 2],
    ["match", "Champions League", 2],
    ["records", "PvE Tournament", 1],
  ] as const) {
    await page.goto(`/dev/loading-preview?view=${view}`);
    const layout = page.getByRole("region", { name: title });
    await expect(layout.getByRole("heading", { name: title })).toBeVisible();
    await expect(layout.getByRole("status")).toHaveCount(1);
    await expect(layout.locator(".football-route-loading__layout > div")).toHaveCount(columns);
    await expect(page.getByRole("link", { name: "Road to Glory" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`${view}.png`) });
  }
});
