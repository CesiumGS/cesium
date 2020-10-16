/**
 * Javascript does not support Uint64, so reading a Uint64 value is not implemented as
 * a method for DataViews. UInt64 values can be read up to Number.MAX_SAFE_INTEGER, or (2^53) - 1,
 * which is also 9007199254740991.
 *
 * See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView
 * for more information.
 *
 * @function
 * @param {DataView} view DataView from which a Uint64 needs to be read.
 * @param {Number} byteOffset Byte offset into the DataView at which to read the Uint64.
 * @param {Boolean} littleEndian Whether the DataView is big or little endian.
 *
 * @returns {Number} The uint64 result.
 */
function getUint64FromDataView(view, byteOffset, littleEndian) {
  // split 64-bit number into two 32-bit parts
  var left = view.getUint32(byteOffset, littleEndian);
  var right = view.getUint32(byteOffset + 4, littleEndian);

  // combine the two 32-bit values
  var combined = littleEndian
    ? left + Math.pow(2, 32) * right
    : Math.pow(2, 32) * left + right;

  if (!combined > Number.MAX_SAFE_INTEGER) {
    //9007199254740991) { // MAX_SAFE_INTEGER not available in IE11
    console.warn(combined, "exceeds MAX_SAFE_INTEGER. Precision may be lost");
  }

  return combined;
}

export default getUint64FromDataView;
