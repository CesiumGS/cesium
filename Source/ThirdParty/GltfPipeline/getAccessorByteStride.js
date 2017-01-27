/*global define*/
define([
        './byteLengthForComponentType',
        './numberOfComponentsForType'
    ], function(
        byteLengthForComponentType,
        numberOfComponentsForType) {
    'use strict';

    /**
     * Returns the byte stride of the provided accessor.
     * If the byteStride is 0, it is calculated based on type and componentType
     *
     * @param {Object} accessor The accessor.
     * @returns {Number} The byte stride of the accessor.
     */
    function getAccessorByteStride(accessor) {
        if (accessor.byteStride > 0) {
            return accessor.byteStride;
        }
        return byteLengthForComponentType(accessor.componentType) * numberOfComponentsForType(accessor.type);
    }
    return getAccessorByteStride;
});
