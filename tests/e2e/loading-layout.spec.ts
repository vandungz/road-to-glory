import { test, expect, expectNoHorizontalOverflow, startQuickRun } from "./helpers";

test("loading layouts keep navigation, show one status and fit short desktop windows", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1024, height: 600 });
  for (const [view, title, columns] of [
    ["career", "Sự nghiệp", 3],
    ["quick", "Quick Mode", 2],
    ["match", "Champions League", 2],
    ["records", "PvE Tournament", 2],
  ] as const) {
    await page.goto(`/dev/loading-preview?view=${view}`);
    const layout = page.getByRole("region", { name: title });
    await expect(layout.getByRole("heading", { name: title })).toBeVisible();
    await expect(layout.getByRole("status")).toHaveCount(1);
    await expect(layout.locator(view === "quick" ? ":scope > div" : ".football-route-loading__layout > div")).toHaveCount(columns);
    await expect(page.getByRole("link", { name: "Road to Glory" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`${view}.png`) });
  }
});

test("career skeleton reserves the same panel bounds and wheel size as the actual workspace", async ({ page }) => {
  for (const [width, height] of [[1024, 600], [1440, 900], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    await page.goto("/dev/career-workspace?portrait=true");
    const selectors = [".football-dashboard__story", ".football-dashboard__actions", ".football-dashboard__dossier", ".football-spinner-wheel__stage"];
    const actual = await Promise.all(selectors.map((selector) => page.locator(selector).first().boundingBox()));
    await page.goto("/dev/loading-preview?view=career");
    for (const [index, selector] of selectors.entries()) {
      const skeleton = await page.locator(selector).first().boundingBox();
      expect(skeleton, selector).not.toBeNull();
      expect(actual[index], selector).not.toBeNull();
      for (const key of index === 3 ? ["width", "height"] as const : ["x", "y", "width", "height"] as const) {
        expect(Math.abs(skeleton![key] - actual[index]![key]), `${width} ${selector} ${key}`).toBeLessThanOrEqual(2);
      }
    }
  }
});

test("splash is a real pending fallback and disappears as soon as its work completes", async ({ page }) => {
  await page.goto("/dev/loading-preview?view=splash-transition", { waitUntil: "commit" });
  await expect(page.locator(".football-branded-splash")).toBeVisible();
  await expect(page.getByTestId("splash-ready")).toBeVisible();
  await expect(page.locator(".football-branded-splash")).toHaveCount(0);
});

test("Quick skeleton uses the actual stage, tracker and responsive wheel geometry", async ({ page }) => {
  await startQuickRun(page);
  for (const [width, height] of [[1024, 600], [1440, 900], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    await page.goto("/quick/play");
    await expect(page.locator('[data-guide="quick-tracker"]')).toBeVisible();
    const selectors = [".football-quick-play__stage", ".football-quick-play__tracker", ".football-spinner-wheel__stage", ".football-quick-portrait-identity > .football-player-portrait"];
    const actual = await Promise.all(selectors.map((s) => page.locator(s).first().boundingBox()));
    await page.goto("/dev/loading-preview?view=quick");
    for (const [i, s] of selectors.entries()) {
      const box = await page.locator(s).first().boundingBox();
      // Tracker height varies with the name and stats revealed in a saved run.
      const keys = i === 1 ? ["x", "y", "width"] as const : i === 2 ? ["width", "height"] as const : ["x", "y", "width", "height"] as const;
      for (const key of keys) {
        expect(Math.abs(box![key] - actual[i]![key]), `${width} ${s} ${key}`).toBeLessThanOrEqual(2);
      }
    }
  }
});

test("landing splash follows the pending hero image and never waits for video", async ({ page }) => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/media/editorial/heritage-run-trimmed.webp", async (route) => { await pending; await route.continue(); });
  await page.goto("/en", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".football-landing-startup")).toBeVisible();
  release();
  await expect(page.locator(".football-landing-startup")).toHaveCount(0);
  await expect(page.locator("main")).not.toHaveAttribute("inert", "");
});

test("a ready landing still shows the branded entrance for at least 800 ms", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    let shownAt = 0;
    new MutationObserver(() => {
      if (document.querySelector(".football-landing-startup")) {
        shownAt ||= performance.now();
      } else if (shownAt) {
        document.documentElement.dataset.splashDuration = String(performance.now() - shownAt);
        shownAt = 0;
      }
    }).observe(document, { childList: true, subtree: true });
  });
  await page.goto("/en");
  await expect(page.locator("html")).toHaveAttribute("data-splash-duration", /\d/);
  const duration = Number(await page.locator("html").getAttribute("data-splash-duration"));
  expect(duration).toBeGreaterThanOrEqual(760);
  await expect(page.locator(".football-landing-startup")).toHaveCount(0);
});

test("the server-rendered splash covers the first paint before hydration", async ({ page }) => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route(/\/_next\/static\/.*\.js(?:\?|$)/, async (route) => { await pending; await route.continue(); });
  try {
    await page.goto("/en", { waitUntil: "commit" });
    await expect(page.locator(".football-landing-startup")).toBeVisible();
    await expect.poll(() => page.evaluate(() => Boolean(document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.closest(".football-landing-startup")))).toBe(true);
    release();
    await expect(page.locator(".football-landing-startup")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "A season can turn on a spin" })).toBeVisible();
  } finally { release(); }
});

test("splash motion follows reduced motion and a broken image does not block entry", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/dev/loading-preview?view=splash");
  const duration = await page.locator(".football-activity-line").evaluate((el) => getComputedStyle(el, "::before").animationDuration);
  expect(duration).toBe("0s");
  await page.route("**/media/editorial/heritage-run-trimmed.webp", (route) => route.fulfill({ status: 200, contentType: "image/webp", body: "" }));
  await page.goto("/en");
  await expect(page.locator(".football-landing-startup")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Play Quick Mode", exact: true })).toBeVisible();
});

test("a stalled image has a bounded splash and keyboard navigation can dismiss it", async ({ page }) => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/media/editorial/heritage-run-trimmed.webp", async (route) => { await pending; await route.continue(); });
  try {
    await page.goto("/en", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".football-landing-startup")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".football-landing-startup")).toHaveCount(0);
    await expect(page.locator("main")).not.toHaveAttribute("inert", "");
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator(".football-landing-startup")).toBeVisible();
    await expect(page.locator(".football-landing-startup")).toHaveCount(0, { timeout: 4000 });
  } finally { release(); }
});
