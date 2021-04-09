import getAccessorByteStride from "./getAccessorByteStride.js"
import getComponentReader from "./getComponentReader.js"
import numberOfComponentsForType from "./numberOfComponentsForType.js"
import arrayFill from "../../Core/arrayFill.js"
import ComponentDatatype from "../../Core/ComponentDatatype.js"
import defined from "../../Core/defined.js"

/**
 * Finds the min and max values of the accessor.
 *
 * @param {Object} gltf A javascript object containing a glTF asset.
 * @param {Object} accessor The accessor object from the glTF asset to read.
 * @returns {{min: Array, max: Array}} min holding the array of minimum values and max holding the array of maximum values.
 *
 * @private
 */
function findAccessorMinMax(gltf, accessor) {
    var bufferViews = gltf.bufferViews;
    var buffers = gltf.buffers;
    var bufferViewId = accessor.bufferView;
    var numberOfComponents = numberOfComponentsForType(accessor.type);

    // According to the spec, when bufferView is not defined, accessor must be initialized with zeros
    if (!defined(accessor.bufferView)) {
        return {
            min: arrayFill(new Array(numberOfComponents), 0.0),
            max: arrayFill(new Array(numberOfComponents), 0.0)
        };
    }

    var min = arrayFill(new Array(numberOfComponents), Number.POSITIVE_INFINITY);
    var max = arrayFill(new Array(numberOfComponents), Number.NEGATIVE_INFINITY);

    var bufferView = bufferViews[bufferViewId];
    var bufferId = bufferView.buffer;
    var buffer = buffers[bufferId];
    var source = buffer.extras._pipeline.source;

    var count = accessor.count;
    var byteStride = getAccessorByteStride(gltf, accessor);
    var byteOffset = accessor.byteOffset + bufferView.byteOffset + source.byteOffset;
    var componentType = accessor.componentType;
    var componentTypeByteLength = ComponentDatatype.getSizeInBytes(componentType);
    var dataView = new DataView(source.buffer);
    var components = new Array(numberOfComponents);
    var componentReader = getComponentReader(componentType);

    for (var i = 0; i < count; i++) {
        componentReader(dataView, byteOffset, numberOfComponents, componentTypeByteLength, components);
        for (var j = 0; j < numberOfComponents; j++) {
            var value = components[j];
            min[j] = Math.min(min[j], value);
            max[j] = Math.max(max[j], value);
        }
        byteOffset += byteStride;
    }

    return {
        min: min,
        max: max
    };
}

export default findAccessorMinMax;
