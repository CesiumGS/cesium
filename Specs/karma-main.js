/*global __karma__*/
import customizeJasmine from "./customizeJasmine.js";

let includeCategory = "";
let excludeCategory = "";
let webglValidation = false;
let webglStub = false;
let release = false;

if (__karma__.config.args) {
  includeCategory = __karma__.config.args[0];
  excludeCategory = __karma__.config.args[1];
  webglValidation = __karma__.config.args[4];
  webglStub = __karma__.config.args[5];
  release = __karma__.config.args[6];
}

if (release) {
  window.CESIUM_BASE_URL = "base/Build/Cesium";
} else {
  window.CESIUM_BASE_URL = "base/Source";
}

jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;
customizeJasmine(
  jasmine.getEnv(),
  includeCategory,
  excludeCategory,
  webglValidation,
  webglStub,
  release
);
