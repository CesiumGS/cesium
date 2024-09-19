import { Viewer } from "../index.js";

import getWebGLStub from "../../../Specs/getWebGLStub.js";

function createViewer(container, options) {
  options = options ?? {};
  options.contextOptions = options.contextOptions ?? {};
  options.contextOptions.webgl = options.contextOptions.webgl ?? {};
  if (!!window.webglStub) {
    options.contextOptions.getWebGLStub = getWebGLStub;
  }

  return new Viewer(container, options);
}
export default createViewer;
