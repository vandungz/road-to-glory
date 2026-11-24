import { test, expect, expectNoHorizontalOverflow } from "./helpers";

for (const width of [1024, 1280, 1440, 1920]) {
  test(`desktop ${width}px keeps play visible above the gameplay section`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: width === 1024 ? 600 : 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Một lượt quay đổi cả mùa" })).toBeVisible();
    const quickMode = page.getByRole("link", { name: "Chơi Quick Mode", exact: true });
    await expect(quickMode).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole("link", { name: "Đăng nhập để chơi Classic", exact: true })).toHaveAttribute("href", "/login?next=/classic");
    await expect(page.getByRole("link", { name: "Road to Glory", exact: true })).toHaveAttribute("href", "/");
    await expect(page.getByRole("button", { name: "Chạy lại chuyển động" })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeGreaterThan(page.viewportSize()!.height);
    await expect(page.getByRole("heading", { name: "Điều gì xảy ra khi kim dừng?" })).toBeVisible();
    await expect(page.locator(".football-desktop-notice")).toBeHidden();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`home-${width}.png`), fullPage: true });
    await quickMode.click();
    await expect(page).toHaveURL(/\/quick$/);
    await expect(page.getByRole("textbox", { name: "Tên cầu thủ" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
}

test("home with an active squad fits a short desktop and keeps account actions", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1024, height: 600 });
  await page.goto("/dev/design-preview?view=Home");
  await expect(page.getByRole("button", { name: "Tiếp tục Đội hình thử nghiệm 1" })).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole("link", { name: "Tất cả đội hình" })).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole("button", { name: "Đăng xuất" })).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole("link", { name: "Vào giải đấu" })).toBeInViewport({ ratio: 1 });
  await expect(page.getByText("Football Life © Road to Glory — mùa 2025/26", { exact: true })).toBeInViewport({ ratio: 1 });
  expect(await page.getByRole("main").evaluate((element) => element.scrollHeight - element.clientHeight)).toBeLessThanOrEqual(1);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("home-active-1024.png") });
});

for (const route of ["/quick", "/quick/play", "/login", "/auth/reset-password", "/classic", "/pve"]) {
  test(`narrow screen gates direct navigation to ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route);
    await expect(page.getByRole("heading", { name: "Hãy mở game trên máy tính" })).toBeVisible();
    await expect(page.locator(".football-desktop-content")).toBeHidden();
    await expectNoHorizontalOverflow(page);
  });
}

test("1023px is gated, 1024px restores the same form draft", async ({ page }) => {
  await page.goto("/quick");
  const name = page.getByRole("textbox", { name: "Tên cầu thủ" });
  await name.fill("Giữ nguyên bản nháp");
  await page.setViewportSize({ width: 1023, height: 768 });
  await expect(page.getByRole("heading", { name: "Hãy mở game trên máy tính" })).toBeVisible();
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(name).toBeVisible();
  await expect(name).toHaveValue("Giữ nguyên bản nháp");
});

test("entry and mobile notice stay visible with JavaScript disabled", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Một lượt quay đổi cả mùa" })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByText("Mở game trên máy tính để chơi.")).toBeVisible();
  await expect(page.locator("video")).toBeVisible();
  await page.getByRole("link", { name: "FAQ", exact: true }).click();
  await expect(page).toHaveURL(/#landing-faq$/);
  await page.getByText("Có chơi trên điện thoại không?", { exact: true }).click();
  await expect(page.getByText(/cửa sổ rộng ít nhất 1024 px/)).toBeVisible();
  await context.close();
});

for (const width of [320, 390, 834, 1023]) {
  test(`guest landing at ${width}px shows the trailer and the desktop requirement`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Một lượt quay đổi cả mùa" })).toBeVisible();
    await expect(page.getByText("Mở game trên máy tính để chơi.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Chơi Quick Mode", exact: true })).toBeHidden();
    await expect(page.getByRole("link", { name: "Bắt đầu Quick Mode", exact: true })).toBeHidden();
    await expect(page.getByRole("link", { name: "Vào giải PvE", exact: true })).toBeHidden();
    await expect(page.locator(".football-desktop-notice")).toBeHidden();
    await expect(page.locator("video")).toBeVisible();
    if (width === 390) {
      await page.locator("video").scrollIntoViewIfNeeded();
      await expect.poll(() => page.locator("video").evaluate((element) => (element as HTMLVideoElement).currentTime)).toBeGreaterThan(0);
    }
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`landing-${width}.png`), fullPage: true });
  });
}

test("reduced motion shows only the poster and guests can start Quick Mode", async ({ page }) => {
  const mediaRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/media/landing/career-gameplay-v2.mp4")) mediaRequests.push(request.url());
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const trailer = page.locator("video");
  await trailer.scrollIntoViewIfNeeded();
  await page.waitForLoadState("networkidle");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /^https?:\/\/.+\/media\/landing\/career-gameplay-v2-cover\.webp$/);
  expect(mediaRequests).toHaveLength(0);
  await expect(trailer).toHaveJSProperty("paused", true);
  await expect(trailer).toHaveAttribute("poster", "/media/landing/career-gameplay-v2-cover.webp");

  await page.getByRole("link", { name: "Chơi Quick Mode", exact: true }).click();
  await page.getByRole("textbox", { name: "Tên cầu thủ" }).fill("Minh An");
  await page.getByRole("button", { name: "Bắt đầu hành trình", exact: true }).click();
  await page.getByRole("button", { name: "Quay vòng", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Độ dài sự nghiệp", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Road to Glory", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Một lượt quay đổi cả mùa" })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("video")).toBeVisible();
});

test("the desktop trailer starts muted when in view and loops", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const video = page.locator("video");
  await expect(video).toHaveAttribute("src", "/media/landing/career-gameplay-v2.mp4");
  await page.getByRole("link", { name: "Vòng quay", exact: true }).click();
  await expect(page).toHaveURL(/#landing-gameplay$/);
  await expect(video).toHaveJSProperty("muted", true);
  await expect(video).toHaveJSProperty("loop", true);
  await expect(video).not.toHaveAttribute("controls", "");
  await expect(page.locator(".football-guest-landing__trailer :is(button, a)")).toHaveCount(0);
  await expect(page.getByText("Trailer gameplay", { exact: true })).not.toBeVisible();
  await expect(page.getByText("Phát trailer", { exact: true })).not.toBeVisible();
  await expect.poll(() => video.evaluate((element) => (element as HTMLVideoElement).currentTime)).toBeGreaterThan(0);
  await expect(video).toHaveJSProperty("paused", false);
  expect(await video.evaluate((element) => (element as HTMLVideoElement).duration)).toBeGreaterThan(25);
  await video.evaluate((element: HTMLVideoElement) => {
    element.currentTime = element.duration - 0.3;
  });
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeLessThan(3);
  await page.locator("#landing-faq").scrollIntoViewIfNeeded();
  await expect(video).toHaveJSProperty("paused", true);
});

test("guest mode navigation explains access and reaches the correct entry pages", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Chế độ", exact: true }).click();
  await expect(page).toHaveURL(/#landing-modes$/);
  const modes = page.getByRole("region", { name: "Chọn cách viết sự nghiệp" });
  await expect(modes.getByRole("heading", { name: "PvE Tournament" })).toBeVisible();
  await expect(modes.getByRole("link", { name: "Vào Classic" })).toHaveAttribute("href", "/login?next=/classic");
  await expect(modes.getByRole("link", { name: "Thử ngay" })).toHaveAttribute("href", "/quick");
  await modes.getByRole("link", { name: "Vào giải PvE" }).click();
  await expect(page).toHaveURL(/\/login\?next=\/pve$/);
  await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();
});

test("protected routes retain the login boundary", async ({ page }) => {
  await page.goto("/classic");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("textbox").first()).toBeVisible();
});

test("guest career story is reachable and language selection persists on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await page.getByRole("banner").getByRole("link", { name: "Sự nghiệp", exact: true }).click();
  await expect(page).toHaveURL(/#landing-career$/);
  const career = page.getByRole("region", { name: "Một chiếc áo đầu tiên. Cả sự nghiệp phía trước." });
  await expect(career.getByRole("heading", { name: "Từ một cái tên chưa ai biết" })).toBeInViewport();
  await expect(career).toHaveClass(/football-guest-landing__entered/);
  await page.getByRole("link", { name: "Chuyển sang tiếng Anh" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page).toHaveURL(/\/en#landing-career$/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "A first shirt. A whole career ahead." })).toBeVisible();
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Support the project" })).toHaveCount(0);
  await expect(page.getByRole("contentinfo").getByText("Support the project", { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("guest navigation scrolls smoothly and FAQ animates in both directions", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await page.evaluate(() => {
    window.addEventListener("scroll", () => document.body.setAttribute("data-first-scroll", String(scrollY)), { once: true });
  });
  await page.getByRole("link", { name: "FAQ", exact: true }).click();
  await expect(page.locator("body")).toHaveAttribute("data-first-scroll", /\d+/);
  expect(Number(await page.locator("body").getAttribute("data-first-scroll"))).toBeLessThan(800);
  const faq = page.getByRole("region", { name: "Trước khi vào game" });
  await expect(faq).toBeInViewport();
  const disclosure = faq.locator("details").first();
  await disclosure.evaluate((element) => {
    element.addEventListener("transitionstart", (event) => {
      if ((event as TransitionEvent).propertyName === "grid-template-rows") {
        element.setAttribute("data-transition", element.getAttribute("data-expanded") === "true" ? "opening" : "closing");
      }
    });
  });
  const summary = disclosure.locator("summary");
  await summary.press("Enter");
  await expect(disclosure).toHaveAttribute("data-transition", "opening");
  await expect(disclosure.locator("p")).toBeVisible();
  await summary.press("Enter");
  await expect(disclosure).toHaveAttribute("data-transition", "closing");
  await expect(disclosure).not.toHaveAttribute("open", "");
  await expect(disclosure.locator("p")).toBeHidden();
  expect(await page.getByRole("contentinfo").evaluate((footer) => footer.clientWidth)).toBe(1280);
});
