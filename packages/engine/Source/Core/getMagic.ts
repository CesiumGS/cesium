import getStringFromTypedArray from "./getStringFromTypedArray.js";

/**
 * @private
 */
function getMagic(uint8Array: any, byteOffset: any) {
  byteOffset = byteOffset ?? 0;
  return getStringFromTypedArray(
    uint8Array,
    byteOffset,
    Math.min(4, uint8Array.length),
  );
}
export default getMagic;
