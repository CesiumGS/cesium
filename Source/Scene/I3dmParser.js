import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import deprecationWarning from "../Core/deprecationWarning.js";
import getJsonFromTypedArray from "../Core/getJsonFromTypedArray.js";
import RuntimeError from "../Core/RuntimeError.js";

/**
 * Handles parsing of an Instanced 3D Model.
 *
 * @namespace I3dmParser
 * @private
 */
var I3dmParser = {};
I3dmParser._deprecationWarning = deprecationWarning;

var sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;

/**
 * Parses the contents of a {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification/TileFormats/Instanced3DModel|Instanced 3D Model}.
 *
 * @private
 *
 * @param {ArrayBuffer} arrayBuffer The array buffer containing the I3DM.
 * @param {Number} [byteOffset=0] The byte offset of the beginning of the I3DM in the array buffer.
 * @returns {Object} Returns an object with the glTF format, feature table (binary and json), batch table (binary and json) and glTF parts of the I3DM.
 */
I3dmParser.parse = function (arrayBuffer, byteOffset) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("arrayBuffer", arrayBuffer);
  //>>includeEnd('debug');

  var byteStart = defaultValue(byteOffset, 0);

  var uint8Array = new Uint8Array(arrayBuffer);
  var view = new DataView(arrayBuffer);
  byteOffset += sizeOfUint32; // Skip magic

  var version = view.getUint32(byteOffset, true);
  if (version !== 1) {
    throw new RuntimeError(
      "Only Instanced 3D Model version 1 is supported. Version " +
        version +
        " is not."
    );
  }
  byteOffset += sizeOfUint32;

  var byteLength = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;

  var featureTableJsonByteLength = view.getUint32(byteOffset, true);
  if (featureTableJsonByteLength === 0) {
    throw new RuntimeError(
      "featureTableJsonByteLength is zero, the feature table must be defined."
    );
  }
  byteOffset += sizeOfUint32;

  var featureTableBinaryByteLength = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;

  var batchTableJsonByteLength = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;

  var batchTableBinaryByteLength = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;

  var gltfFormat = view.getUint32(byteOffset, true);
  if (gltfFormat !== 1 && gltfFormat !== 0) {
    throw new RuntimeError(
      "Only glTF format 0 (uri) or 1 (embedded) are supported. Format " +
        gltfFormat +
        " is not."
    );
  }
  byteOffset += sizeOfUint32;

  var featureTableJson = getJsonFromTypedArray(
    uint8Array,
    byteOffset,
    featureTableJsonByteLength
  );
  byteOffset += featureTableJsonByteLength;

  var featureTableBinary = new Uint8Array(
    arrayBuffer,
    byteOffset,
    featureTableBinaryByteLength
  );
  byteOffset += featureTableBinaryByteLength;

  var batchTableJson;
  var batchTableBinary;
  if (batchTableJsonByteLength > 0) {
    batchTableJson = getJsonFromTypedArray(
      uint8Array,
      byteOffset,
      batchTableJsonByteLength
    );
    byteOffset += batchTableJsonByteLength;

    if (batchTableBinaryByteLength > 0) {
      // Has a batch table binary
      batchTableBinary = new Uint8Array(
        arrayBuffer,
        byteOffset,
        batchTableBinaryByteLength
      );
      // Copy the batchTableBinary section and let the underlying ArrayBuffer be freed
      batchTableBinary = new Uint8Array(batchTableBinary);
      byteOffset += batchTableBinaryByteLength;
    }
  }

  var gltfByteLength = byteStart + byteLength - byteOffset;
  if (gltfByteLength === 0) {
    throw new RuntimeError("glTF byte length must be greater than 0.");
  }

  var gltfView;
  if (byteOffset % 4 === 0) {
    gltfView = new Uint8Array(arrayBuffer, byteOffset, gltfByteLength);
  } else {
    // Create a copy of the glb so that it is 4-byte aligned
    I3dmParser._deprecationWarning(
      "i3dm-glb-unaligned",
      "The embedded glb is not aligned to a 4-byte boundary."
    );
    gltfView = new Uint8Array(
      uint8Array.subarray(byteOffset, byteOffset + gltfByteLength)
    );
  }

  return {
    gltfFormat: gltfFormat,
    featureTableJson: featureTableJson,
    featureTableBinary: featureTableBinary,
    batchTableJson: batchTableJson,
    batchTableBinary: batchTableBinary,
    gltf: gltfView,
  };
};

export default I3dmParser;
