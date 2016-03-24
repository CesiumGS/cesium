/*global define*/
define(['./defaultValue', './defined', './DeveloperError', './Math'], function(defaultValue, defined, DeveloperError, CesiumMath) {
    'use strict';

    var removeDuplicatesEpsilon = CesiumMath.EPSILON10;

    /**
     * Removes adjacent duplicate values in an array of values.
     *
     * @param {Object[]} values The array of values.
     * @param {Object} objectType The object type to use when comparing values. The object type must support the equalsEpsilon(left, right, epsilon) method.
     * @param {Boolean} [wrapAround=false] Compare the last value in the array against the first value.
     * @returns {Object[]|undefined} A new array of values with no adjacent duplicate values or the input array if no duplicates were found.
     *
     * @example
     * // Returns [(1.0, 1.0, 1.0), (2.0, 2.0, 2.0)]
     * var values = [
     *     new Cesium.Cartesian3(1.0, 1.0, 1.0),
     *     new Cesium.Cartesian3(1.0, 1.0, 1.0),
     *     new Cesium.Cartesian3(2.0, 2.0, 2.0)];
     * var nonDuplicatevalues = Cesium.PolylinePipeline.removeDuplicates(values, Cartesian3);
     *
     * @example
     * // Returns [(1.0, 1.0, 1.0), (2.0, 2.0, 2.0)]
     * var values = [
     *     {x:1.0, y:1.0, z:1.0},
     *     {x:1.0, y:1.0, z:1.0},
     *     {x:2.0, y:2.0, z:2.0}];
     * var nonDuplicatevalues = Cesium.PolylinePipeline.removeDuplicates(values, Cartesian3);
     */
    function arrayRemoveDuplicates(values, objectType, wrapAround) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(values)) {
            throw new DeveloperError('values is required.');
        }
        if (!defined(objectType)) {
            throw new DeveloperError('objectType is required.');
        }
        //>>includeEnd('debug');

        var lastToFirst = defaultValue(wrapAround, false);

        var length = values.length;
        if (length < 2) {
            return values;
        }

        var i;
        var v0;
        var v1;
        var cleanedvalues;

        for (i = 1; i < length; ++i) {
            v0 = values[i - 1];
            v1 = values[i];
            if (objectType.equalsEpsilon(v0, v1, removeDuplicatesEpsilon)) {
                break;
            }
        }

        if (i !== length) {
            cleanedvalues = values.slice(0, i);
            for (; i < length; ++i) {
                // v0 is set by either the previous loop, or the previous clean point.
                v1 = values[i];
                if (!objectType.equalsEpsilon(v0, v1, removeDuplicatesEpsilon)) {
                    cleanedvalues.push(objectType.clone(v1));
                    v0 = v1;
                }
            }
        }

        if (lastToFirst) {
            if (defined(cleanedvalues) && cleanedvalues.length > 1 && objectType.equalsEpsilon(cleanedvalues[0], cleanedvalues[cleanedvalues.length - 1], removeDuplicatesEpsilon)) {
                cleanedvalues.shift();
            }
            else if (objectType.equalsEpsilon(values[0], values[values.length - 1], removeDuplicatesEpsilon)) {
                cleanedvalues = values.slice(1);
            }
        }

        return defined(cleanedvalues) ? cleanedvalues : values;
    }

    return arrayRemoveDuplicates;
});
