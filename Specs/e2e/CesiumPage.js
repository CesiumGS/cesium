export class CesiumPage {
  constructor(page) {
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
}
