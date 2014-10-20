/*global define*/
define([
        './Cartesian2',
        './Cartesian3',
        './defined',
        './DeveloperError',
        './Math'
    ], function(
        Cartesian2,
        Cartesian3,
        defined,
        DeveloperError,
        CesiumMath) {
    "use strict";

    /**
     * Oct encoding and decoding functions.
     *
     * Oct encoding is a compact representation of unit length vectors.  The encoding and decoding functions are low cost, and represent the normalized vector within 1 degree of error.
     * The 'oct' encoding is described in "A Survey of Efficient Representations of Independent Unit Vectors",
     * Cigolle et al 2014: {@link http://jcgt.org/published/0003/02/01/}
     *
     * @namespace
     * @alias Oct
     *
     * @private
     */
    var Oct = {};

    /**
     * Encodes a normalized vector into 2 SNORM values in the range of [0-255] following the 'oct' encoding.
     *
     * @param {Cartesian3} vector The normalized vector to be compressed into 2 byte 'oct' encoding.
     * @param {Cartesian2} result The 2 byte oct-encoded unit length vector.
     * @returns {Cartesian2} The 2 byte oct-encoded unit length vector.
     *
     * @exception {DeveloperError} vector must be defined.
     * @exception {DeveloperError} result must be defined.
     * @exception {DeveloperError} vector must be normalized.
     */
    Oct.encode = function(vector, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(vector)) {
            throw new DeveloperError('vector is required.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required.');
        }
        var magSquared = Cartesian3.magnitudeSquared(vector);
        if (Math.abs(magSquared - 1.0) > CesiumMath.EPSILON6) {
            throw new DeveloperError('vector must be normalized.');
        }
        //>>includeEnd('debug');

        result.x = vector.x / (Math.abs(vector.x) + Math.abs(vector.y) + Math.abs(vector.z));
        result.y = vector.y / (Math.abs(vector.x) + Math.abs(vector.y) + Math.abs(vector.z));
        if (vector.z < 0) {
            var x = result.x;
            var y = result.y;
            result.x = (1.0 - Math.abs(y)) * CesiumMath.signNotZero(x);
            result.y = (1.0 - Math.abs(x)) * CesiumMath.signNotZero(y);
        }

        result.x = CesiumMath.toSNorm(result.x);
        result.y = CesiumMath.toSNorm(result.y);

        return result;
    };

    /**
     * Decodes a unit-length vector in 'oct' encoding to a normalized 3-component vector.
     *
     * @param {Number} x The x component of the oct-encoded unit length vector.
     * @param {Number} y The y component of the oct-encoded unit length vector.
     * @param {Cartesian3} result The decoded and normalized vector
     * @returns {Cartesian3} The decoded and normalized vector.
     *
     * @exception {DeveloperError} result must be defined.
     * @exception {DeveloperError} x and y must be a signed normalized integer between 0 and 255.
     *
     */
    Oct.decode = function(x, y, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(result)) {
            throw new DeveloperError('result is required.');
        }
        if (x < 0 || x > 255 || y < 0 || y > 255) {
            throw new DeveloperError('x and y must be a signed normalized integer between 0 and 255');
        }
        //>>includeEnd('debug');

        result.x = CesiumMath.fromSNorm(x);
        result.y = CesiumMath.fromSNorm(y);
        result.z = 1.0 - (Math.abs(result.x) + Math.abs(result.y));

        if (result.z < 0.0)
        {
            var oldVX = result.x;
            result.x = (1.0 - Math.abs(result.y)) * CesiumMath.signNotZero(oldVX);
            result.y = (1.0 - Math.abs(oldVX)) * CesiumMath.signNotZero(result.y);
        }

        return Cartesian3.normalize(result, result);
    };

    var scratchEncodeCart2 = new Cartesian2();

    /**
     * Encodes a normalized vector into 2 SNORM values in the range of [0-255] following the 'oct' encoding and
     * stores those values in a single float-point number.
     *
     * @param {Cartesian3} vector The normalized vector to be compressed into 2 byte 'oct' encoding.
     * @returns {Number} The 2 byte oct-encoded unit length vector.
     *
     * @exception {DeveloperError} vector must be defined.
     * @exception {DeveloperError} vector must be normalized.
     */
    Oct.encodeFloat = function(vector) {
        Oct.encode(vector, scratchEncodeCart2);
        return 256.0 * scratchEncodeCart2.x + scratchEncodeCart2.y;
    };

    /**
     * Decodes a unit-length vector in 'oct' encoding to a normalized 3-component vector.
     *
     * @param {Number} value The oct-encoded unit length vector stored as a single floating-point number.
     * @param {Cartesian3} result The decoded and normalized vector
     * @returns {Cartesian3} The decoded and normalized vector.
     *
     * @exception {DeveloperError} result must be defined.
     */
    Oct.decodeFloat = function(value, result) {
        var temp = value / 256.0;
        var x = Math.floor(temp);
        var y = (temp - x) * 256.0;

        return Oct.decode(x, y, result);
    };

    Oct.pack = function(v1, v2, v3, result) {
        var encoded1 = Oct.encodeFloat(v1);
        var encoded2 = Oct.encodeFloat(v2);

        var encoded3 = Oct.encode(v3, scratchEncodeCart2);
        result.x = 65536.0 * encoded3.x + encoded1;
        result.y = 65536.0 * encoded3.y + encoded2;
        return result;
    };

    Oct.unpack = function(packed, v1, v2, v3) {
        var temp = packed.x / 65536.0;
        var x = Math.floor(temp);
        var encodedFloat1 = (temp - x) * 65536.0;

        temp = packed.y / 65536.0;
        var y = Math.floor(temp);
        var encodedFloat2 = (temp - y) * 65536.0;

        Oct.decodeFloat(encodedFloat1, v1);
        Oct.decodeFloat(encodedFloat2, v2);
        Oct.decode(x, y, v3);
    };

    return Oct;
});
