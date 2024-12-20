import ComponentDatatype from "../Core/ComponentDatatype.js";

/**
 * Returns a function to write data into a DataView
 *
 * @param {number} componentType Type to convert the data to.
 * @returns {ComponentWriter} Function that writes.
 *
 * @private
 */
function getComponentWriter(componentType) {
  switch (componentType) {
    case ComponentDatatype.BYTE:
      return function (dataView, index, input) {
        dataView.setInt8(index, input);
      };
    case ComponentDatatype.UNSIGNED_BYTE:
      return function (dataView, index, input) {
        dataView.setUint8(index, input);
      };
    case ComponentDatatype.SHORT:
      return function (dataView, index, input) {
        dataView.setInt16(index * 2, input, true);
      };
    case ComponentDatatype.UNSIGNED_SHORT:
      return function (dataView, index, input) {
        dataView.setUint16(index * 2, input, true);
      };
    case ComponentDatatype.INT:
      return function (dataView, index, input) {
        dataView.setInt32(index * 4, input, true);
      };
    case ComponentDatatype.UNSIGNED_INT:
      return function (dataView, index, input) {
        dataView.setUint32(index * 4, input, true);
      };
    case ComponentDatatype.FLOAT:
      return function (dataView, index, input) {
        dataView.setFloat32(index * 4, input, true);
      };
    case ComponentDatatype.DOUBLE:
      return function (dataView, index, input) {
        dataView.setFloat64(index * 8, input, true);
      };
  }
}

/**
 * A function to write components into a data view
 * @callback ComponentWriter
 *
 * @param {DataView} dataView The data view to write to.
 * @param {number} index The index of the component.
 * @param {number} input The value to write at the given index.
 *
 * @private
 */

export default getComponentWriter;
