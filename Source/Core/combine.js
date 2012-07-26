/*global define*/
define([
        './DeveloperError'
    ], function(
        DeveloperError) {
    "use strict";

    /**
     * Merges the properties of objects into target. If target and an object
     * share the same property, keep target's version.
     *
     * @example
     * var target = {
     *     one : 1,
     *     deep : {
     *         value1 : 10
     *     }
     * }
     * var object1 = {
     *     two : 2
     * }
     * var object2 = {
     *     deep : {
     *         value1 : 5,
     *         value2 : 11
     *     }
     * }
     * combine(target, [object1,object2], true, true);
     *
     * // final value for target
     * //
     * // target = {
     * //     one : 1,
     * //     two : 2,
     * //     deep : {
     * //         value1 : 10,
     * //         value2 : 11
     * //     }
     * // }
     *
     * // Avoid modifying any of the original objects:
     * var final = combine({},[object1, object2]);
     *
     * @param {Object} target The object that other objects merge into.
     * @param {Array} objects Array of objects that get merged into target.
     * @param {Boolean} [deep = true] Perform a recursive merge.
     * @param {Boolean} [allowDuplicates = true] When two properties are the same, keep the target's value. If false, throw an error.
     *
     * @returns {Object} target
     *
     * @exports combine
     *
     * @exception {DeveloperError} Duplicate member.
     */

    var combine = function(target, objects, deep, allowDuplicates) {
        deep = (typeof deep !== 'undefined') ? deep : true;
        allowDuplicates = (typeof allowDuplicates !== 'undefined') ? allowDuplicates : true;
        var combineTwo = function(object1, object2) {
            for (var property in object2) {
                if (object2.hasOwnProperty(property)) {
                    if (object1.hasOwnProperty(property) && (typeof object1[property] !== 'undefined')) {
                        if (!allowDuplicates) {
                            throw new DeveloperError('Duplicate member: ' + property);
                        }
                        if (deep && typeof object1[property] === 'object' && typeof object2[property] === 'object') {
                            combineTwo(object1[property], object2[property]);
                        }
                    }
                    else {
                        object1[property] = object2[property];
                    }
                }
            }
        };
        for (var i = 0; i < objects.length; i++) {
            combineTwo(target, objects[i]);
        }
        return target;
    };

    return combine;
});