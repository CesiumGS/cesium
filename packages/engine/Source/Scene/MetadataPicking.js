import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import defined from "../Core/defined.js";
import Matrix2 from "../Core/Matrix2.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";
import RuntimeError from "../Core/RuntimeError.js";
import MetadataClassProperty from "./MetadataClassProperty.js";
import MetadataComponentType from "./MetadataComponentType.js";
import MetadataType from "./MetadataType.js";

/**
 * Utility functions for metadata picking.
 *
 * These are used by the `Picking.pickMetadata` function to decode
 * the metadata values that have been read from the frame buffer
 * into the actual metadata values, according to the structure
 * defined by the `MetadataClassProperty`.
 *
 * @private
 */
const MetadataPicking = {};

/**
 * Returns the value at the specified index of the given data view,
 * interpreting the data to have the given component type.
 *
 * @param {MetadataComponentType} componentType The `MetadataComponentType`
 * @param {DataView} dataView The data view
 * @param {number} index The index (byte offset)
 * @returns {number|bigint|undefined} The value
 * @throws RuntimeError If the given component type is not a valid
 * `MetadataComponentType`
 * @throws RangeError If reading the data from the given data view would
 * cause an out-of-bounds access
 *
 * @private
 */
MetadataPicking.decodeRawMetadataValue = function (
  componentType,
  dataView,
  index,
) {
  switch (componentType) {
    case MetadataComponentType.INT8:
      return dataView.getInt8(index);
    case MetadataComponentType.UINT8:
      return dataView.getUint8(index);
    case MetadataComponentType.INT16:
      return dataView.getInt16(index, true);
    case MetadataComponentType.UINT16:
      return dataView.getUint16(index, true);
    case MetadataComponentType.INT32:
      return dataView.getInt32(index, true);
    case MetadataComponentType.UINT32:
      return dataView.getUint32(index, true);
    case MetadataComponentType.INT64:
      return dataView.getBigInt64(index, true);
    case MetadataComponentType.UINT64:
      return dataView.getBigUint64(index, true);
    case MetadataComponentType.FLOAT32:
      return dataView.getFloat32(index, true);
    case MetadataComponentType.FLOAT64:
      return dataView.getFloat64(index, true);
  }
  throw new RuntimeError(`Invalid component type: ${componentType}`);
};

/**
 * Decodes one component of a metadata value with the given property type
 * from the given data view.
 *
 * This will decode one component (e.g. one entry of a SCALAR array,
 * or one component of a VEC2 element).
 *
 * This will apply normalization to the raw component value if the given
 * class property is 'normalized'.
 *
 * @param {MetadataClassProperty} classProperty The class property
 * @param {DataView} dataView The data view containing the raw metadata values
 * @param {number} dataViewOffset The byte offset within the data view from
 * which the component should be read
 * @returns {number|bigint|undefined} The metadata value component
 * @throws RuntimeError If the component of the given property is not
 * a valid `MetadataComponentType`
 * @throws RangeError If reading the data from the given data view would
 * cause an out-of-bounds access
 */
MetadataPicking.decodeRawMetadataValueComponent = function (
  classProperty,
  dataView,
  dataViewOffset,
) {
  const componentType = classProperty.componentType;
  const component = MetadataPicking.decodeRawMetadataValue(
    componentType,
    dataView,
    dataViewOffset,
  );
  if (classProperty.normalized) {
    return MetadataComponentType.normalize(component, componentType);
  }
  return component;
};

/**
 * Decodes one element of a metadata value with the given property type
 * from the given data view.
 *
 * When the given class property is vector- or matrix typed, then the
 * result will be an array, with a length that corresponds to the
 * number of vector- or matrix components.
 *
 * Otherwise, it will be a single value.
 *
 * In any case, the return value will be the "raw" value, which does
 * take into account normalization, but does NOT take into account
 * default/noData value handling.
 *
 * @param {MetadataClassProperty} classProperty The metadata class property
 * @param {DataView} dataView The data view containing the raw metadata values
 * @param {number} elementIndex The index of the element. This is the index
 * inside the array for array-typed properties, and 0 for non-array types.
 * @returns {number|number[]|bigint|bigint[]|undefined} The decoded metadata value element
 * @throws RuntimeError If the component of the given property is not
 * a valid `MetadataComponentType`
 * @throws RangeError If reading the data from the given data view would
 * cause an out-of-bounds access
 *
 */
MetadataPicking.decodeRawMetadataValueElement = function (
  classProperty,
  dataView,
  elementIndex,
) {
  const componentType = classProperty.componentType;
  const componentSizeInBytes =
    MetadataComponentType.getSizeInBytes(componentType);
  const type = classProperty.type;
  const componentCount = MetadataType.getComponentCount(type);
  const elementSizeInBytes = componentSizeInBytes * componentCount;
  if (componentCount > 1) {
    const result = Array(componentCount);
    for (let i = 0; i < componentCount; i++) {
      const offset =
        elementIndex * elementSizeInBytes + i * componentSizeInBytes;
      const component = MetadataPicking.decodeRawMetadataValueComponent(
        classProperty,
        dataView,
        offset,
      );
      result[i] = component;
    }
    return result;
  }
  const offset = elementIndex * elementSizeInBytes;
  const result = MetadataPicking.decodeRawMetadataValueComponent(
    classProperty,
    dataView,
    offset,
  );
  return result;
};

/**
 * Decode the given raw values into the raw (array-based) form of
 * a metadata property value.
 *
 * (For decoding to types like `CartesianN`, the `decodeMetadataValues`
 * function can be used)
 *
 * The given values are a `Uint8Array` containing the RGBA
 * values that have been read from the metadata picking
 * frame buffer. They are assumed to contain the value for
 * the given class property, as encoded by the
 * `MetadataPickingPipelineStage` for metadata picking.
 *
 * When the given class property is an array, then (it has to be
 * a fixed-length array, and) the result will be an array with
 * the respective length.
 *
 * When the given class property is vector- or matrix typed,
 * then the result will be an array, with a length that corresponds
 * to the number of vector- or matrix components.
 *
 * (The case that the property is an array of vector- or matrix
 * elements is not supported on the side of the general metadata
 * shader infrastructure, but handled here nevertheless. For such
 * an input, the result would be an array of arrays, with each
 * element representing one of the vectors or matrices).
 *
 * In any case, the return value will be the "raw" value, which does
 * take into account normalization, but does NOT take into account
 * any offset/scale, or default/noData value handling.
 *
 * @param {MetadataClassProperty} classProperty The `MetadataClassProperty`
 * @param {Uint8Array} rawPixelValues The raw values
 * @returns {number|bigint|number[]|bigint[]|undefined} The value
 * @throws RuntimeError If the class property has an invalid component type
 *
 * @private
 */
MetadataPicking.decodeRawMetadataValues = function (
  classProperty,
  rawPixelValues,
) {
  const dataView = new DataView(
    rawPixelValues.buffer,
    rawPixelValues.byteOffset,
    rawPixelValues.byteLength,
  );
  if (classProperty.isArray) {
    const arrayLength = classProperty.arrayLength;
    const result = Array(arrayLength);
    for (let i = 0; i < arrayLength; i++) {
      const element = MetadataPicking.decodeRawMetadataValueElement(
        classProperty,
        dataView,
        i,
      );
      result[i] = element;
    }
    return result;
  }
  const result = MetadataPicking.decodeRawMetadataValueElement(
    classProperty,
    dataView,
    0,
  );
  return result;
};

/**
 * Converts the given type into an object representation where appropriate.
 *
 * When the given type is `SCALAR`, `STRING`, `BOOLEAN`, or `ENUM`, or
 * when the given value is `undefined`, then the given value will be
 * returned.
 *
 * Otherwise, for the `VECn/MATn` types, the given value is assumed to be
 * a numeric array, and is converted into the matching `CartesianN/MatrixN`
 * value.
 *
 * @param {string} type The `ClassProperty` type
 * @param {number|bigint|number[]|bigint[]|undefined} value The input value
 * @returns {undefined|number|bigint|string|boolean|Cartesian2|Cartesian3|Cartesian4|Matrix2|Matrix3|Matrix4} The object representation
 * @throws RuntimeError If the type is not a valid `MetadataType`
 */
MetadataPicking.convertToObjectType = function (type, value) {
  if (!defined(value)) {
    return value;
  }
  if (
    type === MetadataType.SCALAR ||
    type === MetadataType.STRING ||
    type === MetadataType.BOOLEAN ||
    type === MetadataType.ENUM
  ) {
    return value;
  }
  const numbers = value.map((n) => Number(n));
  switch (type) {
    case MetadataType.VEC2:
      return Cartesian2.unpack(numbers, 0, new Cartesian2());
    case MetadataType.VEC3:
      return Cartesian3.unpack(numbers, 0, new Cartesian3());
    case MetadataType.VEC4:
      return Cartesian4.unpack(numbers, 0, new Cartesian4());
    case MetadataType.MAT2:
      return Matrix2.unpack(numbers, 0, new Matrix2());
    case MetadataType.MAT3:
      return Matrix3.unpack(numbers, 0, new Matrix3());
    case MetadataType.MAT4:
      return Matrix4.unpack(numbers, 0, new Matrix4());
  }
  // Should never happen:
  throw new RuntimeError(`Invalid metadata object type: ${type}`);
};

/**
 * Converts the given type into a raw value or array representation.
 *
 * For `VECn/MATn` types, the given value is converted into an array.
 * For other types, the value is returned directly
 *
 * @param {string} type The `ClassProperty` type
 * @param {undefined|number|bigint|string|boolean|Cartesian2|Cartesian3|Cartesian4|Matrix2|Matrix3|Matrix4} value The input value
 * @returns {undefined|number|bigint|string|boolean|number[]} The array representation
 * @throws RuntimeError If the type is not a valid `MetadataType`
 */
MetadataPicking.convertFromObjectType = function (type, value) {
  if (!defined(value)) {
    return value;
  }
  if (
    type === MetadataType.SCALAR ||
    type === MetadataType.STRING ||
    type === MetadataType.BOOLEAN ||
    type === MetadataType.ENUM
  ) {
    return value;
  }
  switch (type) {
    case MetadataType.VEC2:
      return Cartesian2.pack(value, Array(2));
    case MetadataType.VEC3:
      return Cartesian3.pack(value, Array(3));
    case MetadataType.VEC4:
      return Cartesian4.pack(value, Array(4));
    case MetadataType.MAT2:
      return Matrix2.pack(value, Array(4));
    case MetadataType.MAT3:
      return Matrix3.pack(value, Array(9));
    case MetadataType.MAT4:
      return Matrix4.pack(value, Array(16));
  }
  // Should never happen:
  throw new RuntimeError(`Invalid metadata object type: ${type}`);
};

/**
 * Decode the given raw values into a metadata property value.
 *
 * This applies the value transform (offset/scale) to the result
 * of `decodeRawMetadataValues`, and converts this from array-based
 * types into object types like `CartesianN`.
 *
 * @param {MetadataClassProperty} classProperty The `MetadataClassProperty`
 * @param {object} metadataProperty The
 * `PropertyTextureProperty` or `PropertyAttributeProperty`
 * @param {Uint8Array} rawPixelValues The raw values
 * @returns {MetadataValue} The value
 * @throws RuntimeError If the class property has an invalid type
 * or component type
 * @throws RangeError If the given pixel values do not have sufficient
 * size to contain the expected value type
 *
 * @private
 */
MetadataPicking.decodeMetadataValues = function (
  classProperty,
  metadataProperty,
  rawPixelValues,
) {
  let arrayBasedResult = MetadataPicking.decodeRawMetadataValues(
    classProperty,
    rawPixelValues,
  );

  if (metadataProperty.hasValueTransform) {
    // In the MetadataClassProperty, these offset/scale are always in
    // their array-based form (e.g. a number[3] for `VEC3`). But for
    // the PropertyTextureProperty and PropertyAttributeProperty,
    // the type of the offset/scale is defined to be
    // number|Cartesian2|Cartesian3|Cartesian4|Matrix2|Matrix3|Matrix4
    // So these types are converted into their array-based form here, before
    // applying them with `MetadataClassProperty.valueTransformInPlace`

    const offset = MetadataPicking.convertFromObjectType(
      classProperty.type,
      metadataProperty.offset,
    );
    const scale = MetadataPicking.convertFromObjectType(
      classProperty.type,
      metadataProperty.scale,
    );
    arrayBasedResult = MetadataClassProperty.valueTransformInPlace(
      arrayBasedResult,
      offset,
      scale,
      MetadataComponentType.applyValueTransform,
    );
  }

  if (classProperty.isArray) {
    const arrayLength = classProperty.arrayLength;
    const result = Array(arrayLength);
    for (let i = 0; i < arrayLength; i++) {
      const arrayBasedValue = arrayBasedResult[i];
      const objectBasedValue = MetadataPicking.convertToObjectType(
        classProperty.type,
        arrayBasedValue,
      );
      result[i] = objectBasedValue;
    }
    return result;
  }
  const objectResult = MetadataPicking.convertToObjectType(
    classProperty.type,
    arrayBasedResult,
  );
  return objectResult;
};

export default Object.freeze(MetadataPicking);
