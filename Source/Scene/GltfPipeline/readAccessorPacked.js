import getAccessorByteStride from "./getAccessorByteStride.js";
import getComponentReader from "./getComponentReader.js";
import numberOfComponentsForType from "./numberOfComponentsForType.js";
import arrayFill from "../../Core/arrayFill.js";
import ComponentDatatype from "../../Core/ComponentDatatype.js";
import defined from "../../Core/defined.js";

/**
 * Returns the accessor data in a contiguous array.
 *
 * @param {Object} gltf A javascript object containing a glTF asset.
 * @param {Object} accessor The accessor.
 * @returns {Array} The accessor values in a contiguous array.
 *
 * @private
 */
function readAccessorPacked(gltf, accessor) {
  var byteStride = getAccessorByteStride(gltf, accessor);
  var componentTypeByteLength = ComponentDatatype.getSizeInBytes(
    accessor.componentType
  );
  var numberOfComponents = numberOfComponentsForType(accessor.type);
  var count = accessor.count;
  var values = new Array(numberOfComponents * count);

  if (!defined(accessor.bufferView)) {
    arrayFill(values, 0);
    return values;
  }

  var bufferView = gltf.bufferViews[accessor.bufferView];
  var source = gltf.buffers[bufferView.buffer].extras._pipeline.source;
  var byteOffset =
    accessor.byteOffset + bufferView.byteOffset + source.byteOffset;

  var dataView = new DataView(source.buffer);
  var components = new Array(numberOfComponents);
  var componentReader = getComponentReader(accessor.componentType);

  for (var i = 0; i < count; ++i) {
    componentReader(
      dataView,
      byteOffset,
      numberOfComponents,
      componentTypeByteLength,
      components
    );
    for (var j = 0; j < numberOfComponents; ++j) {
      values[i * numberOfComponents + j] = components[j];
    }
    byteOffset += byteStride;
  }
  return values;
}

export default readAccessorPacked;
