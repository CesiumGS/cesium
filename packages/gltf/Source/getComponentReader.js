// @ts-check

import { ComponentDatatype, RuntimeError } from "@cesium/core";

/**
 * Returns a function to read and convert data from a DataView into an array.
 *
 * @param {number} componentType Type to convert the data to.
 * @returns {ComponentReader} Function that reads and converts data.
 *
 * @exception {RuntimeError} The component type is not supported.
 *
 * @internal
 */
function getComponentReader(componentType) {
  // @ts-expect-error https://github.com/CesiumGS/cesium/issues/13420
  const byteLength = ComponentDatatype.getSizeInBytes(componentType);

  switch (componentType) {
    case ComponentDatatype.BYTE:
      return function (dataView, byteOffset, numberOfComponents, result) {
        for (let i = 0; i < numberOfComponents; ++i) {
          result[i] = dataView.getInt8(byteOffset + i * byteLength);
        }
      };
    case ComponentDatatype.UNSIGNED_BYTE:
      return function (dataView, byteOffset, numberOfComponents, result) {
        for (let i = 0; i < numberOfComponents; ++i) {
          result[i] = dataView.getUint8(byteOffset + i * byteLength);
        }
      };
    case ComponentDatatype.SHORT:
      return function (dataView, byteOffset, numberOfComponents, result) {
        for (let i = 0; i < numberOfComponents; ++i) {
          result[i] = dataView.getInt16(byteOffset + i * byteLength, true);
        }
      };
    case ComponentDatatype.UNSIGNED_SHORT:
      return function (dataView, byteOffset, numberOfComponents, result) {
        for (let i = 0; i < numberOfComponents; ++i) {
          result[i] = dataView.getUint16(byteOffset + i * byteLength, true);
        }
      };
    case ComponentDatatype.INT:
      return function (dataView, byteOffset, numberOfComponents, result) {
        for (let i = 0; i < numberOfComponents; ++i) {
          result[i] = dataView.getInt32(byteOffset + i * byteLength, true);
        }
      };
    case ComponentDatatype.UNSIGNED_INT:
      return function (dataView, byteOffset, numberOfComponents, result) {
        for (let i = 0; i < numberOfComponents; ++i) {
          result[i] = dataView.getUint32(byteOffset + i * byteLength, true);
        }
      };
    case ComponentDatatype.FLOAT:
      return function (dataView, byteOffset, numberOfComponents, result) {
        for (let i = 0; i < numberOfComponents; ++i) {
          result[i] = dataView.getFloat32(byteOffset + i * byteLength, true);
        }
      };
    case ComponentDatatype.DOUBLE:
      return function (dataView, byteOffset, numberOfComponents, result) {
        for (let i = 0; i < numberOfComponents; ++i) {
          result[i] = dataView.getFloat64(byteOffset + i * byteLength, true);
        }
      };
    default:
      throw new RuntimeError(`Unsupported component type: ${componentType}`);
  }
}

/**
 * A function that reads consecutive components from a DataView into an array.
 * @callback ComponentReader
 *
 * @param {DataView} dataView The data view to read from.
 * @param {number} byteOffset The byte offset applied when reading from the data view.
 * @param {number} numberOfComponents The number of components to read.
 * @param {number[]} result An array storing the components that are read.
 * @returns {void}
 *
 * @internal
 */

export default getComponentReader;
