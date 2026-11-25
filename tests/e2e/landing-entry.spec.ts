import { test, expect } from "./helpers";

for (const path of ["/", "/en"]) {
  test(`${path} waits for splash dismissal before mounting the header, hero and athlete`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.addInitScript(() => {
      const entries: { target: string; time: number; covered: boolean }[] = [];
      let shown = false;
      new MutationObserver(() => {
        const splash = document.querySelector(".football-landing-startup");
        if (splash && !shown) {
          shown = true;
          document.documentElement.dataset.entrySplashAt = String(performance.now());
        }
        if (shown && !splash && !document.documentElement.dataset.entryDismissedAt) {
          document.documentElement.dataset.entryDismissedAt = String(performance.now());
        }
      }).observe(document, { childList: true, subtree: true });
      document.addEventListener("animationstart", (event) => {
        if (event.animationName !== "football-landing-mount") return;
        const target = event.target as HTMLElement;
        entries.push({ target: target.className, time: performance.now(), covered: Boolean(document.querySelector(".football-landing-startup")) });
        document.documentElement.dataset.entryAnimations = JSON.stringify(entries);
      }, true);
    });
    let release!: () => void;
    const image = new Promise<void>((resolve) => { release = resolve; });
    await page.route("**/media/editorial/heritage-run-trimmed.webp", async (route) => { await image; await route.continue(); });
    try {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      const landing = page.locator(".football-guest-landing");
      await expect(landing).toHaveAttribute("data-entry-state", "splash");
      await expect(page.locator(".football-landing-startup")).toBeVisible();
      // Let the minimum hold expire while the image is deliberately still pending.
      await page.waitForTimeout(900);
      await expect(landing).toHaveAttribute("data-entry-state", "splash");
      await expect(page.locator(".football-guest-landing__hero")).toHaveCSS("animation-name", "none");
      await expect(page.locator(".football-guest-landing__entered")).toHaveCount(0);
      release();
      await expect(page.locator(".football-landing-startup")).toHaveCount(0);
      await expect(landing).toHaveAttribute("data-entry-state", "ready");
      await expect.poll(() => page.locator("html").getAttribute("data-entry-animations")).toMatch(/football-guest-landing__pitch/);
      const result = await page.locator("html").evaluate((html) => ({
        shown: Number(html.dataset.entrySplashAt), dismissed: Number(html.dataset.entryDismissedAt),
        animations: JSON.parse(html.dataset.entryAnimations ?? "[]") as { target: string; time: number; covered: boolean }[],
      }));
      expect(result.dismissed - result.shown).toBeGreaterThanOrEqual(760);
      expect(result.animations).toHaveLength(3);
      for (const entry of result.animations) {
        expect(entry.covered, entry.target).toBe(false);
        expect(entry.time, entry.target).toBeGreaterThanOrEqual(result.dismissed);
      }
      await page.evaluate(async () => {
        await Promise.all(document.getAnimations().filter((animation) =>
          animation instanceof CSSAnimation && animation.animationName === "football-landing-mount"
        ).map((animation) => animation.finished));
      });
      await expect(page.locator(".football-guest-landing__hero")).toHaveCSS("opacity", "1");
      await expect(page.locator(".football-guest-landing__pitch")).toHaveCSS("transform", "none");
      await page.getByRole("banner").getByRole("link", { name: path === "/" ? "Sự nghiệp" : "Career", exact: true }).click();
      expect(JSON.parse(await page.locator("html").getAttribute("data-entry-animations") ?? "[]")).toHaveLength(3);
    } finally { release(); }
  });
}

for (const preference of ["system", "account"]) {
  test(`${preference} reduced motion preserves the splash hold and skips mount motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: preference === "system" ? "reduce" : "no-preference" });
    if (preference === "account") {
      await page.addInitScript(() => localStorage.setItem("football-life:reduce-motion", "true"));
    }
    await page.goto("/en");
    await expect(page.locator(".football-landing-startup")).toBeVisible();
    await expect(page.locator(".football-guest-landing")).toHaveAttribute("data-entry-state", "ready");
    for (const selector of [".football-guest-landing__header", ".football-guest-landing__hero", ".football-guest-landing__pitch"]) {
      await expect(page.locator(selector)).toHaveCSS("animation-name", "none");
    }
    await expect(page.getByRole("link", { name: "Play Quick Mode", exact: true })).toBeVisible();
  });
}
