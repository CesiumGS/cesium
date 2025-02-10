import { defaultValue } from "@cesium/engine";
import { Viewer } from "../index.js";

import getWebGLStub from "../../../Specs/getWebGLStub.js";

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
