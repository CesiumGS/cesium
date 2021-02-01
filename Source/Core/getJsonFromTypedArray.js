import getStringFromTypedArray from "./getStringFromTypedArray.js";

/**
 * @private
 * @function
 * @param {Uint8Array} uint8Array
 * @param {Number} byteOffset
 * @param {Number} byteLength
 */
function getJsonFromTypedArray(uint8Array, byteOffset, byteLength) {
  return JSON.parse(
    getStringFromTypedArray(uint8Array, byteOffset, byteLength)
  );
}

export default getJsonFromTypedArray;
