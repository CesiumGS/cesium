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
     * Merges object properties into a new combined object. When two objects have the same
     * property, the value of the object that comes earlier in the array is used.
     *
     * @example
     * var object1 = {
     *     one : 1,
     *     deep : {
     *         value1 : 10
     *     }
     * }
     * var object2 = {
     *     two : 2
     * }
     * var object3 = {
     *     deep : {
     *         value1 : 5,
     *         value2 : 11
     *     }
     * }
     * var final = Cesium.combine([object1,object2, object3], true, true);
     *
     * // final === {
     * //     one : 1,
     * //     two : 2,
     * //     deep : {
     * //         value1 : 10,
     * //         value2 : 11
     * //     }
     * // }
     *
     * @param {Array} objects Array of objects that get merged together.
     * @param {Boolean} [deep = true] Perform a recursive merge.
     * @param {Boolean} [allowDuplicates = true] An error gets thrown if allowDuplicates is false and two objects contain the same property.
     *
     * @returns {Object} combined object
     *
     * @exports combine
     *
     * @exception {DeveloperError} Duplicate member.
     */

    var combine = function(objects, deep, allowDuplicates) {
        deep = defaultValue(deep, true);
        allowDuplicates = defaultValue(allowDuplicates, true);

        var combined = {};
        for (var i = 0; i < objects.length; i++) {
            combineTwoObjects(combined, objects[i], deep, allowDuplicates);
        }
        return combined;
    };
    var combineTwoObjects = function(object1, object2, deep, allowDuplicates) {
        for (var property in object2) {
            if (object2.hasOwnProperty(property)) {
                if (object1.hasOwnProperty(property) && (defined(object1[property]))) {
                    if (!allowDuplicates) {
                        throw new DeveloperError('Duplicate member: ' + property);
                    }
                    if (deep && typeof object1[property] === 'object' && typeof object2[property] === 'object') {
                        combineTwoObjects(object1[property], object2[property], deep, allowDuplicates);
                    }
                }
                else {
                    object1[property] = object2[property];
                }
            }
        }
    };

    return combine;
});