/*global define*/
define([
        './defaultValue',
        './defined',
        './DeveloperError',
        './Math'
    ], function(
        defaultValue,
        defined,
        DeveloperError,
        CesiumMath) {
    'use strict';

    var removeDuplicatesEpsilon = CesiumMath.EPSILON10;

    /**
     * Removes adjacent duplicate values in an array of values.
     *
     * @param {Object[]} [values] The array of values.
     * @param {Function} equalsEpsilon Function to compare values with an epsilon. Boolean equalsEpsilon(left, right, epsilon).
     * @param {Boolean} [wrapAround=false] Compare the last value in the array against the first value.
     * @returns {Object[]|undefined} A new array of values with no adjacent duplicate values or the input array if no duplicates were found.
     *
     * @example
     * // Returns [(1.0, 1.0, 1.0), (2.0, 2.0, 2.0), (3.0, 3.0, 3.0), (1.0, 1.0, 1.0)]
     * var values = [
     *     new Cesium.Cartesian3(1.0, 1.0, 1.0),
     *     new Cesium.Cartesian3(1.0, 1.0, 1.0),
     *     new Cesium.Cartesian3(2.0, 2.0, 2.0),
     *     new Cesium.Cartesian3(3.0, 3.0, 3.0),
     *     new Cesium.Cartesian3(1.0, 1.0, 1.0)];
     * var nonDuplicatevalues = Cesium.PolylinePipeline.removeDuplicates(values, Cartesian3.equalsEpsilon);
     *
     * @example
     * // Returns [(1.0, 1.0, 1.0), (2.0, 2.0, 2.0), (3.0, 3.0, 3.0)]
     * var values = [
     *     new Cesium.Cartesian3(1.0, 1.0, 1.0),
     *     new Cesium.Cartesian3(1.0, 1.0, 1.0),
     *     new Cesium.Cartesian3(2.0, 2.0, 2.0),
     *     new Cesium.Cartesian3(3.0, 3.0, 3.0),
     *     new Cesium.Cartesian3(1.0, 1.0, 1.0)];
     * var nonDuplicatevalues = Cesium.PolylinePipeline.removeDuplicates(values, Cartesian3.equalsEpsilon, true);
     *
     * @private
     */
    function arrayRemoveDuplicates(values, equalsEpsilon, wrapAround) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(equalsEpsilon)) {
            throw new DeveloperError('equalsEpsilon is required.');
        }
        //>>includeEnd('debug');

        if (!defined(values)) {
            return undefined;
        }

        wrapAround = defaultValue(wrapAround, false);

        var length = values.length;
        if (length < 2) {
            return values;
        }

        var i;
        var v0;
        var v1;

        for (i = 1; i < length; ++i) {
            v0 = values[i - 1];
            v1 = values[i];
            if (equalsEpsilon(v0, v1, removeDuplicatesEpsilon)) {
                break;
            }
        }

        if (i === length) {
            if (wrapAround && equalsEpsilon(values[0], values[values.length - 1], removeDuplicatesEpsilon)) {
                return values.slice(1);
            }
            return values;
        }

        var cleanedvalues = values.slice(0, i);
        for (; i < length; ++i) {
            // v0 is set by either the previous loop, or the previous clean point.
            v1 = values[i];
            if (!equalsEpsilon(v0, v1, removeDuplicatesEpsilon)) {
                cleanedvalues.push(v1);
                v0 = v1;
            }
        }

        if (wrapAround && cleanedvalues.length > 1 && equalsEpsilon(cleanedvalues[0], cleanedvalues[cleanedvalues.length - 1], removeDuplicatesEpsilon)) {
            cleanedvalues.shift();
        }

        return cleanedvalues;
    }

    return arrayRemoveDuplicates;
});
