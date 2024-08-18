import MetadataComponentType from "./MetadataComponentType.js";

/**
 * Utility functions for metadata picking.
 *
 * These are used by the `Picking.pickMetadata` function to decode
 * the metadata values that have been read from the frame buffer
 * into the actual metadata values, according to the structure
 * defined by the `MetadataClassProperty`.
 *
 * This is marked as 'private', but supposed to be used in Picking.js.
 *
 * @private
 */
const MetadataPicking = {};

/**
 * Returns the value at the specified inded of the given data view,
 * interpreting the data to have the given component type.
 *
 * @param {MetadataComponentType} componentType The `MetadataComponentType`
 * @param {DataView} dataView The data view
 * @param {number} index The index
 * @returns {number|bigint|undefined} The value
 *
 * @private
 */
MetadataPicking.decodeMetadataValue = function (
  componentType,
  dataView,
  index
) {
  switch (componentType) {
    case MetadataComponentType.INT8:
      return dataView.getInt8(index);
    case MetadataComponentType.UINT8:
      return dataView.getUint8(index);
    case MetadataComponentType.INT16:
      return dataView.getInt16(index);
    case MetadataComponentType.UINT16:
      return dataView.getUint16(index);
    case MetadataComponentType.INT32:
      return dataView.getInt32(index);
    case MetadataComponentType.UINT32:
      return dataView.getUint32(index);
    case MetadataComponentType.INT64:
      return dataView.getBigInt64(index);
    case MetadataComponentType.UINT64:
      return dataView.getBigUint64(index);
    case MetadataComponentType.FLOAT32:
      return dataView.getFloat32(index);
    case MetadataComponentType.FLOAT64:
      return dataView.getFloat64(index);
  }
  // Appropriate error handling?
  return undefined;
};

/**
 * Decode the given raw values into a metadata property value.
 *
 * The given values are a `Uint8Array` containing the RGBA
 * values that have been read from the metadata picking
 * frame buffer. They are assumed to contain the value for
 * the given class property, as encoded by the
 * `ModelDrawCommands` for metadata picking.
 *
 * @param {MetadataClassProperty} classProperty The `MetadataClassProperty`
 * @param {Uint8Array} rawValues The raw values
 * @returns {number|bigint|undefined} The value
 *
 * @private
 */
MetadataPicking.decodeMetadataValues = function (classProperty, rawValues) {
  const componentType = classProperty.componentType;
  const dataView = new DataView(
    rawValues.buffer,
    rawValues.byteOffset,
    rawValues.byteLength
  );
  if (classProperty.isArray) {
    const arrayLength = classProperty.arrayLength;
    const result = Array(arrayLength);
    for (let i = 0; i < arrayLength; i++) {
      const element = MetadataPicking.decodeMetadataValue(
        componentType,
        dataView,
        i
      );
      if (classProperty.normalized) {
        result[i] = element / 255.0;
      } else {
        result[i] = element;
      }
    }
    return result;
  }
  const value = MetadataPicking.decodeMetadataValue(componentType, dataView, 0);
  if (classProperty.normalized) {
    return value / 255.0;
  }
  return value;
};

export default Object.freeze(MetadataPicking);
