import Check from "../../Core/Check.js";
import DeveloperError from "../../Core/DeveloperError.js";

/**
 * An enum to distinguish the different uses for {@link ModelExperimental},
 * which include individual glTF models, and various 3D Tiles formats
 * (including glTF via <code>3DTILES_content_gltf</code>).
 *
 * @enum {String}
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
var ModelExperimentalType = {
  /**
   * An individual glTF model.
   * <p>
   * Not to be confused with {@link ModelExperimentalType.TILE_GLTF}
   * which is for 3D Tiles
   * </p>
   *
   * @type {String}
   * @constant
   */
  GLTF: "GLTF",
  /**
   * A glTF model used as tile content in a 3D Tileset via
   * <code>3DTILES_content_gltf</code>.
   * <p>
   * Not to be confused with {@link ModelExperimentalType.GLTF}
   * which is for individual models
   * </p>
   *
   * @type {String}
   * @constant
   */
  TILE_GLTF: "TILE_GLTF",
  /**
   * A 3D Tiles 1.0 Batched 3D Model
   *
   * @type {String}
   * @constant
   */
  TILE_B3DM: "B3DM",
  /**
   * A 3D Tiles 1.0 Instanced 3D Model
   *
   * @type {String}
   * @constant
   */
  TILE_I3DM: "I3DM",
  /**
   * A 3D Tiles 1.0 Point Cloud
   *
   * @type {String}
   * @constant
   */
  TILE_PNTS: "PNTS",
};

/**
 * Check if a model is used for 3D Tiles.
 * @param {ModelExperimentalType} modelType The type of model
 * @returns {Boolean} <code>true</code> if the model is a 3D Tiles format, <code>false</code> otherwise
 */
ModelExperimentalType.is3DTiles = function (modelType) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("modelType", modelType);
  //>>includeEnd('debug');

  switch (modelType) {
    case ModelExperimentalType.TILE_GLTF:
    case ModelExperimentalType.TILE_B3DM:
    case ModelExperimentalType.TILE_I3DM:
    case ModelExperimentalType.TILE_PNTS:
      return true;
    case ModelExperimentalType.GLTF:
      return false;
    //>>includeStart('debug', pragmas.debug);
    default:
      throw new DeveloperError("modelType is not a valid value.");
    //>>includeEnd('debug');
  }
};

export default Object.freeze(ModelExperimentalType);
