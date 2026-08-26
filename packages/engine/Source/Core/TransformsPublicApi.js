// Backwards-compatible public API shim combining Transforms and IcrfTransforms.
// Internal code should import Transforms.js or IcrfTransforms.js directly.
// This file exists solely so that Cesium.Transforms still exposes ICRF methods.
import Transforms from "./Transforms.js";
import IcrfTransforms from "./IcrfTransforms.js";

export default new Proxy(Transforms, {
  get(target, prop) {
    if (Object.prototype.hasOwnProperty.call(IcrfTransforms, prop)) {
      return IcrfTransforms[prop];
    }
    return target[prop];
  },
  set(target, prop, value) {
    if (Object.prototype.hasOwnProperty.call(IcrfTransforms, prop)) {
      IcrfTransforms[prop] = value;
    } else {
      target[prop] = value;
    }
    return true;
  },
});
