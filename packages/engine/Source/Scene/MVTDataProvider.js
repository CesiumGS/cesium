// @ts-check

import Axis from "./Axis.js";
import Empty3DTileContent from "./Empty3DTileContent.js";
import RuntimeError from "../Core/RuntimeError.js";
import UrlTemplate3DTilesDataProvider from "./UrlTemplate3DTilesDataProvider.js";
import VectorGltf3DTileContent from "./VectorGltf3DTileContent.js";
import buildVectorGltfFromMVT from "./buildVectorGltfFromMVT.js";
import decodeMVT from "./decodeMVT.js";
import oneTimeWarning from "../Core/oneTimeWarning.js";
import defined from "../Core/defined.js";

/** @import Cesium3DTile from "./Cesium3DTile.js"; */
/** @import Cesium3DTileset from "./Cesium3DTileset.js"; */
/** @import Rectangle from "../Core/Rectangle.js"; */
/** @import Resource from "../Core/Resource.js"; */

/**
 * A Mapbox Vector Tiles (MVT) data provider. Loads .mvt or .pbf tiles, converting tiles
 * dynamically (at runtime) into 3D Tiles.
 *
 * <div class="notice">
 * This object is normally not instantiated directly, use {@link MVTDataProvider.fromUrl}.
 * </div>
 *
 * @extends UrlTemplate3DTilesDataProvider
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class MVTDataProvider extends UrlTemplate3DTilesDataProvider {
  /**
   * Creates an MVTDataProvider from the specified URL template and options.
   *
   * @param {Resource|string} url URL template, containing {z}, {x}, and {y} placeholders.
   * @param {object} [options] Provider options.
   * @param {number} [options.minZoom=0] Minimum zoom level represented in the generated tileset.
   * @param {number} [options.maxZoom=14] Maximum zoom level represented in the generated tileset.
   * @param {Rectangle} [options.extent] Optional geographic extent in radians to constrain the generated tile tree.
   * @param {string} [options.featureIdProperty] MVT property name to use as feature ID.
   * @returns {Promise<MVTDataProvider>}
   */
  static async fromUrl(url, options) {
    return /** @type {Promise<MVTDataProvider>} */ (
      super.fromUrl(url, options)
    );
  }

  /**
   * @returns {object}
   * @protected
   * @ignore
   */
  _createTilesetLoadOptions() {
    return {
      skipLevelOfDetail: false,
      enablePick: true,
      featureIdLabel: "featureId_0",
      instanceFeatureIdLabel: "instanceFeatureId_0",
    };
  }

  /**
   * @param {Cesium3DTileset} tileset
   * @protected
   * @ignore
   */
  _configureTileset(tileset) {
    tileset._modelUpAxis = Axis.Z;
    tileset._modelForwardAxis = Axis.X;
  }

  /**
   * @returns {object}
   * @protected
   * @ignore
   */
  _createCodec() {
    const featureIdProperty = this._featureIdProperty;
    return {
      contentType: "mvt",
      missingTilePolicy: { statusCodes: [404, 204] },

      /**
       * @param {Cesium3DTileset} tileset
       * @param {Cesium3DTile} tile
       * @param {Resource} resource
       * @param {ArrayBuffer} arrayBuffer
       * @ignore
       */
      createContent: async (tileset, tile, resource, arrayBuffer) => {
        const decodedTile = decodeMVT(arrayBuffer);
        const tileCoordinates = parseTileCoordinates(
          resource.getUrlComponent(true),
        );
        const glb = buildVectorGltfFromMVT(decodedTile, tileCoordinates, {
          featureIdProperty: featureIdProperty,
        });
        if (!defined(glb)) {
          if (!hasAnyDecodedFeatures(decodedTile)) {
            return new Empty3DTileContent(tileset, tile);
          }
          throw new RuntimeError(
            "Decoded MVT tile did not produce vector glTF content.",
          );
        }
        return VectorGltf3DTileContent.fromGltf(tileset, tile, resource, glb);
      },
    };
  }
}

/**
 * @param {string} url
 * @returns {{tileZ:number, tileX:number, tileY:number}}
 * @ignore
 */
function parseTileCoordinates(url) {
  const match = url.match(/\/(\d+)\/(\d+)\/(\d+)(?:\.[^/?#]+)?(?:[?#]|$)/i);
  if (!match) {
    oneTimeWarning(
      "MVTDataProvider.parseTileCoordinates",
      `MVT tile URL did not match /{z}/{x}/{y} pattern. Falling back to z/x/y = 0/0/0. URL: ${url}`,
    );
    return { tileZ: 0, tileX: 0, tileY: 0 };
  }
  return {
    tileZ: parseInt(match[1], 10),
    tileX: parseInt(match[2], 10),
    tileY: parseInt(match[3], 10),
  };
}

/**
 * @param {{layers:Array<{features:Array<*>}>}} decodedTile
 * @returns {boolean}
 * @ignore
 */
function hasAnyDecodedFeatures(decodedTile) {
  const layers = decodedTile.layers;
  for (let i = 0; i < layers.length; i++) {
    if (layers[i].features.length > 0) {
      return true;
    }
  }
  return false;
}

MVTDataProvider._parseTileCoordinates = parseTileCoordinates;

export default MVTDataProvider;
