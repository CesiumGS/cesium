/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/DeveloperError'
    ], function(
        defaultValue,
        defined,
        DeveloperError) {
    "use strict";

    /**
     * @private
     */
    var PackableNumber = {

        packedLength : 1,

        pack : function(value, array, startingIndex) {
            if (!defined(value)) {
                throw new DeveloperError('value is required');
            }

            if (!defined(array)) {
                throw new DeveloperError('array is required');
            }

            startingIndex = defaultValue(startingIndex, 0);

            array[startingIndex] = value;
        },

        unpack : function(array, startingIndex, result) {
            if (!defined(array)) {
                throw new DeveloperError('array is required');
            }

            startingIndex = defaultValue(startingIndex, 0);
            return array[startingIndex];
        }
    };
    return PackableNumber;
});
