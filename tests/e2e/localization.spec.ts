import { localeCookie } from "../../i18n/locale";
import { test, expect, expectNoHorizontalOverflow } from "./helpers";

test("language persists across routes and switches without resetting a Quick run", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1024, height: 600 });
  await page.goto("/settings");
  await page.getByRole("radio", { name: "English" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await page.getByRole("link", { name: "Home", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole("link", { name: "Chuyển sang tiếng Anh" }).click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByRole("heading", { name: "A season can turn on a spin" })).toBeVisible();
  await expect(page.getByRole("link", { name: "The wheel" })).toHaveAttribute("href", "#landing-gameplay");
  await expect(page.getByRole("heading", { name: "Choose your career" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("home-en.png") });

  await page.getByRole("link", { name: "Play Quick Mode" }).click();
  await expect(page.getByRole("navigation", { name: "Account and settings" })).toHaveCount(0);
  await page.getByRole("textbox", { name: "Player name" }).fill("English test");
  await page.getByRole("button", { name: "Start career" }).click();
  await expect(page.getByRole("heading", { name: "Debut age" })).toBeVisible();
  await expect(page.locator(".football-quick-play__stage h1")).toHaveCSS("animation-name", "football-mount");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".football-quick-play__stage h1")).toHaveCSS("animation-duration", "0s");
  await page.getByRole("button", { name: "Spin", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Career length" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("quick-en.png") });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Career length" })).toBeVisible();
  await expect(page.getByText("English test", { exact: true })).toBeVisible();

  const settings = await page.context().newPage();
  await settings.goto("/settings");
  await expect(settings.getByRole("radio", { name: "English" })).toBeChecked();
  await settings.getByRole("radio", { name: "Tiếng Việt" }).click();
  await expect(settings.locator("html")).toHaveAttribute("lang", "vi");
  await settings.close();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Độ dài sự nghiệp" })).toBeVisible();
});

test("English renders Classic results and the desktop gate, and account controls stay on the homepage", async ({ page }, testInfo) => {
  await page.context().addCookies([{ name: localeCookie, value: "en", url: testInfo.project.use.baseURL! }]);
  await page.goto("/dev/design-preview?view=Home");
  await expect(page.getByRole("link", { name: "Profile" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  await page.goto("/dev/classic-preview?view=Squad");
  await expect(page.getByRole("navigation", { name: "Account and settings" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Sign out" })).toHaveCount(0);

  await page.goto("/dev/career-workspace?step=cup");
  const workspace = page.locator(".football-dashboard__main");
  await expect(workspace).toHaveCSS("animation-name", "football-reveal");
  await expect(workspace).toHaveCSS("animation-duration", "0.22s");
  await page.getByRole("button", { name: "Spin", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Results by round" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Continue" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("career-cup-en.png"), animations: "disabled" });
  await dialog.getByRole("button", { name: "Continue" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("heading", { name: "Play on desktop" })).toBeVisible();
});

test("English transfer filters and negotiation show complete labels", async ({ page, baseURL }) => {
  await page.context().addCookies([{ name: localeCookie, value: "en", url: baseURL! }]);
  await page.goto("/dev/transfer-window-preview");
  await page.getByRole("button", { name: /Find a club/ }).click();
  const league = page.getByRole("combobox", { name: "Filter by league" });
  await league.click();
  await expect(page.getByRole("textbox", { name: "Search filter by league" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("combobox", { name: "Filter by prestige" }).click();
  await expect(page.getByRole("option", { name: "1 star" })).toBeVisible();
  await expect(page.getByRole("option", { name: "5 stars" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Offers 2" }).click();
  await page.getByRole("button", { name: "Negotiate with Brighton" }).click();
  await expect(page.getByRole("heading", { name: "Contract with Brighton" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit wage proposal" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("archived national-team matches use English while retaining the saved opponents and scores", async ({ page, baseURL }) => {
  await page.context().addCookies([{ name: localeCookie, value: "en", url: baseURL! }]);
  await page.goto("/dev/career-workspace");
  await page.getByRole("tab", { name: "Season", exact: true }).click();
  await page.getByRole("combobox", { name: "Select a season" }).click();
  await page.getByRole("option", { name: /Age 34/ }).click();
  await page.getByRole("button", { name: /FIFA World Cup/ }).click();

  const dialog = page.getByRole("dialog", { name: "FIFA World Cup" });
  await expect(dialog.getByText("Group stage: Drew 1–1 against France")).toBeVisible();
  await expect(dialog.getByText("Group stage: Lost 0–2 against Germany")).toBeVisible();
  await expect(dialog.getByText("England", { exact: true })).toBeVisible();
});
