import getAccessorByteStride from "./getAccessorByteStride.js";
import getComponentReader from "./getComponentReader.js";
import numberOfComponentsForType from "./numberOfComponentsForType.js";
import arrayFill from "../../Core/arrayFill.js";
import ComponentDatatype from "../../Core/ComponentDatatype.js";
import defined from "../../Core/defined.js";

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
  const bufferViews = gltf.bufferViews;
  const buffers = gltf.buffers;
  const bufferViewId = accessor.bufferView;
  const numberOfComponents = numberOfComponentsForType(accessor.type);

  // According to the spec, when bufferView is not defined, accessor must be initialized with zeros
  if (!defined(accessor.bufferView)) {
    return {
      min: arrayFill(new Array(numberOfComponents), 0.0),
      max: arrayFill(new Array(numberOfComponents), 0.0),
    };
  }

  const min = arrayFill(
    new Array(numberOfComponents),
    Number.POSITIVE_INFINITY
  );
  const max = arrayFill(
    new Array(numberOfComponents),
    Number.NEGATIVE_INFINITY
  );

  const bufferView = bufferViews[bufferViewId];
  const bufferId = bufferView.buffer;
  const buffer = buffers[bufferId];
  const source = buffer.extras._pipeline.source;

  const count = accessor.count;
  const byteStride = getAccessorByteStride(gltf, accessor);
  let byteOffset =
    accessor.byteOffset + bufferView.byteOffset + source.byteOffset;
  const componentType = accessor.componentType;
  const componentTypeByteLength =
    ComponentDatatype.getSizeInBytes(componentType);
  const dataView = new DataView(source.buffer);
  const components = new Array(numberOfComponents);
  const componentReader = getComponentReader(componentType);

  for (let i = 0; i < count; i++) {
    componentReader(
      dataView,
      byteOffset,
      numberOfComponents,
      componentTypeByteLength,
      components
    );
    for (let j = 0; j < numberOfComponents; j++) {
      const value = components[j];
      min[j] = Math.min(min[j], value);
      max[j] = Math.max(max[j], value);
    }
    byteOffset += byteStride;
  }

  return {
    min: min,
    max: max,
  };
}

export default findAccessorMinMax;
