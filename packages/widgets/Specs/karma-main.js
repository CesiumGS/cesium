/*global __karma__*/
import customizeJasmine from "../../../Specs/customizeJasmine.js";
import { createBaseMatchers } from "../../../Specs/createBaseMatchers.js";
import { createRendererMatchers } from "../../../Specs/createRendererMatchers.js";
import { createAsyncMatchers } from "../../../Specs/createAsyncMatchers.js";

let includeCategory = "";
let excludeCategory = "";
let webglValidation = false;
let webglStub = false;
let release = false;
let debugCanvasWidth;
let debugCanvasHeight;

if (__karma__.config.args) {
  includeCategory = __karma__.config.args[0];
  excludeCategory = __karma__.config.args[1];
  webglValidation = __karma__.config.args[2];
  webglStub = __karma__.config.args[3];
  release = __karma__.config.args[4];
  debugCanvasWidth = __karma__.config.args[5];
  debugCanvasHeight = __karma__.config.args[6];
}

if (release) {
  window.CESIUM_BASE_URL = "base/Build/Cesium";
} else {
  window.CESIUM_BASE_URL = "base/Build/CesiumUnminified";
}

jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;

const env = jasmine.getEnv();
env.beforeEach(function () {
  const debug = !release;
  env.addMatchers({
    ...createBaseMatchers(debug),
    ...createRendererMatchers(),
  });
  env.addAsyncMatchers(createAsyncMatchers(debug));
});
customizeJasmine(env, {
  includedCategory: includeCategory,
  excludedCategory: excludeCategory,
  webglValidation,
  webglStub,
  release,
  debugCanvasWidth,
  debugCanvasHeight,
});
