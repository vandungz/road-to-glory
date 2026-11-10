import { expect, startQuickRun, test } from "./helpers";
import { getPortraitCue, getStatsPortraitCue, getTransferPortraitCue } from "../../features/wheel/lib/portrait-reactions";

test("Classic profile offers six faces and continues with the chosen nation and position", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1024, height: 600 });
  await page.goto("/dev/draft-preview");
  const portraits = page.getByRole("group", { name: "Chân dung" });
  await expect(portraits.getByRole("radio")).toHaveCount(6);
  await expect(page.getByRole("button", { name: "Tiếp tục draft" })).toBeDisabled();
  await page.getByRole("textbox", { name: "Tên cầu thủ" }).fill("Minh Laurent");
  await page.getByRole("combobox", { name: "Quốc gia" }).click();
  await page.getByRole("textbox", { name: "Tìm trong quốc gia" }).fill("France");
  await page.getByRole("option", { name: "France", exact: true }).click();
  await page.getByRole("combobox", { name: "Vị trí" }).click();
  await page.getByRole("option", { name: "GK", exact: true }).click();
  await portraits.getByText("Mẫu 4", { exact: true }).click();
  await expect(portraits.getByRole("radio", { name: "Mẫu 4" })).toBeChecked();
  await expect(portraits.locator("video")).toHaveCount(1);
  await expect(portraits.locator('video[src$="/p04/idle.webm"]')).toHaveAttribute("data-playing", "true");
  await expect(portraits).toHaveAttribute("data-nation", "France");
  const next = page.getByRole("button", { name: "Tiếp tục draft" });
  await expect(next).toBeInViewport({ ratio: 1 });
  await page.screenshot({ path: testInfo.outputPath("classic-profile.png") });
  await next.click();
  await expect(page.getByRole("heading", { name: /Tuổi Ra Mắt/i })).toBeVisible();
  const dossier = page.getByRole("complementary", { name: "Hồ sơ cầu thủ đang draft" });
  await expect(dossier.getByRole("heading", { name: "Minh Laurent" })).toBeVisible();
  await expect(dossier.getByText("GK", { exact: true })).toBeVisible();
  await expect(dossier.locator('img[src$="/p04/default.webp"]')).toHaveCount(1);
});

test("the random branch keeps the original nationality wheel", async ({ page }) => {
  await page.goto("/dev/draft-preview");
  await page.getByRole("button", { name: "Vòng quay quyết định" }).click();
  await expect(page.getByRole("heading", { name: /Quốc Tịch/i })).toBeVisible();
  await expect(page.getByRole("group", { name: "Chân dung" })).toHaveCount(0);
});

test("Classic reacts on Panini after the result closes without reloading the idle video", async ({ page }, testInfo) => {
  for (const [step, pose, label] of [
    ["league", "celebrate", "Vô địch"], ["cup", "disappointed", "Bị loại"], ["recap", "celebrate", "Vô địch"],
    ["chain", "disappointed", "Bị loại"],
  ]) {
    await page.goto(`/dev/career-workspace?portrait=true&step=${step}`);
    const panini = page.locator(".football-panini-sticker");
    const idle = panini.locator('video[src$="/idle.webm"]');
    await expect(idle).toHaveAttribute("data-playing", "true");
    await expect(panini.getByRole("button")).toHaveCount(0);
    const node = await idle.elementHandle();
    let idleRequests = 0;
    const countIdle = (request: { url: () => string }) => {
      if (request.url().endsWith("/idle.webm")) idleRequests++;
    };
    page.on("request", countIdle);
    if (step === "league") await page.screenshot({ path: testInfo.outputPath("classic-panini.png") });
    if (step === "cup") await page.getByRole("tab", { name: "Mùa giải", exact: true }).click();
    await page.getByRole("button", { name: "Quay bánh xe" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator(".football-player-portrait")).toHaveCount(0);
    await expect(panini.getByRole("status", { includeHidden: true })).toBeEmpty();
    if (step === "league") await dialog.getByRole("button", { name: "Tiếp tục hành trình" }).click();
    else await page.keyboard.press("Escape");
    if (step === "chain") {
      await expect(dialog).toHaveAccessibleName(/Mùa giải khép lại/);
      await expect(panini.getByRole("status", { includeHidden: true })).toBeEmpty();
      await page.keyboard.press("Escape");
    }
    await expect(dialog).toBeHidden();
    await expect(panini.getByRole("status")).toHaveText(label);
    await expect(panini.getByRole("status")).toHaveClass("sr-only");
    await expect(panini.locator(`[data-pose="${pose}"]`)).toBeVisible();
    if (step === "league") {
      const reaction = panini.locator(`video[src$="/${pose}.webm"]`);
      await expect.poll(() => reaction.evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(1.1);
      await panini.screenshot({ path: testInfo.outputPath("classic-reaction.png") });
    }
    await expect(panini.getByRole("status")).toBeEmpty();
    await expect(panini.locator('[data-pose="idle"]')).toBeVisible();
    expect(await idle.evaluate((element, previous) => element === previous, node)).toBe(true);
    expect(idleRequests).toBe(0);
    page.off("request", countIdle);
  }
});

test("starting another wheel preserves the playing reaction and queues the next one", async ({ page }) => {
  await page.goto("/dev/career-workspace?portrait=true&step=continue");
  const spin = page.getByRole("button", { name: "Quay bánh xe", exact: true });
  await spin.click();
  await page.getByRole("dialog").getByRole("button", { name: "Tiếp tục hành trình" }).click();
  const panini = page.locator(".football-panini-sticker");
  const portrait = panini.locator(".football-player-portrait");
  const reaction = panini.locator('.football-player-portrait__reaction video');
  await expect(portrait).toHaveAttribute("data-pose", "celebrate");
  await reaction.evaluate((video) => video.addEventListener("ended", () => { video.dataset.firstReactionEnded = "true"; }, { once: true }));
  await spin.click();
  await expect(page.getByRole("button", { name: /Đang quay/ })).toBeDisabled();
  await expect(portrait).toHaveAttribute("data-pose", "celebrate");
  await expect.poll(() => reaction.evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(1.2);
  await expect(reaction).toHaveAttribute("src", /celebrate\.webm$/);
  await expect(portrait).toHaveAttribute("data-pose", "disappointed");
  await expect(reaction).toHaveAttribute("data-first-reaction-ended", "true");
  await expect(portrait).toHaveAttribute("data-pose", "idle");
});

test("stat decreases react immediately, with a text fallback for reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/dev/career-workspace?portrait=true&step=drop");
  await page.getByRole("button", { name: "Quay bánh xe" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const panini = page.locator(".football-panini-sticker");
  await expect(panini.getByRole("status")).toHaveText("Giảm chỉ số");
  await expect(panini.locator(".football-player-portrait > img")).toBeVisible();
  await expect(panini.locator('video[src$="/disappointed.webm"]')).toHaveCount(0);
  await expect(panini.getByRole("status")).toBeEmpty();
});

test("Quick keeps the same animated default after reload and respects reduced motion", async ({ page }, testInfo) => {
  await startQuickRun(page, "France");
  const portrait = page.locator(".football-quick-portrait-identity .football-player-portrait");
  const video = portrait.locator("video");
  await expect(video).toHaveAttribute("data-playing", "true");
  const source = await video.getAttribute("src");
  expect(source).toMatch(/\/p0[1-6]\/idle\.webm$/);
  await page.screenshot({ path: testInfo.outputPath("quick-portrait.png") });
  await portrait.getByRole("button", { name: "Dừng chuyển động chân dung" }).click();
  await expect(video).toHaveCount(0);
  await portrait.getByRole("button", { name: "Phát chuyển động chân dung" }).click();
  await expect(video).toHaveAttribute("data-playing", "true");
  await page.reload();
  await expect(video).toHaveAttribute("src", source!);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(video).toHaveCount(0);
  await expect(portrait.locator("img")).toBeVisible();
});

test("national callup and omission react when their results are visible", async ({ page }) => {
  const panini = page.locator(".football-panini-sticker");
  for (const outcome of ["called_up", "missed"]) {
    await page.goto(`/dev/career-workspace?portrait=true&step=${outcome}`);
    await page.getByRole("button", { name: "Quay bánh xe" }).click();
    if (outcome === "missed") {
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(panini.getByRole("status")).toBeEmpty();
      await page.keyboard.press("Escape");
    }
    await expect(panini.locator(".football-player-portrait")).toHaveAttribute("data-pose", outcome === "called_up" ? "celebrate" : "disappointed");
  }
});

test("a committed transfer reaction is consumed once on returning to the career", async ({ page }) => {
  await page.goto("/dev/career-workspace");
  await page.evaluate(() => sessionStorage.setItem("panini-transfer:preview", "disappointed"));
  await page.goto("/dev/career-workspace?portrait=true&step=transfer-reaction");
  const panini = page.locator(".football-panini-sticker");
  await expect(panini.locator(".football-player-portrait")).toHaveAttribute("data-pose", "disappointed");
  expect(await page.evaluate(() => sessionStorage.getItem("panini-transfer:preview"))).toBeNull();
  await page.reload();
  await expect(panini.locator('video[src$="/idle.webm"]')).toHaveAttribute("data-playing", "true");
  await expect(panini.getByRole("status")).toBeEmpty();
});

test("Classic maps league, cups, national selection, final stat changes and club prestige", () => {
  expect(getPortraitCue("standing", 1, "a", 20)).toMatchObject({ pose: "celebrate", surface: "league", label: "Vô địch" });
  expect(getPortraitCue("standing", 10, "b", 20)).toMatchObject({ pose: "celebrate", label: "Hạng 10" });
  expect(getPortraitCue("standing", 11, "c", 20)).toMatchObject({ pose: "disappointed", label: "Hạng 11" });
  expect(getPortraitCue("domestic_cup", "Runner-Up", "d")).toMatchObject({ pose: "disappointed", surface: "cup" });
  expect(getPortraitCue("continental_cup", "Winner", "e")).toMatchObject({ pose: "celebrate", surface: "continental" });
  expect(getPortraitCue("national_tournament", "Group Stage", "f")).toMatchObject({ pose: "disappointed", surface: "recap" });
  expect(getPortraitCue("magnitude", 2, "g")).toBeNull();
  expect(getStatsPortraitCue(0, "h")).toBeNull();
  expect(getStatsPortraitCue(4, "i")).toMatchObject({ pose: "celebrate", surface: "panini" });
  expect(getStatsPortraitCue(-2, "j")).toMatchObject({ pose: "disappointed", surface: "panini" });
  const source = { id: "source", prestige: 3 };
  expect(getTransferPortraitCue(source, { id: "stronger", prestige: 4 }, "k")).toMatchObject({ pose: "celebrate" });
  expect(getTransferPortraitCue(source, { id: "equal", prestige: 3 }, "l")).toMatchObject({ pose: "celebrate" });
  expect(getTransferPortraitCue(source, { id: "weaker", prestige: 2 }, "m")).toMatchObject({ pose: "disappointed" });
  expect(getTransferPortraitCue(source, source, "n")).toBeNull();
});
