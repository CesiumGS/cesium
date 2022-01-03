import Check from "../../Core/Check.js";
import DeveloperError from "../../Core/DeveloperError.js";

/**
 * An enum to distinguishing the different uses for {@link ModelExperimental},
 * which includes individual glTF models, and various 3D Tiles formats
 * (including glTF via <code>3DTILES_content_gltf</code>).
 *
 * @enum {String}
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
   * A glTF model used as a tile in a 3D Tileset via
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
      throw new DeveloperError("attributeType is not a valid value.");
    //>>includeEnd('debug');
  }
};

export default Object.freeze(ModelExperimentalType);
