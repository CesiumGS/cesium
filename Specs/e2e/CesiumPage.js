/**
 * @import {Page} from '@playwright/test'
 * @import * as Cesium from 'cesium';
 */

export class CesiumPage {
  constructor(page) {
    /** @type {Page} */
    this.page = page;
  }

  async goto() {
    await this.page.goto(`/Specs/e2e/cesium.html`);

    await this.page.addScriptTag({
      path: process.env.release
        ? "Build/Cesium/Cesium.js"
        : "Build/CesiumUnminified/Cesium.js",
    });
    await this.page.addScriptTag({
      content: process.env.release
        ? `window.CESIUM_BASE_URL = "../../Build/Cesium/";`
        : `window.CESIUM_BASE_URL = "../../Build/CesiumUnminified/";`,
    });
  }

  /**
   * @callback EvaluateCallback
   * @param {Cesium} Cesium
   * @returns void
   */

  /**
   * @param {EvaluateCallback} evaluateFunction
   */
  async runTest(evaluateFunction) {
    const cesiumRef = await this.page.evaluateHandle("Cesium");
    cesiumRef.evaluate(evaluateFunction);
  }
}
