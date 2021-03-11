/**
 * An enum to indicate the different types of {@link Cesium3DTileContent}.
 * For binary files, the enum value is the magic number of the binary file
 * unless otherwise noted. For JSON files, the enum value is a unique name
 * for internal use.
 *
 * @enum {String}
 * @see Cesium3DTileContent
 *
 * @private
 */
var Cesium3DTileContentType = {
  /**
   * A Batched 3D Model. This is a binary format with
   * magic number <code>b3dm</code>
   *
   * @type {String}
   * @constant
   * @private
   */
  BATCHED_3D_MODEL: "b3dm",
  /**
   * An Instanced 3D Model. This is a binary format with magic number
   * <code>i3dm</code>
   *
   * @type {String}
   * @constant
   * @private
   */
  INSTANCED_3D_MODEL: "i3dm",
  /**
   * A Composite model. This is a binary format with magic number
   * <code>cmpt</code>
   *
   * @type {String}
   * @constant
   * @private
   */
  COMPOSITE: "cmpt",
  /**
   * A Point Cloud model. This is a binary format with magic number
   * <code>pnts</code>
   *
   * @type {String}
   * @constant
   * @private
   */
  POINT_CLOUD: "pnts",
  /**
   * Vector tiles. This is a binary format with magic number
   * <code>vect</code>
   *
   * @type {String}
   * @constant
   * @private
   */
  VECTOR: "vect",
  /**
   * Geometry tiles. This is a binary format with magic number
   * <code>vect</code>
   *
   * @type {String}
   * @constant
   * @private
   */
  GEOMETRY: "geom",
  /**
   * A glTF model in JSON + external BIN form. This is treated
   * as a JSON format.
   *
   * @type {String}
   * @constant
   * @private
   */
  GLTF: "gltf",
  /**
   * The binary form of a glTF file. Internally, the magic number is
   * changed from <code>glTF</code> to <code>glb</code> to distinguish it from
   * the JSON glTF format.
   *
   * @type {String}
   * @constant
   * @private
   */
  GLTF_BINARY: "glb",
  /**
   * For the <code>3DTILES_implicit_tiling</code> extension,
   * availability bitstreams are stored in binary subtree files.
   * The magic number is <code>subt</code>
   *
   * @type {String}
   * @constant
   * @private
   */
  IMPLICIT_SUBTREE: "subt",
  /**
   * Contents can reference another tileset.json to use
   * as an external tileset. This is a JSON-based format.
   *
   * @type {String}
   * @constant
   * @private
   */
  EXTERNAL_TILESET: "externalTileset",
  /**
   * <code>3DTILES_multiple_contents</code> is a 3D Tiles
   * extensions. This is handled separately from the other content types
   * due to differences in request scheduling.
   *
   * @type {String}
   * @constant
   * @private
   */
  MULTIPLE_CONTENT: "multipleContent",
};

Cesium3DTileContentType.isBinaryFormat = function (contentType) {
  switch (contentType) {
    case Cesium3DTileContentType.BATCHED_3D_MODEL:
    case Cesium3DTileContentType.INSTANCED_3D_MODEL:
    case Cesium3DTileContentType.COMPOSITE:
    case Cesium3DTileContentType.POINT_CLOUD:
    case Cesium3DTileContentType.VECTOR:
    case Cesium3DTileContentType.GEOMETRY:
    case Cesium3DTileContentType.IMPLICIT_SUBTREE:
    case Cesium3DTileContentType.GLTF_BINARY:
      return true;
    default:
      return false;
  }
};

export default Object.freeze(Cesium3DTileContentType);
