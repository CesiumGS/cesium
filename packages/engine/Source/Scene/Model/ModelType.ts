import Check from "../../Core/Check.js";
import DeveloperError from "../../Core/DeveloperError.js";

/**
 * An enum to distinguish the different uses for {@link Model},
 * which include individual glTF models, and various 3D Tiles formats
 * (including glTF via <code>3DTILES_content_gltf</code>).
 *
 * @enum {string}
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
const ModelType = {
  /**
   * An individual glTF model.
   * <p>
   * Not to be confused with {@link ModelType.TILE_GLTF}
   * which is for 3D Tiles
   * </p>
   *
   * @type {string}
   * @constant
   */
  GLTF: "GLTF",
  /**
   * A glTF model used as tile content in a 3D Tileset via
   * <code>3DTILES_content_gltf</code>.
   * <p>
   * Not to be confused with {@link ModelType.GLTF}
   * which is for individual models
   * </p>
   *
   * @type {string}
   * @constant
   */
  TILE_GLTF: "TILE_GLTF",
  /**
   * A 3D Tiles 1.0 Batched 3D Model
   *
   * @type {string}
   * @constant
   */
  TILE_B3DM: "B3DM",
  /**
   * A 3D Tiles 1.0 Instanced 3D Model
   *
   * @type {string}
   * @constant
   */
  TILE_I3DM: "I3DM",
  /**
   * A 3D Tiles 1.0 Point Cloud
   *
   * @type {string}
   * @constant
   */
  TILE_PNTS: "PNTS",

  /**
   * GeoJSON content for <code>MAXAR_content_geojson</code> extension
   *
   * @type {string}
   * @constant
   */
  TILE_GEOJSON: "TILE_GEOJSON",
};

/**
 * Check if a model is used for 3D Tiles.
 * @param {ModelType} modelType The type of model
 * @returns {boolean} <code>true</code> if the model is a 3D Tiles format, <code>false</code> otherwise
 */
ModelType.is3DTiles = function (modelType) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("modelType", modelType);
  //>>includeEnd('debug');

  switch (modelType) {
    case ModelType.TILE_GLTF:
    case ModelType.TILE_B3DM:
    case ModelType.TILE_I3DM:
    case ModelType.TILE_PNTS:
    case ModelType.TILE_GEOJSON:
      return true;
    case ModelType.GLTF:
      return false;
    //>>includeStart('debug', pragmas.debug);
    default:
      throw new DeveloperError("modelType is not a valid value.");
    //>>includeEnd('debug');
  }
};

export default Object.freeze(ModelType);
