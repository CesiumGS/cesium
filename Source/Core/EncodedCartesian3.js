/*global define*/
define([
        './Cartesian3',
        './DeveloperError'
    ], function(
        Cartesian3,
        DeveloperError) {
    "use strict";

    /**
     * A fixed-point encoding of a {@link Cartesian3} with 64-bit floating-point components, as two {@link Cartesian3}
     * values that, when converted to 32-bit floating-point and added, approximate the original input.
     * <p>
     * This is used to encode positions in vertex buffers for rendering without jittering artifacts
     * as described in <a href="http://blogs.agi.com/insight3d/index.php/2008/09/03/precisions-precisions/">Precisions, Precisions</a>.
     * </p>
     *
     * @alias EncodedCartesian3
     * @constructor
     *
     * @see czm_modelViewRelativeToEye
     * @see czm_modelViewProjectionRelativeToEye
     */
    var EncodedCartesian3 = function() {
        /**
         * The high bits for each component.  Bits 0 to 22 store the whole value.  Bits 23 to 31 are not used.
         * <p>
         * The default is {@link Cartesian3.ZERO}.
         * </p>
         *
         * @type Number
         */
        this.high = Cartesian3.ZERO.clone();

        /**
         * The low bits for each component.  Bits 7 to 22 store the whole value, and bits 0 to 6 store the fraction.  Bits 23 to 31 are not used.
         * <p>
         * The default is {@link Cartesian3.ZERO}.
         * </p>
         *
         * @type Number
         */
        this.low = Cartesian3.ZERO.clone();
    };

    function spilt(value, result) {
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
    }

    var scratchSpilt = function() {
        this.high = 0.0;
        this.low = 0.0;
    };

    /**
     * Encodes a {@link Cartesian3} with 64-bit floating-point components as two {@link Cartesian3}
     * values that, when converted to 32-bit floating-point and added, approximate the original input.
     * <p>
     * The fixed-point encoding follows <a href="http://blogs.agi.com/insight3d/index.php/2008/09/03/precisions-precisions/">Precisions, Precisions</a>.
     * </p>
     * @memberof EncodedCartesian3
     *
     * @param {Cartesian3} cartesian The cartesian to encode.
     * @param {EncodedCartesian3} [result] The object onto which to store the result.
     * @return {EncodedCartesian3} The modified result parameter or a new EncodedCartesian3 instance if one was not provided.
     *
     * @exception {DeveloperError} cartesian is required.
     *
     * @example
     * var c = new Cartesian3(-10000000.0, 0.0, 10000000.0);
     * var encoded = EncodedCartesian3.fromCartesian(c);
     */
    EncodedCartesian3.fromCartesian = function(cartesian, result) {
        if (typeof cartesian === 'undefined') {
            throw new DeveloperError('cartesian is required');
        }

        if (typeof result === 'undefined') {
            result = new EncodedCartesian3();
        }

        var high = result.high;
        var low = result.low;

        spilt(cartesian.x, scratchSpilt);
        high.x = scratchSpilt.high;
        low.x = scratchSpilt.low;

        spilt(cartesian.y, scratchSpilt);
        high.y = scratchSpilt.high;
        low.y = scratchSpilt.low;

        spilt(cartesian.z, scratchSpilt);
        high.z = scratchSpilt.high;
        low.z = scratchSpilt.low;

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
     * @param {Array} cartesianArray The array to write to.
     * @param {Number} index The index into the array to start writing.  Six elements will be written.
     *
     * @exception {DeveloperError} cartesian is required.
     * @exception {DeveloperError} cartesianArray is required.
     * @exception {DeveloperError} index must be a number greater than or equal to 0.
     *
     * @example
     * var positions = [
     *    new Cartesian3(),
     *    // ...
     * ];
     * var encodedPositions = new Float32Array(2 * 3 * positions.length);
     * var j = 0;
     * for (var i = 0; i < positions.length; ++i) {
     *   EncodedCartesian3.writeElement(positions[i], encodedPositions, j);
     *   j += 6;
     * }
     */
    EncodedCartesian3.writeElements = function(cartesian, cartesianArray, index) {
        if (typeof cartesian === 'undefined') {
            throw new DeveloperError('cartesian is required');
        }

        if (typeof cartesianArray === 'undefined') {
            throw new DeveloperError('cartesianArray is required');
        }

        if (typeof index !== 'number' || index < 0) {
            throw new DeveloperError('index must be a number greater than or equal to 0.');
        }

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
