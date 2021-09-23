import getStringFromTypedArray from "./getStringFromTypedArray.js";

/**
 * Parses JSON from a Uint8Array.
 *
 * @function
 *
 * @param {Uint8Array} uint8Array The Uint8Array to read from.
 * @param {Number} [byteOffset=0] The byte offset to start reading from.
 * @param {Number} [byteLength] The byte length to read. If byteLength is omitted the remainder of the buffer is read.
 * @returns {Object} An object containing the parsed JSON.
 *
 * @private
 */
function getJsonFromTypedArray(uint8Array, byteOffset, byteLength) {
  return JSON.parse(
    getStringFromTypedArray(uint8Array, byteOffset, byteLength)
  );
}

export default getJsonFromTypedArray;
