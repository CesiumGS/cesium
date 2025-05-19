import sandcastle from "./Sandcastle.js";

declare global {
  /* eslint-disable no-var */
  var Cesium: typeof import("cesium");
  var Sandcastle: typeof sandcastle;
}

window.Sandcastle = sandcastle;
