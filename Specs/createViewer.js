import { defaultValue } from "../Source/Cesium.js";
import getWebGLStub from "./getWebGLStub.js";
import { Viewer } from "../Source/Cesium.js";

function createViewer(container, options) {
  options = defaultValue(options, {});
  options.contextOptions = defaultValue(options.contextOptions, {});
  options.contextOptions.webgl = defaultValue(options.contextOptions.webgl, {});
  if (!!window.webglStub) {
    options.contextOptions.getWebGLStub = getWebGLStub;
  }

  return new Viewer(container, options);
}
export default createViewer;
