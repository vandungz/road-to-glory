import { test, expect, startQuickRun, expectNoHorizontalOverflow } from "./helpers";
import { test as networkFailureTest } from "@playwright/test";
import { readFileSync } from "node:fs";
import assets from "../../features/audio/audio-assets.json";
import { AUDIO_STORAGE_KEY } from "../../features/audio/audio-preferences";

test("audio stays unloaded before interaction and music is opt-in", async ({ page }) => {
  const audio: string[] = [];
  page.on("request", (request) => { if (request.url().includes("/media/audio/")) audio.push(request.url()); });
  await page.goto("/quick");
  await expect(page.getByRole("heading", { name: "Quick Mode", exact: true })).toBeVisible();
  expect(audio).toEqual([]);
  await page.getByRole("textbox", { name: "Tên cầu thủ" }).fill("Audio Test");
  expect(audio.some((url) => url.endsWith(assets.music))).toBe(false);
});

test("settings persist volume, mute and music preferences without a Credits footer", async ({ page }, testInfo) => {
  await page.goto("/settings?tab=audio");
  const music = page.getByRole("switch", { name: "Nhạc nền", exact: true });
  await expect(music).not.toBeChecked();
  await music.check();
  await page.getByRole("slider", { name: "Âm lượng nhạc" }).fill("25");
  await page.getByRole("switch", { name: "Tắt toàn bộ âm thanh", exact: true }).check();
  await page.reload();
  await expect(music).toBeChecked();
  await expect(page.getByRole("slider", { name: "Âm lượng nhạc" })).toHaveValue("25");
  await expect(page.getByRole("switch", { name: "Tắt toàn bộ âm thanh", exact: true })).toBeChecked();
  await expect(page.getByRole("button", { name: "Nghe thử hiệu ứng" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Credits", exact: true })).toHaveCount(0);
  await page.setViewportSize({ width: 1024, height: 600 });
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("audio-settings.png"), fullPage: true });
});

test("replaying an effect fetches it once and muting survives navigation", async ({ page }) => {
  await page.addInitScript(() => {
    const browser = window as unknown as { audioSources: number };
    browser.audioSources = 0;
    const createSource = AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource = function () { browser.audioSources++; return createSource.call(this); };
  });
  const downloads: string[] = [];
  page.on("request", (request) => { if (request.url().endsWith(assets.click)) downloads.push(request.url()); });
  await page.goto("/settings?tab=audio");
  await page.getByRole("tab", { name: "Ngôn ngữ", exact: true }).click();
  await expect.poll(() => downloads.length).toBe(1);
  await page.waitForLoadState("networkidle");
  await page.getByRole("tab", { name: "Âm thanh", exact: true }).click();
  await page.waitForLoadState("networkidle");
  expect(downloads).toHaveLength(1);
  expect(await page.evaluate(() => (window as unknown as { audioSources: number }).audioSources)).toBeGreaterThan(0);
  await page.getByRole("banner").getByRole("button", { name: "Âm thanh", exact: true }).click();
  await page.getByRole("dialog", { name: "Âm thanh", exact: true }).getByRole("switch", { name: "Tắt toàn bộ âm thanh", exact: true }).check();
  await startQuickRun(page);
  await page.getByRole("banner").getByRole("button", { name: "Âm thanh", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Âm thanh", exact: true }).getByRole("switch", { name: "Tắt toàn bộ âm thanh", exact: true })).toBeChecked();
  const preferences = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), AUDIO_STORAGE_KEY);
  expect(preferences.muted).toBe(true);
});

test("static audio is content-addressed and has immutable caching headers", async ({ request }) => {
  const response = await request.get(assets.tick);
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("public, max-age=31536000, immutable");
  expect(response.headers()["content-type"]).toContain("audio/mpeg");
  expect((await response.body()).byteLength).toBeLessThan(10_000);
  const stream = await request.get(assets.music, { headers: { Range: "bytes=0-1023" } });
  expect(stream.status()).toBe(206);
  expect(stream.headers()["content-range"]).toMatch(/^bytes 0-1023\//);
  expect((await stream.body()).byteLength).toBe(1024);
});

test("slow audio does not delay input feedback or a completed wheel", async ({ page }) => {
  await page.route("**/media/audio/**", async (route) => {
    const asset = Object.values(assets).find((path) => route.request().url().endsWith(path));
    if (!asset) return route.abort();
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await route.fulfill({ contentType: "audio/mpeg", body: readFileSync(`public${asset}`) });
  });
  await startQuickRun(page);
  await page.evaluate(() => {
    document.addEventListener("click", (event) => {
      const button = event.target instanceof Element ? event.target.closest("button") : null;
      if (button?.textContent?.trim() !== "Quay vòng") return;
      const start = performance.now();
      const observer = new MutationObserver(() => {
        if (!button.disabled) return;
        (window as unknown as { audioInputMs: number }).audioInputMs = performance.now() - start;
        observer.disconnect();
      });
      observer.observe(button, { attributes: true, attributeFilter: ["disabled"] });
    }, { capture: true });
  });
  await page.getByRole("button", { name: "Quay vòng", exact: true }).click();
  await expect(page.getByRole("button", { name: "Đang quay…", exact: true })).toBeDisabled();
  const inputMs = await page.evaluate(() => (window as unknown as { audioInputMs: number }).audioInputMs);
  expect(inputMs).toBeLessThan(500);
  console.log(`Wheel input feedback with 2s audio delay: ${inputMs.toFixed(1)} ms`);
  await expect(page.getByRole("heading", { name: "Độ dài sự nghiệp", exact: true })).toBeVisible();
});

networkFailureTest("unavailable audio does not block wheel progression", async ({ page }) => {
  await page.route("**/media/audio/**", (route) => route.abort());
  // This case expects network errors only for the audio requests it deliberately aborts.
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && !(message.text().includes("ERR_FAILED") && message.location().url.includes("/media/audio/"))) errors.push(message.text());
  });
  await startQuickRun(page);
  await page.getByRole("button", { name: "Quay vòng", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Độ dài sự nghiệp", exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
