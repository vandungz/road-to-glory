import { test, expect, expectNoHorizontalOverflow } from "./helpers";

test("Google OAuth rejects cross-origin initiation before contacting the provider", async ({ request }) => {
  const response = await request.post("/auth/google", {
    headers: { origin: "https://untrusted.example" },
    form: { next: "/classic" },
    maxRedirects: 0,
  });
  expect(response.status()).toBe(403);
});

test("Google sign-in starts as a document POST without submitting email credentials", async ({ page }) => {
  let posted = false;
  await page.route("**/auth/google", async (route) => {
    const request = route.request();
    expect(request.method()).toBe("POST");
    expect(request.resourceType()).toBe("document");
    expect([...new URLSearchParams(request.postData() ?? "").entries()]).toEqual([["next", "/classic"]]);
    posted = true;
    await route.fulfill({ contentType: "text/html", body: "<p>OAuth navigation received</p>" });
  });
  await page.goto("/login?next=/classic");
  await page.getByLabel("Email").fill("example@example.test");
  await page.getByRole("button", { name: "Tiếp tục với Google" }).click();
  await expect(page.getByText("OAuth navigation received")).toBeVisible();
  expect(posted).toBe(true);
});

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

test("sign-in has no verification shortcut and signup email verification requires six digits", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Nhập mã xác nhận" })).toHaveCount(0);
  await expect(page.getByLabel("Mã xác nhận")).toHaveCount(0);
  await page.getByRole("tab", { name: "Đăng ký", exact: true }).click();
  await expect(page.getByLabel("Mã xác nhận")).toHaveCount(0);
  await page.goto("/login?verify=1");
  await expect(page.getByLabel("Mã xác nhận")).toHaveAttribute("autocomplete", "one-time-code");
  const code = page.getByLabel("Mã xác nhận");
  await expect(code).toHaveAttribute("maxlength", "6");
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
