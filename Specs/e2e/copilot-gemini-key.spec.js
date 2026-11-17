import { test, expect } from "./test.js";

test.beforeEach(async ({ page }) => {
  // Dummy credentials must never leave the local test server.
  await page.route("**/*", (route) => {
    const { hostname } = new URL(route.request().url());
    return hostname === "localhost" || hostname === "127.0.0.1"
      ? route.continue()
      : route.abort();
  });
  await page.goto("/Apps/Sandcastle2/");
  await page
    .getByRole("button", { name: "Cesium Copilot", exact: true })
    .click();
  await page.getByRole("button", { name: "Open API key settings" }).click();
  await page.getByRole("tab", { name: "Gemini", exact: true }).click();
});

for (const key of [
  "AIza-test-only-not-a-real-key-1234567890",
  "AQ.test-only-not-a-real-key-1234567890",
]) {
  test(`saves ${key.startsWith("AI") ? "standard" : "authorization"} Gemini keys with surrounding whitespace`, async ({
    page,
  }) => {
    const dialog = page.getByRole("dialog", { name: "API Configuration" });
    await dialog
      .getByRole("tabpanel")
      .getByLabel("API Key", { exact: true })
      .fill(`  ${key}  `);
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    await expect(dialog).not.toBeVisible();
    expect(
      await page.evaluate(() =>
        sessionStorage.getItem("sandcastle_gemini_api_key"),
      ),
    ).toBe(key);
  });
}

test("rejects whitespace-only and internally spaced Gemini keys", async ({
  page,
}) => {
  const dialog = page.getByRole("dialog", { name: "API Configuration" });
  const input = dialog
    .getByRole("tabpanel")
    .getByLabel("API Key", { exact: true });
  const save = dialog.getByRole("button", { name: "Save", exact: true });
  await input.fill("   ");
  await expect(save).toBeDisabled();
  // Long enough to pass the old prefix/length check despite the embedded space.
  await input.fill("AIza-test-only invalid-key-1234567890");
  await save.click();
  await expect(
    dialog.getByText("Please enter a Gemini API key without spaces.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("sandcastle_gemini_api_key"),
    ),
  ).toBeNull();
});
