import ComponentDatatype from "../../Core/ComponentDatatype.js"

/**
 * Returns a function to read and convert data from a DataView into an array.
 *
 * @param {Number} componentType Type to convert the data to.
 * @returns {ComponentReader} Function that reads and converts data.
 *
 * @private
 */
function getComponentReader(componentType) {
    switch (componentType) {
        case ComponentDatatype.BYTE:
            return function (dataView, byteOffset, numberOfComponents, componentTypeByteLength, result) {
                for (var i = 0; i < numberOfComponents; ++i) {
                    result[i] = dataView.getInt8(byteOffset + i * componentTypeByteLength);
                }
            };
        case ComponentDatatype.UNSIGNED_BYTE:
            return function (dataView, byteOffset, numberOfComponents, componentTypeByteLength, result) {
                for (var i = 0; i < numberOfComponents; ++i) {
                    result[i] = dataView.getUint8(byteOffset + i * componentTypeByteLength);
                }
            };
        case ComponentDatatype.SHORT:
            return function (dataView, byteOffset, numberOfComponents, componentTypeByteLength, result) {
                for (var i = 0; i < numberOfComponents; ++i) {
                    result[i] = dataView.getInt16(byteOffset + i * componentTypeByteLength, true);
                }
            };
        case ComponentDatatype.UNSIGNED_SHORT:
            return function (dataView, byteOffset, numberOfComponents, componentTypeByteLength, result) {
                for (var i = 0; i < numberOfComponents; ++i) {
                    result[i] = dataView.getUint16(byteOffset + i * componentTypeByteLength, true);
                }
            };
        case ComponentDatatype.INT:
            return function (dataView, byteOffset, numberOfComponents, componentTypeByteLength, result) {
                for (var i = 0; i < numberOfComponents; ++i) {
                    result[i] = dataView.getInt32(byteOffset + i * componentTypeByteLength, true);
                }
            };
        case ComponentDatatype.UNSIGNED_INT:
            return function (dataView, byteOffset, numberOfComponents, componentTypeByteLength, result) {
                for (var i = 0; i < numberOfComponents; ++i) {
                    result[i] = dataView.getUint32(byteOffset + i * componentTypeByteLength, true);
                }
            };
        case ComponentDatatype.FLOAT:
            return function (dataView, byteOffset, numberOfComponents, componentTypeByteLength, result) {
                for (var i = 0; i < numberOfComponents; ++i) {
                    result[i] = dataView.getFloat32(byteOffset + i * componentTypeByteLength, true);
                }
            };
        case ComponentDatatype.DOUBLE:
            return function (dataView, byteOffset, numberOfComponents, componentTypeByteLength, result) {
                for (var i = 0; i < numberOfComponents; ++i) {
                    result[i] = dataView.getFloat64(byteOffset + i * componentTypeByteLength, true);
                }
            };
    }
}

/**
 * A callback function that logs messages.
 * @callback ComponentReader
 *
 * @param {DataView} dataView The data view to read from.
 * @param {Number} byteOffset The byte offset applied when reading from the data view.
 * @param {Number} numberOfComponents The number of components to read.
 * @param {Number} componentTypeByteLength The byte length of each component.
 * @param {Number} result An array storing the components that are read.
 */

export default getComponentReader;
