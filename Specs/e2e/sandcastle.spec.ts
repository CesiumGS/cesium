import { test, expect } from "./test.js";
import { globbySync } from "globby";

const gallery = globbySync("Apps/Sandcastle/gallery/*.html");

for (const example of gallery) {
  test(`${example} renders`, async ({ page }) => {
    test.setTimeout(100000);

    await page.goto(example);

    await page.clock.pauseAt(new Date("2023-12-25T14:00:00"));

    await page.waitForLoadState("networkidle");

    await page.clock.runFor(1000);
    await page.clock.runFor(1000);
    await page.clock.runFor(1000);

    await expect(page).toHaveScreenshot({
      timeout: 20000,
    });
  });
}
