import defaultValue from "./defaultValue.js";
import getStringFromTypedArray from "./getStringFromTypedArray.js";

/**
 * @private
 */
function getMagic(uint8Array, byteOffset) {
  byteOffset = defaultValue(byteOffset, 0);
  return getStringFromTypedArray(
    uint8Array,
    byteOffset,
    Math.min(4, uint8Array.length),
  );
}
export default getMagic;
