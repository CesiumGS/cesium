import { test, expect } from "./test.js";
import { globbySync } from "globby";

const gallery = globbySync("Apps/Sandcastle/gallery/*.html");

function waitFor(delay) {
  return new Promise((resolve) => setTimeout(resolve, delay));
}

for (const example of gallery) {
  test(`${example} renders`, async ({ page }) => {
    test.setTimeout(100000);

    await page.goto(example);

    await page.clock.pauseAt(new Date("2023-12-25T14:00:00"));

    await page.waitForLoadState("networkidle");

    await page.clock.runFor(1000);
    await page.clock.runFor(1000);
    await page.clock.runFor(1000);
    // await page.clock.runFor(1000);
    // await page.clock.runFor(1000);

    // await page.clock.runFor(1000);
    // await page.clock.runFor(1000);
    // await page.clock.runFor(1000);
    // await page.clock.runFor(1000);
    // await page.clock.runFor(1000);

    // await page.waitForLoadState("networkidle");
    // await page.waitForTimeout(1000);
    // await page.waitForTimeout(1000);
    // await page.waitForTimeout(1000);
    // await page.waitForTimeout(1000);
    // await waitFor(2000);

    // const checkState = { noActivity: 0, requiredForStable: 20 };
    // await page.waitForFunction(
    //   (checkState) => {
    //     const hasActiveRequests =
    //       Cesium.RequestScheduler.statistics.numberOfActiveRequests > 0;
    //     console.log({ noActivity: checkState.noActivity, hasActiveRequests });
    //     if (hasActiveRequests) {
    //       checkState.noActivity = 0;
    //       return false;
    //     }
    //     checkState.noActivity++;
    //     if (checkState.noActivity >= checkState.requiredForStable) {
    //       // require multiple checks of no network requests to consider this "stable"
    //       return true;
    //     }
    //   },
    //   checkState,
    //   { polling: 1000, timeout: 30000 },
    // );

    // const checkState = { noActivity: 0, requiredForStable: 20 };
    // await page.evaluate(async (checkState) => {
    //   await new Promise((resolve, reject) => {
    //     const loop = setInterval(() => {
    //       console.log({ noActivity: checkState.noActivity, hasActiveRequests });
    //       const hasActiveRequests =
    //         Cesium.RequestScheduler.statistics.numberOfActiveRequests > 0;
    //       if (hasActiveRequests) {
    //         checkState.noActivity = 0;
    //       } else {
    //         checkState.noActivity++;
    //       }

    //       if (checkState.noActivity > checkState.requiredForStable) {
    //         clearInterval(loop);
    //         resolve(undefined);
    //       }
    //     }, 100);
    //   });
    //   // while (checkState.noActivity < checkState.requiredForStable) {
    //   //   const hasActiveRequests =
    //   //     Cesium.RequestScheduler.statistics.numberOfActiveRequests > 0;
    //   //   console.log({ noActivity: checkState.noActivity, hasActiveRequests });
    //   //   if (hasActiveRequests) {
    //   //     checkState.noActivity = 0;
    //   //   } else {
    //   //     checkState.noActivity++;
    //   //   }
    //   //   // if (checkState.noActivity >= checkState.requiredForStable) {
    //   //   //   console.log("break");
    //   //   //   // require multiple checks of no network requests to consider this "stable"
    //   //   //   break;
    //   //   // }

    //   //   await new Promise((resolve) => setTimeout(resolve, 1000));
    //   //   console.log("promise done");
    //   // }
    //   // console.log("loop done");
    //   return true;
    // }, checkState);

    // const cesiumHandle = await page.evaluateHandle(() => Cesium);

    // const checkState = { noActivity: 0, requiredForStable: 20 };
    // let hasActiveRequests =
    //   cesiumHandle.RequestScheduler.statistics.numberOfActiveRequests > 0;
    // console.log("has active", hasActiveRequests, cesiumHandle);
    // while (checkState.noActivity < checkState.requiredForStable) {
    //   console.log({ noActivity: checkState.noActivity, hasActiveRequests });
    //   if (hasActiveRequests) {
    //     checkState.noActivity = 0;
    //     break;
    //   }
    //   checkState.noActivity++;
    //   if (checkState.noActivity >= checkState.requiredForStable) {
    //     // require multiple checks of no network requests to consider this "stable"
    //     break;
    //   }
    //   hasActiveRequests =
    //     cesiumHandle.RequestScheduler.statistics.numberOfActiveRequests > 0;
    // }

    await expect(page).toHaveScreenshot({
      timeout: 20000,
    });
  });
}
