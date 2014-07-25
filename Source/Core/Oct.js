/*global define*/
define([
        './Cartesian3',
        './Math',
        './defined',
        './DeveloperError'
    ], function(
        Cartesian3,
        CesiumMath,
        defined,
        DeveloperError) {
    "use strict";

    /**
     * Oct encoding functions.
     *
     * @namespace
     * @alias Oct
     */
    var Oct = {};

    /**
     * Encodes a normalized vector into 2 bytes following the 'oct' encoding.
     * The 'oct' encoding is described in "A Survey of Efficient Representations of Independent Unit Vectors",
     * Cigolle et al 2014: http://jcgt.org/published/0003/02/01/
     *
     * @param {Cartesian3} vector The normalized vector to be compressed into 2 byte 'oct' encoding.
     * @param {Cartesian2} result The 2 byte oct-encoded unit length vector.
     * @returns {Cartesian2} The 2 byte oct-encoded unit length vector.
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
     * Decodes a unit-length vector in 'oct' encoding to a normalized 3-component Cartesian vector.
     * The 'oct' encoding is described in "A Survey of Efficient Representations of Independent Unit Vectors",
     * Cigolle et al 2014: http://jcgt.org/published/0003/02/01/
     *
     * @param {Number} x The x component of the oct-encoded unit length vector.
     * @param {Number} y The y component of the oct-encoded unit length vector.
     * @param {Cartesian3} result The decoded and normalized vector
     * @returns {Cartesian3} The decoded and normalized vector.
     */
    Oct.decode = function(x, y, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(result)) {
            throw new DeveloperError('result is required.');
        }
        if (x < 0 || x > 255 || y < 0 || y > 255) {
            throw new DeveloperError('expecting x and y to be a signed normalized integer between 0 and 255');
        }
        //>>includeEnd('debug');

        result.x = x / 255.0 * 2.0 - 1.0;
        result.y = y / 255.0 * 2.0 - 1.0;
        result.z = 1.0 - (Math.abs(result.x) + Math.abs(result.y));

        if (result.z < 0.0)
        {
            var oldVX = x / 255.0 * 2.0 - 1.0;
            result.x = (1.0 - Math.abs(result.y)) * CesiumMath.signNotZero(oldVX);
            result.y = (1.0 - Math.abs(oldVX)) * CesiumMath.signNotZero(result.y);
        }

        return Cartesian3.normalize(result, result);
    };

    return Oct;
});
