// The 1.x styling engine as the oracle (bundled by run.mjs with the same
// aliases vite gives the parity tests).
import Cesium3DTileStyle from "cesium-engine-oracle/Scene/Cesium3DTileStyle.js";
import Color from "cesium-oracle/Color.js";

const cache = new Map();

export function evaluate1x(style, row) {
  const key = JSON.stringify(style);
  let s = cache.get(key);
  if (!s) {
    s = new Cesium3DTileStyle(style);
    cache.set(key, s);
  }
  const feature = {
    getProperty: (n) => row[n],
    getPropertyInherited: (n) => row[n],
  };
  const c = s.color.evaluateColor(feature, new Color());
  return {
    show: s.show.evaluate(feature),
    color: [c.red, c.green, c.blue, c.alpha],
  };
}
