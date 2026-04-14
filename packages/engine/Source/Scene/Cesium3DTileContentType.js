/**
 * An enum to indicate the different types of {@link Cesium3DTileContent}.
 * For binary files, the enum value is the magic number of the binary file
 * unless otherwise noted. For JSON files, the enum value is a unique name
 * for internal use.
 *
 * @enum {string}
 * @see Cesium3DTileContent
 *
 * @private
 */
const Cesium3DTileContentType = {
  /**
   * A Batched 3D Model. This is a binary format with
   * magic number <code>b3dm</code>
   *
   * @type {string}
   * @constant
   * @private
   */
  BATCHED_3D_MODEL: "b3dm",
  /**
   * An Instanced 3D Model. This is a binary format with magic number
   * <code>i3dm</code>
   *
   * @type {string}
   * @constant
   * @private
   */
  INSTANCED_3D_MODEL: "i3dm",
  /**
   * A Composite model. This is a binary format with magic number
   * <code>cmpt</code>
   *
   * @type {string}
   * @constant
   * @private
   */
  COMPOSITE: "cmpt",
  /**
   * A Point Cloud model. This is a binary format with magic number
   * <code>pnts</code>
   *
   * @type {string}
   * @constant
   * @private
   */
  POINT_CLOUD: "pnts",
  /**
   * Vector tiles. This is a binary format with magic number
   * <code>vctr</code>
   *
   * @type {string}
   * @constant
   * @private
   */
  VECTOR: "vctr",
  /**
   * Geometry tiles. This is a binary format with magic number
   * <code>geom</code>
   *
   * @type {string}
   * @constant
   * @private
   */
  GEOMETRY: "geom",
  /**
   * A glTF model in JSON + external BIN form. This is treated
   * as a JSON format.
   *
   * @type {string}
   * @constant
   * @private
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   */
  GLTF: "gltf",
  /**
   * The binary form of a glTF file. Internally, the magic number is
   * changed from <code>glTF</code> to <code>glb</code> to distinguish it from
   * the JSON glTF format.
   *
   * @type {string}
   * @constant
   * @private
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   */
  GLTF_BINARY: "glb",
  /**
   * For implicit tiling, availability bitstreams are stored in binary subtree files.
   * The magic number is <code>subt</code>
   *
   * @type {string}
   * @constant
   * @private
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   */
  IMPLICIT_SUBTREE: "subt",
  /**
   * For implicit tiling. Subtrees can also be represented as JSON files.
   *
   * @type {string}
   * @constant
   * @private
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   */
  IMPLICIT_SUBTREE_JSON: "subtreeJson",
  /**
   * Contents can reference another tileset.json to use
   * as an external tileset. This is a JSON-based format.
   *
   * @type {string}
   * @constant
   * @private
   */
  EXTERNAL_TILESET: "externalTileset",
  /**
   * Multiple contents are handled separately from the other content types
   * due to differences in request scheduling.
   *
   * @type {string}
   * @constant
   * @private
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   */
  MULTIPLE_CONTENT: "multipleContent",
  /**
   * GeoJSON content for <code>MAXAR_content_geojson</code> extension.
   *
   * @type {string}
   * @constant
   * @private
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   */
  GEOJSON: "geoJson",
  /**
   * Binary voxel content for <code>3DTILES_content_voxels</code> extension.
   *
   * @type {string}
   * @constant
   * @private
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   */
  VOXEL_BINARY: "voxl",
  /**
   * Binary voxel content for <code>3DTILES_content_voxels</code> extension.
   *
   * @type {string}
   * @constant
   * @private
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   */
  VOXEL_JSON: "voxelJson",
};

/**
 * Check if a content is one of the supported binary formats. Otherwise,
 * the caller can assume a JSON format.
 * @param {Cesium3DTileContentType} contentType The content type of the content payload.
 * @return {boolean} <code>true</code> if the content type is a binary format, or <code>false</code> if the content type is a JSON format.
 * @private
 */
Cesium3DTileContentType.isBinaryFormat = function (contentType) {
  switch (contentType) {
    case Cesium3DTileContentType.BATCHED_3D_MODEL:
    case Cesium3DTileContentType.INSTANCED_3D_MODEL:
    case Cesium3DTileContentType.COMPOSITE:
    case Cesium3DTileContentType.POINT_CLOUD:
    case Cesium3DTileContentType.VECTOR:
    case Cesium3DTileContentType.GEOMETRY:
    case Cesium3DTileContentType.IMPLICIT_SUBTREE:
    case Cesium3DTileContentType.VOXEL_BINARY:
    case Cesium3DTileContentType.GLTF_BINARY:
      return true;
    default:
      return false;
  }
};

export default Object.freeze(Cesium3DTileContentType);
