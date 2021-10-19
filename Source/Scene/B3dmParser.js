import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import deprecationWarning from "../Core/deprecationWarning.js";
import getJsonFromTypedArray from "../Core/getJsonFromTypedArray.js";
import RuntimeError from "../Core/RuntimeError.js";

/**
 * Handles parsing of a Batched 3D Model.
 *
 * @namespace B3dmParser
 * @private
 */
var B3dmParser = {};
B3dmParser._deprecationWarning = deprecationWarning;

var sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;

/**
 * Parses the contents of a {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification/TileFormats/Batched3DModel|Batched 3D Model}.
 *
 * @private
 *
 * @param {ArrayBuffer} arrayBuffer The array buffer containing the B3DM.
 * @param {Number} [byteOffset=0] The byte offset of the beginning of the B3DM in the array buffer.
 * @returns {Object} Returns an object with the batch length, feature table (binary and json), batch table (binary and json) and glTF parts of the B3DM.
 */
B3dmParser.parse = function (arrayBuffer, byteOffset) {
  var byteStart = defaultValue(byteOffset, 0);
  //>>includeStart('debug', pragmas.debug);
  Check.defined("arrayBuffer", arrayBuffer);
  Check.typeOf.number("byteOffset", byteStart);
  if (byteStart < 0) {
    throw new RuntimeError("byteOffset cannot be less than 0.");
  }
  //>>includeEnd('debug');

  byteOffset = byteStart;

  var uint8Array = new Uint8Array(arrayBuffer);
  var view = new DataView(arrayBuffer);
  byteOffset += sizeOfUint32; // Skip magic

  var version = view.getUint32(byteOffset, true);
  if (version !== 1) {
    throw new RuntimeError(
      "Only Batched 3D Model version 1 is supported.  Version " +
        version +
        " is not."
    );
  }
  byteOffset += sizeOfUint32;

  var byteLength = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;

  var featureTableJsonByteLength = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;

  var featureTableBinaryByteLength = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;

  var batchTableJsonByteLength = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;

  var batchTableBinaryByteLength = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;

  var batchLength;

  // Legacy header #1: [batchLength] [batchTableByteLength]
  // Legacy header #2: [batchTableJsonByteLength] [batchTableBinaryByteLength] [batchLength]
  // Current header: [featureTableJsonByteLength] [featureTableBinaryByteLength] [batchTableJsonByteLength] [batchTableBinaryByteLength]
  // If the header is in the first legacy format 'batchTableJsonByteLength' will be the start of the JSON string (a quotation mark) or the glTF magic.
  // Accordingly its first byte will be either 0x22 or 0x67, and so the minimum uint32 expected is 0x22000000 = 570425344 = 570MB. It is unlikely that the feature table JSON will exceed this length.
  // The check for the second legacy format is similar, except it checks 'batchTableBinaryByteLength' instead
  if (batchTableJsonByteLength >= 570425344) {
    // First legacy check
    byteOffset -= sizeOfUint32 * 2;
    batchLength = featureTableJsonByteLength;
    batchTableJsonByteLength = featureTableBinaryByteLength;
    batchTableBinaryByteLength = 0;
    featureTableJsonByteLength = 0;
    featureTableBinaryByteLength = 0;
    B3dmParser._deprecationWarning(
      "b3dm-legacy-header",
      "This b3dm header is using the legacy format [batchLength] [batchTableByteLength]. The new format is [featureTableJsonByteLength] [featureTableBinaryByteLength] [batchTableJsonByteLength] [batchTableBinaryByteLength] from https://github.com/CesiumGS/3d-tiles/tree/main/specification/TileFormats/Batched3DModel."
    );
  } else if (batchTableBinaryByteLength >= 570425344) {
    // Second legacy check
    byteOffset -= sizeOfUint32;
    batchLength = batchTableJsonByteLength;
    batchTableJsonByteLength = featureTableJsonByteLength;
    batchTableBinaryByteLength = featureTableBinaryByteLength;
    featureTableJsonByteLength = 0;
    featureTableBinaryByteLength = 0;
    B3dmParser._deprecationWarning(
      "b3dm-legacy-header",
      "This b3dm header is using the legacy format [batchTableJsonByteLength] [batchTableBinaryByteLength] [batchLength]. The new format is [featureTableJsonByteLength] [featureTableBinaryByteLength] [batchTableJsonByteLength] [batchTableBinaryByteLength] from https://github.com/CesiumGS/3d-tiles/tree/main/specification/TileFormats/Batched3DModel."
    );
  }

  var featureTableJson;
  if (featureTableJsonByteLength === 0) {
    featureTableJson = {
      BATCH_LENGTH: defaultValue(batchLength, 0),
    };
  } else {
    featureTableJson = getJsonFromTypedArray(
      uint8Array,
      byteOffset,
      featureTableJsonByteLength
    );
    byteOffset += featureTableJsonByteLength;
  }

  var featureTableBinary = new Uint8Array(
    arrayBuffer,
    byteOffset,
    featureTableBinaryByteLength
  );
  byteOffset += featureTableBinaryByteLength;

  var batchTableJson;
  var batchTableBinary;
  if (batchTableJsonByteLength > 0) {
    // PERFORMANCE_IDEA: is it possible to allocate this on-demand?  Perhaps keep the
    // arraybuffer/string compressed in memory and then decompress it when it is first accessed.
    //
    // We could also make another request for it, but that would make the property set/get
    // API async, and would double the number of numbers in some cases.
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
    B3dmParser._deprecationWarning(
      "b3dm-glb-unaligned",
      "The embedded glb is not aligned to a 4-byte boundary."
    );
    gltfView = new Uint8Array(
      uint8Array.subarray(byteOffset, byteOffset + gltfByteLength)
    );
  }

  return {
    batchLength: batchLength,
    featureTableJson: featureTableJson,
    featureTableBinary: featureTableBinary,
    batchTableJson: batchTableJson,
    batchTableBinary: batchTableBinary,
    gltf: gltfView,
  };
};

export default B3dmParser;
