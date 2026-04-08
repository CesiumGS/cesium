import { globbySync } from "globby";
import { basename, dirname } from "node:path";
import { expect, test } from "./test.js";

const gallery = globbySync("packages/sandcastle/gallery/**/*.yaml");

for (const example of gallery) {
  const slug = basename(dirname(example));

  test(`${slug} renders`, async ({ page }) => {
    test.setTimeout(100000);

    // Use setFixedTime() over pauseAt() to not block the render loop of the engine
    // Keep this time in UTC so it performs the same on all machines
    await page.clock.setFixedTime(new Date("2023-12-25T14:00:00Z"));

    await page.goto(
      `http://localhost:8080/Apps/Sandcastle2/standalone.html?id=${slug}`,
    );

    await page.clock.runFor(1000);
    await page.clock.runFor(1000);
    await page.clock.runFor(1000);
    await page.clock.runFor(1000);

    await page.waitForLoadState("networkidle");

    await expect(page).toHaveScreenshot({
      timeout: 20000,
    });
  });
}
