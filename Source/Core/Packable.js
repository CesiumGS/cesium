/*global define*/
define(['../Core/DeveloperError'], function(DeveloperError) {
    "use strict";

    function throwInstantiationError() {
        throw new DeveloperError('This type should not be instantiated directly.');
    }

    /**
     * Base interface for objects which can store their values as packed
     * elements in an array.
     *
     * @exports Packable
     *
     * @see {PackableForInterpolation}
     */
    var Packable = {

        /**
         * The number of elements used to pack the object into an array.
         * @Type {Number}
         */
        packedLength : undefined,

        /**
         * Stores the provided instance into the provided array.
         * @memberof Packable
         * @function
         *
         * @param {Object} value The value to pack.
         * @param {Array} array The array to pack into.
         * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
         */
        pack : throwInstantiationError,

        /**
         * Retrieves an instance from a packed array.
         * @memberof Packable
         * @function
         *
         * @param {Array} array The packed array.
         * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
         * @param {Object} [result] The object into which to store the result.
         */
        unpack : throwInstantiationError
    };

    return Packable;
});
