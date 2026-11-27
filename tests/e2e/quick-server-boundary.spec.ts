import { test, expect } from "@playwright/test";
test("guest Quick Mode resolves on the server, resumes, and preserves progress on network failure", async ({ page }) => {
    const runtime: string[] = [];
    let actionRequests = 0;
    page.on("pageerror", error => runtime.push(error.message));
    page.on("request", request => { if (request.method() === "POST" && request.headers()["next-action"])
        actionRequests++; });
    await page.goto("/quick");
    const dismiss = async () => { const skip = page.getByRole("button", { name: "Bỏ qua", exact: true }); if (await skip.count())
        await skip.click(); };
    await dismiss();
    await page.getByLabel("Tên cầu thủ", { exact: true }).fill("Server Fixture");
    await page.locator(".football-quick-setup__footer button").click();
    await expect(page).toHaveURL(/\/quick\/play$/);
    await dismiss();
    const spin = page.locator(".football-quick-mode__action > button");
    const alert = page.locator(".football-quick-mode__action [role=alert]");
    await expect(spin).toBeEnabled();
    await spin.click();
    await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem("football-life:quick-mode:v5")!).setupStep)).toBe(1);
    expect(actionRequests).toBeGreaterThanOrEqual(2);
    await page.reload();
    await dismiss();
    await expect(spin).toBeEnabled();
    await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem("football-life:quick-mode:v5")!).setupStep)).toBe(1);
    let fail = true;
    await page.route("**/quick/play", route => {
        if (fail && route.request().method() === "POST" && route.request().headers()["next-action"]) {
            fail = false;
            return route.abort("failed");
        }
        return route.continue();
    });
    await spin.click();
    await expect(alert).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem("football-life:quick-mode:v5")!).setupStep)).toBe(1);
    await alert.getByRole("button").click();
    await expect(alert).toHaveCount(0);
    await expect(spin).toBeEnabled();
    await spin.click();
    await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem("football-life:quick-mode:v5")!).setupStep)).toBe(2);
    expect(runtime).toEqual([]);
});
