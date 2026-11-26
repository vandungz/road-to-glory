import { test, expect } from "@playwright/test";

// Dummy transport responses only; no provider, real credentials or database writes.
test("login waits for JSON before document navigation and recovers from failures", async ({ page, baseURL }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let attempts = 0;
  let releaseSuccess: (() => void) | undefined;
  const successGate = new Promise<void>((resolve) => { releaseSuccess = resolve; });
  await page.route("**/auth/session", async (route) => {
    const request = route.request();
    expect(request.method()).toBe("POST");
    expect(request.headers()["next-action"]).toBeUndefined();
    expect(request.postDataJSON()).toEqual({ operation: "login", input: { email: "fixture@example.invalid", password: "dummy-password" } });
    attempts++;
    if (attempts === 1) return route.abort("failed");
    if (attempts === 2) return route.fulfill({ json: { success: false, error: "Fixture rejected credentials" } });
    await successGate;
    return route.fulfill({ json: { success: true } });
  });
  await page.route(new URL("/", baseURL).href, (route) => route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Fixture home</title><main>Fixture home</main>" }));
  await page.goto("/login");
  await page.locator("#football-email").fill("fixture@example.invalid");
  await page.locator("#football-pass").fill("dummy-password");
  const submit = page.locator("#football-auth-form button[type=submit]");
  await submit.click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(submit).toBeEnabled();
  await expect(page).toHaveURL(/\/login$/);
  await submit.click();
  await expect(page.getByRole("alert")).toHaveText("Fixture rejected credentials");
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(submit).toBeDisabled();
  await expect(page.locator("#football-auth-form")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  releaseSuccess!();
  await expect(page).toHaveURL(new URL("/", baseURL).href);
  await expect(page.getByRole("main")).toHaveText("Fixture home");
  expect(attempts).toBe(3);
  expect(errors).toEqual([]);
});
