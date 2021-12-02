import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import deprecationWarning from "../Core/deprecationWarning.js";
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
 * TODO: Add documentation
 */
I3dmParser.parse = function (arrayBuffer, byteOffset) {
  var byteStart = defaultValue(byteOffset, 0);
  //>>includeStart('debug', pragmas.debug);
  Check.defined("arrayBuffer", arrayBuffer);
  //>>includeEnd('debug');

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
};
