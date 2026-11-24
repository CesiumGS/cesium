// @ts-check

import getStringFromTypedArray from "./getStringFromTypedArray.js";

/**
 * @param {Uint8Array} uint8Array
 * @param {number} [byteOffset=0]
 * @returns {string}
 * @internal
 */
function getMagic(uint8Array, byteOffset) {
  byteOffset = byteOffset ?? 0;
  return getStringFromTypedArray(
    uint8Array,
    byteOffset,
    Math.min(4, uint8Array.length),
  );
}
export default getMagic;
