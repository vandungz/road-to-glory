import { expect, test as base, type Page } from "@playwright/test";

export const test = base.extend<{ runtimeErrors: string[] }>({
  runtimeErrors: [async ({ page }, use) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await use(errors);
    expect(errors, "Browser must have no runtime or console errors").toEqual([]);
  }, { auto: true }],
});

export { expect };

export async function expectNoHorizontalOverflow(page: Page) {
  const sizes = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.viewport + 1);
  const clippedControls = await page.evaluate(() => Array.from(document.querySelectorAll("button, a, input, select"))
    .filter((element) => {
      const box = element.getBoundingClientRect();
      if (box.width < 8 || box.height < 8) return false;
      for (let parent = element.parentElement; parent; parent = parent.parentElement) {
        if (/auto|scroll/.test(getComputedStyle(parent).overflowX)) return false;
      }
      return box.left < -1 || box.right > document.documentElement.clientWidth + 1;
    }).map((element) => element.getAttribute("aria-label") ?? element.textContent?.trim()));
  expect(clippedControls, "Controls must fit, even when the root clips horizontal overflow").toEqual([]);
}

export async function startQuickRun(page: Page, nationality = "Brazil") {
  await page.goto("/quick");
  await page.getByRole("combobox", { name: "Quốc gia", exact: true }).click();
  await page.getByRole("textbox", { name: "Tìm trong quốc gia", exact: true }).fill(nationality);
  await page.getByRole("option", { name: nationality, exact: true }).click();
  await page.getByRole("combobox", { name: "Vị trí", exact: true }).click();
  await page.getByRole("option", { name: "ST", exact: true }).click();
  await page.getByRole("textbox", { name: "Tên cầu thủ" }).fill("Nguyễn Minh Thử Nghiệm");
  await page.getByRole("button", { name: "Bắt đầu hành trình", exact: true }).click();
  await expect(page).toHaveURL(/\/quick\/play$/);
  await expect(page.getByRole("heading", { name: "Tuổi ra mắt", exact: true })).toBeVisible();
}
