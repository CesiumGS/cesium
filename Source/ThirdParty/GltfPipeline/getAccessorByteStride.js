define([
        './byteLengthForComponentType',
        './numberOfComponentsForType',
        '../../Core/defined'
    ], function(
        byteLengthForComponentType,
        numberOfComponentsForType,
        defined) {
    'use strict';

    /**
     * Returns the byte stride of the provided accessor.
     * If the byteStride is 0, it is calculated based on type and componentType
     *
     * @param {Object} gltf A javascript object containing a glTF asset.
     * @param {Object} accessor The accessor.
     * @returns {Number} The byte stride of the accessor.
     */
    function getAccessorByteStride(gltf, accessor) {
        var bufferView = gltf.bufferViews[accessor.bufferView];
        if (defined(bufferView.byteStride) && bufferView.byteStride > 0) {
            return bufferView.byteStride;
        }
        return byteLengthForComponentType(accessor.componentType) * numberOfComponentsForType(accessor.type);
    }
    return getAccessorByteStride;
});
