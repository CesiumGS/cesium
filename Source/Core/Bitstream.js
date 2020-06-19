import defaultValue from "./defaultValue.js";
import DeveloperError from "./DeveloperError.js";
/**
 * An array structure to access individual (or groups) bits store in a byte array (Uint8array).
 * @alias Bitstream
 * @constructor
 *
 *
 * @param {Uint8Array} [buffer=new Uint8Array()] The source buffer.
 * @param {Number} [elementSize=1] The number of bits per element.
 */
function Bitstream(buffer, elementSize) {
  this._buffer = defaultValue(buffer, new Uint8Array());
  this._elementSize = defaultValue(elementSize, 1);
}

Object.defineProperties(Bitstream.prototype, {
  /**
   * Gets the byte length of the source buffer.
   * @memberof Bitstream.prototype
   *
   * @type {Number}
   */
  byteLength: {
    get: function () {
      return this._buffer.byteLength;
    },
  },
  /**
   * Number of bits for each element in the bitstream. Default is 1 bit per element.
   *
   * @type {Number}
   */
  elementSize: {
    get: function () {
      return this._elementSize;
    },
  },
});

/**
 * Gets the element at the given index in the bitstream.
 *
 * @param {Number} index The index of the element.
 * @returns {Number} The value of the element in the bitstream. Returns -1 if invalid index.
 */
Bitstream.prototype.get = function (index) {
  //>>includeStart('debug', pragmas.debug);
  if (typeof index !== "number") {
    throw new DeveloperError("index is required to be a number.");
  }
  //>>includeEnd('debug');
  if (index < 0 || index >= (this.byteLength * 8) / this._elementSize) {
    return -1;
  }

  // The index of of the array item that the element starts in.
  let arrayIndex = Math.floor((index * this._elementSize) / 8);
  // The offset in the array item that the element starts in.
  let startOffset = (index * this._elementSize) % 8;
  // The offset in the array item that the element end in.
  let endOffset = (startOffset + this._elementSize - 1) % 8;
  return (
    (this._buffer[arrayIndex] >> (7 - endOffset)) &
    (Math.pow(2, this._elementSize) - 1)
  );
};

/**
 * Prints binary representation of the bitstream.
 *
 */
Bitstream.prototype.print = function () {
  return Array.from(this._buffer).reduce(
    (previousValue, currentValue) =>
      previousValue.concat(currentValue.toString(2).padStart(8, "0")),
    ""
  );
};

export default Bitstream;
