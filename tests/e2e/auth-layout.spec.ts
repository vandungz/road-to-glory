import { test, expect, expectNoHorizontalOverflow } from "./helpers";

test("auth forms fit desktop heights without page or panel scroll and keep controls visible", async ({ page }, testInfo) => {
  for (const viewport of [{ width: 1024, height: 768 }, { width: 1280, height: 720 }, { width: 1280, height: 800 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    for (const route of ["/login", "/login?error=link_expired", "/login?verify=1", "/auth/reset-password"]) {
      await page.goto(route);
      await page.locator(".football-auth-panel").waitFor();
      for (const mode of route.startsWith("/login") && route !== "/login?verify=1" ? ["Đăng nhập", "Đăng ký"] : [null]) {
        if (mode) await page.getByRole("tab", { name: mode, exact: true }).click();
        if (mode) {
          await expect(page.locator(".football-auth-submit")).toHaveCSS("animation-name", "none");
          await expect(page.locator(".football-auth-submit")).toHaveCSS("opacity", "1");
        }
        await expectNoHorizontalOverflow(page);
        const fit = await page.evaluate(() => {
          const panel = document.querySelector(".football-auth-form-column__body")!;
          const panelBox = panel.getBoundingClientRect();
          const clipped = [...panel.querySelectorAll("input, button, a")].filter((control) => {
            const box = control.getBoundingClientRect();
            return box.width > 0 && (box.top < panelBox.top || box.bottom > panelBox.bottom);
          }).map((control) => control.textContent || control.getAttribute("id"));
          return { documentHeight: document.documentElement.scrollHeight, panelScroll: panel.scrollHeight, panelHeight: panel.clientHeight, clipped };
        });
        expect(fit.documentHeight).toBeLessThanOrEqual(viewport.height + 1);
        expect(fit.panelScroll).toBeLessThanOrEqual(fit.panelHeight + 1);
        expect(fit.clipped).toEqual([]);
      }
    }
    await page.goto("/login");
    await page.screenshot({ path: testInfo.outputPath(`login-${viewport.width}x${viewport.height}.png`), fullPage: true });
  }
});

test("signup verification can be reopened and requires six digits", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("example@example.test");
  await page.getByRole("button", { name: "Nhập mã xác nhận" }).click();
  await expect(page.getByLabel("Email")).toHaveValue("example@example.test");
  await expect(page.getByLabel("Mã xác nhận")).toHaveAttribute("autocomplete", "one-time-code");
  const code = page.getByLabel("Mã xác nhận");
  for (const value of ["12345", "abcdef", "012345"]) {
    await code.fill(value);
    expect(await code.evaluate((input: HTMLInputElement) => input.validity.valid)).toBe(value === "012345");
  }
  await page.getByRole("button", { name: "Quay lại đăng nhập" }).click();
  await expect(page.getByRole("tab", { name: "Đăng nhập" })).toHaveAttribute("aria-selected", "true");
  await page.goto("/login?verify=1");
  await expect(page.getByRole("button", { name: "Xác nhận email" })).toBeVisible();
});

test("PvE leaves space below the divider and all record media rails are transparent", async ({ page }) => {
  for (const view of ["PvE", "Classic", "Giải nghệ"]) {
    await page.goto(`/dev/design-preview?view=${encodeURIComponent(view)}`);
    const rail = page.locator(".football-editorial-rail");
    await expect(rail).toBeVisible();
    expect(await rail.evaluate((node) => getComputedStyle(node).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
    if (view === "PvE") {
      const header = (await page.locator(".football-pve-lobby__intro").boundingBox())!;
      const records = (await page.locator(".football-pve-lobby__list").boundingBox())!;
      expect(records.y - header.y - header.height).toBeGreaterThanOrEqual(24);
    }
  }
});
