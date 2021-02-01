import getStringFromTypedArray from "./getStringFromTypedArray.js";

/**
 * @private
 */
function getJsonFromTypedArray(uint8Array, byteOffset, byteLength) {
  return JSON.parse(
    getStringFromTypedArray(uint8Array, byteOffset, byteLength)
  );
}

export default getJsonFromTypedArray;
