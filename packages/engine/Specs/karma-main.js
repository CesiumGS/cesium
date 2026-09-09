/*global __karma__*/
import customizeJasmine from "../../../Specs/customizeJasmine.js";

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

window.CESIUM_BASE_URL = "base/packages/engine/Build";

jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;
customizeJasmine(
  jasmine.getEnv(),
  includeCategory,
  excludeCategory,
  webglValidation,
  webglStub,
  release,
  debugCanvasWidth,
  debugCanvasHeight,
);
