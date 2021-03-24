import Check from "../Core/Check.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import RuntimeError from "../Core/RuntimeError.js";

/**
 * An availability bitstream for use in an {@link ImplicitSubtree}. This handles
 * both Uint8Array bitstreams and constant values.
 *
 * @alias ImplicitAvailabilityBitstream
 * @constructor
 *
 * @param {Object} options An object with the following properties:
 * @param {Number} options.lengthBits The length of the bitstream in bits
 * @param {Boolean} [options.constant] A single boolean value indicating the value of all the bits in the bitstream if they are all the same
 * @param {Uint8Array} [options.bitstream] An array of bytes storing the bitstream in binary
 * @param {Number} [options.availableCount] A number indicating how many 1 bits are found in the bitstream
 * @private
 */
export default function ImplicitAvailabilityBitstream(options) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("options.lengthBits", options.lengthBits);
  //>>includeEnd('debug');

  this._availableCount = options.availableCount;
  this._lengthBits = options.lengthBits;
  this._constant = undefined;
  this._bitstream = undefined;

  if (defined(options.constant)) {
    this._constant = options.constant;
  } else {
    var expectedLength = Math.ceil(this._lengthBits / 8);
    if (options.bitstream.length !== expectedLength) {
      throw new RuntimeError(
        "Availability bitstream must be exactly " +
          expectedLength +
          " bytes long to store " +
          this._lengthBits +
          " bits. Actual bitstream was " +
          options.bitstream.length +
          " bytes long."
      );
    }

    this._bitstream = options.bitstream;
  }
}

Object.defineProperties(ImplicitAvailabilityBitstream.prototype, {
  /**
   * The length of the bitstream in bits.
   *
   * @memberof ImplicitAvailabilityBitstream.prototype
   *
   * @type {Number}
   * @readonly
   * @private
   */
  lengthBits: {
    get: function () {
      return this._lengthBits;
    },
  },
  /**
   * The number of bits in the bitstream with value <code>1</code>.
   *
   * @memberof ImplicitAvailabilityBitstream.prototype
   *
   * @type {Number}
   * @readonly
   * @private
   */
  availableCount: {
    get: function () {
      return this._availableCount;
    },
  },
});

/**
 * Get a bit from the availability bitstream as a Boolean. If the bitstream
 * is a constant, the constant value is returned instead.
 *
 * @param {Number} index The integer index of the bit.
 * @returns {Boolean} The value of the bit
 * @private
 */
ImplicitAvailabilityBitstream.prototype.getBit = function (index) {
  //>>includeStart('debug', pragmas.debug);
  if (index < 0 || index >= this._lengthBits) {
    throw new DeveloperError("Bit index out of bounds.");
  }
  //>>includeEnd('debug');

  if (defined(this._constant)) {
    return this._constant;
  }

  // byteIndex is floor(index / 8)
  var byteIndex = index >> 3;
  var bitIndex = index % 8;

  return ((this._bitstream[byteIndex] >> bitIndex) & 1) === 1;
};
