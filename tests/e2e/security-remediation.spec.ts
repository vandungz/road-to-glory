import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    for (const id of ["quickSetup", "quickPlay"]) localStorage.setItem(`football-life:guide:${id}:v1`, "seen");
  });
});

test("production documents get unique nonces and hydrate without unsafe inline scripts", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto("/quick");
  const policy = response!.headers()["content-security-policy"];
  expect(response!.headers()["x-frame-options"]).toBe("DENY");
  expect(policy).toContain("frame-ancestors 'none'");
  const scripts = policy.split(";").find((part) => part.trim().startsWith("script-src"))!;
  expect(scripts).toContain("'strict-dynamic'");
  expect(scripts).not.toMatch(/unsafe-inline|unsafe-eval/);
  const nonce = /'nonce-([^']+)'/.exec(scripts)![1];
  const input = page.getByRole("textbox", { name: "Tên cầu thủ", exact: true });
  await input.fill("Nonce Player");
  await expect(input).toHaveValue("Nonce Player");
  expect(await page.locator("script").evaluateAll((nodes) => nodes.map((node) => node as HTMLScriptElement).filter((node) => node.src || node.textContent?.trim()).every((node) => node.nonce === document.querySelector<HTMLScriptElement>("script[nonce]")?.nonce))).toBe(true);
  expect(await page.locator("script[nonce]").first().evaluate((node) => (node as HTMLScriptElement).nonce)).toBe(nonce);
  const next = await page.request.get("/privacy");
  expect(next.headers()["content-security-policy"]).not.toContain(`'nonce-${nonce}'`);
  expect(next.headers()["cache-control"]).toContain("no-store");
  expect(errors).toEqual([]);
});

test("CSP rejects untrusted script elements and inline event handlers", async ({ page }) => {
  const response = await page.request.get("/privacy");
  await page.addInitScript(() => {
    const violations: string[] = [];
    document.addEventListener("securitypolicyviolation", (event) => violations.push(event.violatedDirective));
    Object.assign(window, { securityFixture: { ran: false, clicked: false, violations } });
  });
  // Parser-inserted markup models an attacker; CDP evaluate is a trusted script initiator.
  await page.route("**/__security-csp-fixture", (route) => route.fulfill({
    contentType: "text/html",
    headers: { "content-security-policy": response.headers()["content-security-policy"] },
    body: '<!doctype html><script>window.securityFixture.ran=true</script><button onclick="window.securityFixture.clicked=true">Fixture</button>',
  }));
  await page.goto("/__security-csp-fixture");
  await page.getByRole("button", { name: "Fixture", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { securityFixture: { violations: string[] } }).securityFixture.violations.length)).toBeGreaterThanOrEqual(2);
  expect(await page.evaluate(() => {
    const value = (window as unknown as { securityFixture: { ran: boolean; clicked: boolean } }).securityFixture;
    return { ran: value.ran, clicked: value.clicked };
  })).toEqual({ ran: false, clicked: false });
});

test("image-suffixed protected URLs and static assets retain frame denial", async ({ request }) => {
  const id = "00000000-0000-4000-8000-000000000001";
  for (const url of [`/classic/${id}/draft/0.png`, `/${id}/draft/0.svg`, "/dev/preview.png", "/media/editorial/trophy-collection.webp"]) {
    const response = await request.get(url, { maxRedirects: 0 });
    expect(response.headers()["x-frame-options"]).toBe("DENY");
    expect(response.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
    if (!url.startsWith("/media/")) expect(response.status()).toBe(url.startsWith("/dev/") ? 307 : 404);
    else expect(response.headers()["content-type"]).toContain("image/webp");
  }
});

test("same-origin iframe cannot render the protected document", async ({ page }) => {
  await page.goto("/privacy");
  const denied = page.waitForEvent("console", { predicate: (message) => /frame-ancestors|X-Frame-Options/i.test(message.text()) });
  await page.evaluate(() => {
    const frame = document.createElement("iframe");
    frame.src = "/terms";
    frame.id = "frame-fixture";
    document.body.append(frame);
  });
  await denied;
  await expect.poll(() => page.evaluate(() => {
    const frame = document.getElementById("frame-fixture") as HTMLIFrameElement;
    try { return !frame.contentDocument || frame.contentDocument.body?.innerText === ""; }
    catch { return true; }
  })).toBe(true);
});

test("player name remains literal text and the wheel works under production CSP", async ({ page }) => {
  const errors: string[] = [];
  const dialogs: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("dialog", async (dialog) => { dialogs.push(dialog.message()); await dialog.dismiss(); });
  const payload = "<img src=x onerror=alert(1)>";
  await page.goto("/quick");
  await page.getByRole("textbox", { name: "Tên cầu thủ", exact: true }).fill(payload);
  await page.getByRole("button", { name: "Bắt đầu hành trình", exact: true }).click();
  await expect(page).toHaveURL(/\/quick\/play$/);
  await expect(page.getByText(payload, { exact: true }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByText(payload, { exact: true }).first()).toBeVisible();
  await expect(page.locator("img[src=x], img[onerror]")).toHaveCount(0);
  await page.getByRole("button", { name: "Quay vòng", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Độ dài sự nghiệp", exact: true })).toBeVisible({ timeout: 30_000 });
  await page.locator(".football-header-language").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByText(payload, { exact: true }).first()).toBeVisible();
  expect(dialogs).toEqual([]);
  expect(errors).toEqual([]);
});
