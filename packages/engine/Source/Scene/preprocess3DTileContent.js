import defined from "../Core/defined.js";
import getJsonFromTypedArray from "../Core/getJsonFromTypedArray.js";
import getMagic from "../Core/getMagic.js";
import RuntimeError from "../Core/RuntimeError.js";
import Cesium3DTileContentType from "./Cesium3DTileContentType.js";

/**
 * Results of the preprocess3DTileContent() function. This includes the
 * {@link Cesium3DTileContentType} and the payload. The payload is either
 * binary or JSON depending on the content type.
 *
 * @typedef {object} PreprocessedContent
 * @property {Cesium3DTileContentType} contentType The type of the content
 * @property {Uint8Array} [binaryPayload] For binary files, the payload is returned as a typed array with byteOffset of 0
 * @property {object} [jsonPayload] For JSON files, the results are returned as a JSON object.
 * @private
 */

/**
 * Preprocess a {@link Cesium3DTileContent}, to determine the type of content
 * and to parse JSON files into objects.
 *
 * @param {ArrayBuffer} arrayBuffer The raw binary payload
 * @return {PreprocessedContent}
 * @private
 */
function preprocess3DTileContent(arrayBuffer) {
  const uint8Array = new Uint8Array(arrayBuffer);
  let contentType = getMagic(uint8Array);

  // We use glTF for JSON glTF files. For binary glTF, we rename this
  // to glb to disambiguate
  if (contentType === "glTF") {
    contentType = "glb";
  }

  if (Cesium3DTileContentType.isBinaryFormat(contentType)) {
    return {
      // For binary files, the enum value is the magic number
      contentType: contentType,
      binaryPayload: uint8Array,
    };
  }

  const json = getJsonContent(uint8Array);
  if (defined(json.root)) {
    // Most likely a tileset JSON
    return {
      contentType: Cesium3DTileContentType.EXTERNAL_TILESET,
      jsonPayload: json,
    };
  }

  if (defined(json.asset)) {
    // Most likely a glTF. Tileset JSON also has an "asset" property
    // so this check needs to happen second
    return {
      contentType: Cesium3DTileContentType.GLTF,
      jsonPayload: json,
    };
  }

  if (defined(json.tileAvailability)) {
    // Most likely a subtree JSON.
    return {
      contentType: Cesium3DTileContentType.IMPLICIT_SUBTREE_JSON,
      jsonPayload: json,
    };
  }

  if (defined(json.type)) {
    // Most likely a GeoJSON
    return {
      contentType: Cesium3DTileContentType.GEOJSON,
      jsonPayload: json,
    };
  }

  if (defined(json.voxelTable)) {
    // Most likely a voxel JSON
    return {
      contentType: Cesium3DTileContentType.VOXEL_JSON,
      jsonPayload: json,
    };
  }

  throw new RuntimeError("Invalid tile content.");
}

function getJsonContent(uint8Array) {
  let json;

  try {
    json = getJsonFromTypedArray(uint8Array);
  } catch (error) {
    throw new RuntimeError("Invalid tile content.");
  }

  return json;
}

export default preprocess3DTileContent;
