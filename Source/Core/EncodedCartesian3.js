/*global define*/
define([
        './Cartesian3',
        './defined',
        './DeveloperError'
    ], function(
        Cartesian3,
        defined,
        DeveloperError) {
    "use strict";

    /**
     * A fixed-point encoding of a {@link Cartesian3} with 64-bit floating-point components, as two {@link Cartesian3}
     * values that, when converted to 32-bit floating-point and added, approximate the original input.
     * <p>
     * This is used to encode positions in vertex buffers for rendering without jittering artifacts
     * as described in {@link http://blogs.agi.com/insight3d/index.php/2008/09/03/precisions-precisions/|Precisions, Precisions}.
     * </p>
     *
     * @alias EncodedCartesian3
     * @constructor
     *
     * @private
     */
    var EncodedCartesian3 = function() {
        /**
         * The high bits for each component.  Bits 0 to 22 store the whole value.  Bits 23 to 31 are not used.
         * <p>
         * The default is {@link Cartesian3.ZERO}.
         * </p>
         *
         * @type {Cartesian3}
         * @default {@link Cartesian3.ZERO}
         */
        this.high = Cartesian3.clone(Cartesian3.ZERO);

        /**
         * The low bits for each component.  Bits 7 to 22 store the whole value, and bits 0 to 6 store the fraction.  Bits 23 to 31 are not used.
         * <p>
         * The default is {@link Cartesian3.ZERO}.
         * </p>
         *
         * @type {Cartesian3}
         * @default {@link Cartesian3.ZERO}
         */
        this.low = Cartesian3.clone(Cartesian3.ZERO);
    };

    /**
     * Encodes a 64-bit floating-point value as two floating-point values that, when converted to
     * 32-bit floating-point and added, approximate the original input.  The returned object
     * has <code>high</code> and <code>low</code> properties for the high and low bits, respectively.
     * <p>
     * The fixed-point encoding follows {@link http://blogs.agi.com/insight3d/index.php/2008/09/03/precisions-precisions/|Precisions, Precisions}.
     * </p>
     *
     * @param {Number} value The floating-point value to encode.
     * @param {Object} [result] The object onto which to store the result.
     * @returns {Object} The modified result parameter or a new instance if one was not provided.
     *
     * @example
     * var value = 1234567.1234567;
     * var splitValue = Cesium.EncodedCartesian3.encode(value);
     */
    EncodedCartesian3.encode = function(value, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(value)) {
            throw new DeveloperError('value is required');
        }
        //>>includeEnd('debug');

        if (!defined(result)) {
            result = {
                high : 0.0,
                low : 0.0
            };
        }

        var doubleHigh;
        if (value >= 0.0) {
            doubleHigh = Math.floor(value / 65536.0) * 65536.0;
            result.high = doubleHigh;
            result.low = value - doubleHigh;
        } else {
            doubleHigh = Math.floor(-value / 65536.0) * 65536.0;
            result.high = -doubleHigh;
            result.low = value + doubleHigh;
        }

        return result;
    };

    var scratchEncode = {
        high : 0.0,
        low : 0.0
    };

    /**
     * Encodes a {@link Cartesian3} with 64-bit floating-point components as two {@link Cartesian3}
     * values that, when converted to 32-bit floating-point and added, approximate the original input.
     * <p>
     * The fixed-point encoding follows {@link http://blogs.agi.com/insight3d/index.php/2008/09/03/precisions-precisions/|Precisions, Precisions}.
     * </p>
     *
     * @param {Cartesian3} cartesian The cartesian to encode.
     * @param {EncodedCartesian3} [result] The object onto which to store the result.
     * @returns {EncodedCartesian3} The modified result parameter or a new EncodedCartesian3 instance if one was not provided.
     *
     * @example
     * var cart = new Cesium.Cartesian3(-10000000.0, 0.0, 10000000.0);
     * var encoded = Cesium.EncodedCartesian3.fromCartesian(cart);
     */
    EncodedCartesian3.fromCartesian = function(cartesian, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required');
        }
        //>>includeEnd('debug');

        if (!defined(result)) {
            result = new EncodedCartesian3();
        }

        var high = result.high;
        var low = result.low;

        EncodedCartesian3.encode(cartesian.x, scratchEncode);
        high.x = scratchEncode.high;
        low.x = scratchEncode.low;

        EncodedCartesian3.encode(cartesian.y, scratchEncode);
        high.y = scratchEncode.high;
        low.y = scratchEncode.low;

        EncodedCartesian3.encode(cartesian.z, scratchEncode);
        high.z = scratchEncode.high;
        low.z = scratchEncode.low;

        return result;
    };

    var encodedP = new EncodedCartesian3();

    /**
     * Encodes the provided <code>cartesian</code>, and writes it to an array with <code>high</code>
     * components followed by <code>low</code> components, i.e. <code>[high.x, high.y, high.z, low.x, low.y, low.z]</code>.
     * <p>
     * This is used to create interleaved high-precision position vertex attributes.
     * </p>
     *
     * @param {Cartesian3} cartesian The cartesian to encode.
     * @param {Number[]} cartesianArray The array to write to.
     * @param {Number} index The index into the array to start writing.  Six elements will be written.
     *
     * @exception {DeveloperError} index must be a number greater than or equal to 0.
     *
     * @example
     * var positions = [
     *    new Cesium.Cartesian3(),
     *    // ...
     * ];
     * var encodedPositions = new Float32Array(2 * 3 * positions.length);
     * var j = 0;
     * for (var i = 0; i < positions.length; ++i) {
     *   Cesium.EncodedCartesian3.writeElement(positions[i], encodedPositions, j);
     *   j += 6;
     * }
     */
    EncodedCartesian3.writeElements = function(cartesian, cartesianArray, index) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required');
        }
        if (!defined(cartesianArray)) {
            throw new DeveloperError('cartesianArray is required');
        }
        if (typeof index !== 'number' || index < 0) {
            throw new DeveloperError('index must be a number greater than or equal to 0.');
        }
        //>>includeEnd('debug');

        EncodedCartesian3.fromCartesian(cartesian, encodedP);
        var high = encodedP.high;
        var low = encodedP.low;

        cartesianArray[index] = high.x;
        cartesianArray[index + 1] = high.y;
        cartesianArray[index + 2] = high.z;
        cartesianArray[index + 3] = low.x;
        cartesianArray[index + 4] = low.y;
        cartesianArray[index + 5] = low.z;
    };

    return EncodedCartesian3;
});
