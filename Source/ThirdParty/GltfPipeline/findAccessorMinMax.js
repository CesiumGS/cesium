define([
        './getAccessorByteStride',
        './numberOfComponentsForType',
        '../../Core/arrayFill',
        '../../Core/ComponentDatatype',
        '../../Core/defined'
    ], function(
        getAccessorByteStride,
        numberOfComponentsForType,
        arrayFill,
        ComponentDatatype,
        defined) {
    'use strict';

    /**
     * Finds the min and max for an accessor in gltf.
     *
     * The glTF asset must be initialized for the pipeline.
     *
     * @param {Object} gltf A javascript object containing a glTF asset.
     * @param {Object} accessor The accessor object from the glTF asset to read.
     * @returns {{min: Array, max: Array}} min holding the array of minimum values and max holding the array of maximum values.
     *
     * @see addPipelineExtras
     * @see loadGltfUris
     */
    function findAccessorMinMax(gltf, accessor) {
        var bufferViews = gltf.bufferViews;
        var buffers = gltf.buffers;
        var bufferViewId = accessor.bufferView;
        var numberOfComponents = numberOfComponentsForType(accessor.type);
        var min = arrayFill(new Array(numberOfComponents), Number.POSITIVE_INFINITY);
        var max = arrayFill(new Array(numberOfComponents), Number.NEGATIVE_INFINITY);
        if (defined(bufferViewId) && defined(bufferViews) && bufferViews.hasOwnProperty(bufferViewId)) {
            var bufferView = bufferViews[bufferViewId];
            var bufferId = bufferView.buffer;
            if (defined(bufferId) && defined(buffers) && buffers.hasOwnProperty(bufferId)) {
                var buffer = buffers[bufferId];
                var source = buffer.extras._pipeline.source;

                var count = accessor.count;
                var byteStride = getAccessorByteStride(gltf, accessor);
                var byteOffset = accessor.byteOffset + bufferView.byteOffset;
                var componentType = accessor.componentType;

                for (var i = 0; i < count; i++) {
                    var typedArray = ComponentDatatype.createArrayBufferView(componentType, source.buffer, byteOffset + source.byteOffset, numberOfComponents);
                    for (var j = 0; j < numberOfComponents; j++) {
                        var value = typedArray[j];
                        min[j] = Math.min(min[j], value);
                        max[j] = Math.max(max[j], value);
                    }
                    byteOffset += byteStride;
                }
            }
        }
        return {
            min : min,
            max : max
        };
    }
    return findAccessorMinMax;
});
