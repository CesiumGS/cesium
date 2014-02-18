/*global define*/
define(['../Core/DeveloperError'], function(DeveloperError) {
    "use strict";

    /**
     * Base interface for objects which can store their values as packed
     * elements in an array.
     *
     * @alias Packable
     * @constructor
     *
     * @see PackableForInterpolation
     */
    var Packable = function() {
        /**
         * The number of elements used to pack the object into an array.
         * @Type {Number}
         */
        this.packedLength = undefined;

        DeveloperError.throwInstantiationError();
    };

    /**
     * Stores the provided instance into the provided array.
     * @memberof Packable
     * @function
     *
     * @param {Object} value The value to pack.
     * @param {Array} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     */
    Packable.prototype.pack = DeveloperError.throwInstantiationError;

    /**
     * Retrieves an instance from a packed array.
     * @memberof Packable
     * @function
     *
     * @param {Array} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {Object} [result] The object into which to store the result.
     */
    Packable.prototype.unpack = DeveloperError.throwInstantiationError;

    return Packable;
});