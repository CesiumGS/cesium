/*global define*/
define([
        './DeveloperError',
        './defaultValue',
        './defined'
    ], function(
        DeveloperError,
        defaultValue,
        defined) {
    "use strict";

    /**
     * Merges two objects, copying their properties onto a new combined object. When two objects have the same
     * property, the value of the property on the first object is used.
     *
     * @example
     * var object1 = {
     *     propOne : 1,
     *     propTwo : {
     *         value1 : 10
     *     }
     * }
     * var object2 = {
     *     propTwo : 2
     * }
     * var final = Cesium.combine(object1, object2);
     *
     * // final === {
     * //     propOne : 1,
     * //     propTwo : {
     * //         value1 : 10
     * //     }
     * // }
     *
     * @param {Object} object1 The first object to merge.
     * @param {Object} object2 The second object to merge.
     * @param {Boolean} [deep=false] Perform a recursive merge.
     *
     * @returns {Object} The combined object containing all properties from both objects.
     *
     * @exports combine
     */
    var combine = function(object1, object2, deep) {
        deep = defaultValue(deep, false);

        var result = {};
        var property;
        var object1Value;
        var object2Value;
        for (property in object1) {
            if (object1.hasOwnProperty(property)) {
                object1Value = object1[property];
                if (deep && typeof object1Value === 'object' && object2.hasOwnProperty(property)) {
                    object2Value = object2[property];
                    if (typeof object2Value === 'object') {
                        result[property] = combine(object1Value, object2Value, deep);
                    } else {
                        result[property] = object1Value;
                    }
                } else {
                    result[property] = object1Value;
                }
            }
        }
        for (property in object2) {
            if (object2.hasOwnProperty(property) && !result.hasOwnProperty(property)) {
                object2Value = object2[property];
                result[property] = object2Value;
            }
        }
        return result;
    };

    return combine;
});