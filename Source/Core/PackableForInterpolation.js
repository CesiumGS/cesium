/*global define*/
define(['../Core/DeveloperError'], function(DeveloperError) {
    "use strict";

    /**
     * Interface for {@link Packable} objects which are interpolated in a
     * different representation than their packed value.
     *
     * @alias PackableForInterpolation
     * @constructor
     *
     * @see Packable
     */
    var PackableForInterpolation = function() {
        /**
         * The number of elements used to store the object into an array in its interpolatable form.
         * @Type {Number}
         */
        this.packedInterpolationLength = undefined;

        DeveloperError.throwInstantiationError();
    };

    /**
     * Converts a packed array into a form suitable for interpolation.
     * @memberof PackableForInterpolation
     * @function
     *
     * @param {Array} packedArray The packed array.
     * @param {Number} [startingIndex=0] The index of the first element to be converted.
     * @param {Number} [lastIndex=packedArray.length] The index of the last element to be converted.
     * @param {Array} [result] The object into which to store the result.
     */
    PackableForInterpolation.prototype.convertPackedArrayForInterpolation = DeveloperError.throwInstantiationError;

    /**
     * Retrieves an instance from a packed array converted with {@link convertPackedArrayForInterpolation}.
     * @memberof PackableForInterpolation
     * @function
     *
     * @param {Array} array The original packed array.
     * @param {Array} sourceArray The converted array.
     * @param {Number} [startingIndex=0] The startingIndex used to convert the array.
     * @param {Number} [lastIndex=packedArray.length] The lastIndex used to convert the array.
     * @param {Object} [result] The object into which to store the result.
     */
    PackableForInterpolation.prototype.unpackInterpolationResult = DeveloperError.throwInstantiationError;

    return PackableForInterpolation;
});
