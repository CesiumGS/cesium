// @ts-check

import Axis from "./Axis.js";
import Empty3DTileContent from "./Empty3DTileContent.js";
import UrlTemplate3DTilesDataProvider, {
  getTileCoordinates,
} from "./UrlTemplate3DTilesDataProvider.js";
import VectorGltf3DTileContent from "./VectorGltf3DTileContent.js";
import buildVectorTileBuffers from "./buildVectorTileBuffers.js";
import decodeMVT from "./decodeMVT.js";
import defined from "../Core/defined.js";

/** @import Cesium3DTile from "./Cesium3DTile.js"; */
/** @import Cesium3DTileset from "./Cesium3DTileset.js"; */
/** @import HeightReference from "./HeightReference.js"; */
/** @import Rectangle from "../Core/Rectangle.js"; */
/** @import Resource from "../Core/Resource.js"; */
/** @import Scene from "./Scene.js"; */

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
   * @param {HeightReference} [options.heightReference] Drapes the decoded points, lines and polygons onto the
   *   surfaces selected by the value: {@link HeightReference.CLAMP_TO_TERRAIN} drapes onto the globe,
   *   {@link HeightReference.CLAMP_TO_3D_TILE} drapes onto 3D Tiles and models, and
   *   {@link HeightReference.CLAMP_TO_GROUND} drapes onto both. Requires <code>options.scene</code>.
   * @param {Scene} [options.scene] The scene the generated tileset is rendered in, required when
   *   <code>options.heightReference</code> is a clamping value.
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
      ...super._createTilesetLoadOptions(),
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
        const tileCoordinates = getTileCoordinates(tile);
        const geometry = buildVectorTileBuffers(decodedTile, tileCoordinates, {
          featureIdProperty: featureIdProperty,
        });
        if (!defined(geometry)) {
          return new Empty3DTileContent(tileset, tile);
        }
        return VectorGltf3DTileContent.fromBuffers(
          tileset,
          tile,
          resource,
          geometry,
        );
      },
    };
  }
}

export default MVTDataProvider;
