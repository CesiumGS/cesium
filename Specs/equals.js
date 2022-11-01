import { FeatureDetection } from "@cesium/engine";

function isTypedArray(o) {
  return FeatureDetection.typedArrayTypes.some(function (type) {
    return o instanceof type;
  });
}

function typedArrayToArray(array) {
  if (array !== null && typeof array === "object" && isTypedArray(array)) {
    return Array.prototype.slice.call(array, 0);
  }
  return array;
}

function equals(util, a, b) {
  a = typedArrayToArray(a);
  b = typedArrayToArray(b);
  return util.equals(a, b);
}
export default equals;
