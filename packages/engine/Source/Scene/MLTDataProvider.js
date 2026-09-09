// @ts-check

import Axis from "./Axis.js";
import Empty3DTileContent from "./Empty3DTileContent.js";
import TaskProcessor from "../Core/TaskProcessor.js";
import UrlTemplate3DTilesDataProvider, {
  getTileCoordinates,
} from "./UrlTemplate3DTilesDataProvider.js";
import VectorGltf3DTileContent from "./VectorGltf3DTileContent.js";
import defined from "../Core/defined.js";

/** @import Cesium3DTile from "./Cesium3DTile.js"; */
/** @import Cesium3DTileset from "./Cesium3DTileset.js"; */
/** @import HeightReference from "./HeightReference.js"; */
/** @import Rectangle from "../Core/Rectangle.js"; */
/** @import Resource from "../Core/Resource.js"; */
/** @import Scene from "./Scene.js"; */

/**
 * A MapLibre Tile (MLT) data provider. Loads .mlt tiles, converting them
 * dynamically (at runtime) into 3D Tiles. Tiles are decoded and converted to
 * renderable geometry in web workers.
 *
 * <div class="notice">
 * This object is normally not instantiated directly, use {@link MLTDataProvider.fromUrl}.
 * </div>
 *
 * @extends UrlTemplate3DTilesDataProvider
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @example
 * const provider = await Cesium.MLTDataProvider.fromUrl(
 *   "https://example.com/tiles/{z}/{x}/{y}.mlt",
 *   {
 *     minZoom: 0,
 *     maxZoom: 14,
 *     extent: Cesium.Rectangle.fromDegrees(-74.5, 40.3, -73.5, 41.1),
 *   },
 * );
 * provider.style = new Cesium.Cesium3DTileStyle({
 *   color: "color('cyan')",
 * });
 * scene.primitives.add(provider);
 */
class MLTDataProvider extends UrlTemplate3DTilesDataProvider {
  /**
   * @param {Resource|string} url URL template, containing {z}, {x}, and {y} placeholders.
   * @param {*} [options] Provider options. See {@link MLTDataProvider.fromUrl}.
   */
  constructor(url, options) {
    super(url, options);
    this._workerPoolSize = options?.workerPoolSize ?? 4;
    this._useDirectPath = options?.useDirectPath ?? true;
    /** @type {TaskProcessor[]|undefined} */
    this._taskProcessors = undefined;
    this._nextTaskProcessor = 0;
  }

  /**
   * Creates an MLTDataProvider from the specified URL template and options.
   *
   * @param {Resource|string} url URL template, containing {z}, {x}, and {y} placeholders.
   * @param {object} [options] Provider options.
   * @param {number} [options.minZoom=0] Minimum zoom level represented in the generated tileset.
   * @param {number} [options.maxZoom=14] Maximum zoom level represented in the generated tileset.
   * @param {Rectangle} [options.extent] Optional geographic extent in radians to constrain the generated tile tree.
   * @param {string} [options.featureIdProperty] Property name to use as feature ID.
   * @param {number} [options.workerPoolSize=4] Maximum number of web workers for MLT decoding.
   *   The effective pool size is <code>min(workerPoolSize, hardwareConcurrency - 1)</code>, at least 1.
   * @param {boolean} [options.useDirectPath=true] When true, the worker returns transferable
   *   geometry buffers consumed directly by the vector primitive collections, skipping glTF
   *   encoding/parsing and Model creation. Set to false to use the glTF round-trip path
   *   (useful for A/B benchmarking).
   * @param {HeightReference} [options.heightReference] Drapes the decoded points, lines and polygons onto the
   *   surfaces selected by the value: {@link HeightReference.CLAMP_TO_TERRAIN} drapes onto the globe,
   *   {@link HeightReference.CLAMP_TO_3D_TILE} drapes onto 3D Tiles and models, and
   *   {@link HeightReference.CLAMP_TO_GROUND} drapes onto both. Requires <code>options.scene</code>.
   * @param {Scene} [options.scene] The scene the generated tileset is rendered in, required when
   *   <code>options.heightReference</code> is a clamping value.
   * @returns {Promise<MLTDataProvider>}
   */
  static async fromUrl(url, options) {
    return /** @type {Promise<MLTDataProvider>} */ (
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
      contentType: "mlt",
      missingTilePolicy: { statusCodes: [404, 204] },

      /**
       * @param {Cesium3DTileset} tileset
       * @param {Cesium3DTile} tile
       * @param {Resource} resource
       * @param {ArrayBuffer} arrayBuffer
       * @ignore
       */
      createContent: async (tileset, tile, resource, arrayBuffer) => {
        const tileCoordinates = getTileCoordinates(tile);

        const taskProcessor = this._getTaskProcessor();
        const taskResult = await taskProcessor.scheduleTask(
          {
            arrayBuffer: arrayBuffer,
            tileX: tileCoordinates.tileX,
            tileY: tileCoordinates.tileY,
            tileZ: tileCoordinates.tileZ,
            featureIdProperty: featureIdProperty,
            outputFormat: this._useDirectPath ? "buffers" : "glb",
          },
          [arrayBuffer],
        );

        const result =
          /** @type {{glb?: Uint8Array, geometry?: import("./buildVectorTileBuffers.js").VectorTileBuffers}|undefined} */ (
            taskResult
          );
        if (
          !defined(result) ||
          (!defined(result.glb) && !defined(result.geometry))
        ) {
          return new Empty3DTileContent(tileset, tile);
        }

        if (defined(result.geometry)) {
          return VectorGltf3DTileContent.fromBuffers(
            tileset,
            tile,
            resource,
            result.geometry,
          );
        }

        return VectorGltf3DTileContent.fromGltf(
          tileset,
          tile,
          resource,
          result.glb,
        );
      },
    };
  }

  /**
   * Returns the next task processor from the pool (round-robin). Each
   * TaskProcessor owns exactly one web worker, so a pool is required for
   * parallel tile decoding.
   * @returns {TaskProcessor}
   * @ignore
   */
  _getTaskProcessor() {
    if (!defined(this._taskProcessors)) {
      const poolSize = Math.max(
        1,
        Math.min(
          this._workerPoolSize,
          (navigator.hardwareConcurrency ?? 4) - 1,
        ),
      );
      this._taskProcessors = new Array(poolSize)
        .fill(undefined)
        .map(() => new TaskProcessor("decodeAndBuildMLT"));
      this._nextTaskProcessor = 0;
    }
    const pool = this._taskProcessors;
    const processor = pool[this._nextTaskProcessor];
    this._nextTaskProcessor = (this._nextTaskProcessor + 1) % pool.length;
    return processor;
  }

  destroy() {
    if (defined(this._taskProcessors)) {
      for (const processor of this._taskProcessors) {
        processor.destroy();
      }
      this._taskProcessors = undefined;
    }
    return super.destroy();
  }
}

export default MLTDataProvider;
