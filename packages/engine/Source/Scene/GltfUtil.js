import ComponentDatatype from "../Core/ComponentDatatype.js";
import defined from "../Core/defined.js";
import deprecationWarning from "../Core/deprecationWarning.js";
import IndexDatatype from "../Core/IndexDatatype.js";
import getComponentReader from "./GltfPipeline/getComponentReader.js";
import numberOfComponentsForType from "./GltfPipeline/numberOfComponentsForType.js";

/**
 * glTF utilities.
 *
 * @namespace GltfUtil
 *
 * @private
 */
const GltfUtil = {};

/**
 * Returns whether the specified attribute is draco-compressed.
 * <p>
 * This returns whether the given draco object is defined and has
 * an attribute with the given semantic.
 * </p>
 *
 * @param {object|undefined} draco Object with the following properties:
 * @param {any} semantic The semantic (attribute name)
 *
 * @returns {boolean} Whether the specified attribute is draco-compressed
 * @private
 */
GltfUtil.hasDracoCompression = function (draco, semantic) {
  return (
    defined(draco) &&
    defined(draco.attributes) &&
    defined(draco.attributes[semantic])
  );
};

/**
 * Creates an empty (zero-initialized) Uint8Array with a size that
 * matches the given accessor.
 *
 * @param {object} accessor - The glTF accessor object
 * @returns {Uint8Array} The typed array
 * @private
 */
GltfUtil.createUint8ArrayForAccessor = function (accessor) {
  const componentType = accessor.componentType;
  const numComponents = numberOfComponentsForType(accessor.type);
  const componentSize = ComponentDatatype.getSizeInBytes(componentType);
  const byteArrayLength = accessor.count * numComponents * componentSize;
  const typedArray = new Uint8Array(byteArrayLength);
  return typedArray;
};

/**
 * Returns a packed typed array for the specified elements of another typed array.
 *
 * The given typed array is the typed array containing the data of a buffer
 * view. The parameters describe the accessor whose data is represented
 * with the returned typed array.
 *
 * @param {TypedArray} bufferViewTypedArray - The typed array of the buffer view
 * @param {number} byteOffset - The byte offset
 * @param {number} byteStride - The byte strode
 * @param {number} count - The number of elements of the accessor
 * @param {string} type - The accessor type (e.g. "VEC3")
 * @param {number} componentType The component, i.e. the ComponentDataType,
 * like 'UNSIGNED_SHORT'
 * @returns The packed typed array
 * @private
 */
GltfUtil.getPackedTypedArrayFromBufferViewTypedArray = function (
  bufferViewTypedArray,
  byteOffset,
  byteStride,
  count,
  type,
  componentType,
) {
  const componentCount = numberOfComponentsForType(type);
  const componentByteLength = ComponentDatatype.getSizeInBytes(componentType);
  const defaultByteStride = componentByteLength * componentCount;
  const componentsLength = count * componentCount;

  if (byteStride === defaultByteStride) {
    // Copy the typed array and let the underlying ArrayBuffer be freed
    bufferViewTypedArray = new Uint8Array(bufferViewTypedArray);
    return ComponentDatatype.createArrayBufferView(
      componentType,
      bufferViewTypedArray.buffer,
      bufferViewTypedArray.byteOffset + byteOffset,
      componentsLength,
    );
  }

  const typedArray = ComponentDatatype.createTypedArray(
    componentType,
    componentsLength,
  );

  const dataView = new DataView(bufferViewTypedArray.buffer);
  const components = new Array(componentCount);
  const componentReader = getComponentReader(componentType);
  byteOffset = bufferViewTypedArray.byteOffset + byteOffset;

  for (let i = 0; i < count; ++i) {
    componentReader(
      dataView,
      byteOffset,
      componentCount,
      componentByteLength,
      components,
    );
    for (let j = 0; j < componentCount; ++j) {
      typedArray[i * componentCount + j] = components[j];
    }
    byteOffset += byteStride;
  }

  return typedArray;
};

/**
 * Returns a typed array containing indices, created from a part
 * of the given typed array.
 *
 * The given component type must be 'UNSIGNED_BYTE', 'UNSIGNED_SHORT',
 * or 'UNSIGNED_INT'.
 *
 * @param {TypedArray} bufferViewTypedArray - The buffer view typed array
 * @param {number} byteOffset - The byte offset
 * @param {number} componentType The component type
 * @param {number} count - The number of elements
 * @returns The typed array for the indices, or undefined when
 * the component type is not valid
 */
GltfUtil.createIndicesTypedArrayFromBufferViewTypedArray = function (
  bufferViewTypedArray,
  byteOffset,
  componentType,
  count,
) {
  const indexSize = IndexDatatype.getSizeInBytes(componentType);

  let arrayBuffer = bufferViewTypedArray.buffer;
  let arrayBufferByteOffset = bufferViewTypedArray.byteOffset + byteOffset;

  if (arrayBufferByteOffset % indexSize !== 0) {
    const byteLength = count * indexSize;
    const view = new Uint8Array(arrayBuffer, arrayBufferByteOffset, byteLength);
    const copy = new Uint8Array(view);
    arrayBuffer = copy.buffer;
    arrayBufferByteOffset = 0;
    deprecationWarning(
      "index-buffer-unaligned",
      `The index array is not aligned to a ${indexSize}-byte boundary.`,
    );
  }

  let typedArray;
  if (componentType === IndexDatatype.UNSIGNED_BYTE) {
    typedArray = new Uint8Array(arrayBuffer, arrayBufferByteOffset, count);
  } else if (componentType === IndexDatatype.UNSIGNED_SHORT) {
    typedArray = new Uint16Array(arrayBuffer, arrayBufferByteOffset, count);
  } else if (componentType === IndexDatatype.UNSIGNED_INT) {
    typedArray = new Uint32Array(arrayBuffer, arrayBufferByteOffset, count);
  }

  return typedArray;
};

export default GltfUtil;
