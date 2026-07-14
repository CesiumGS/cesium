// @ts-check

import BufferPolylineCollection from "../Scene/BufferPolylineCollection.js";
import Rectangle from "./Rectangle.js";
import defined from "./defined.js";
import { isHeightReferenceClamp } from "../Scene/HeightReference.js";
import VectorPipeline from "./VectorPipeline.js";

/** @import BufferPrimitive from "../Scene/BufferPrimitive.js"; */
/** @import BufferPrimitiveCollection from "../Scene/BufferPrimitiveCollection.js"; */
/** @import Context from "../Renderer/Context.js"; */
/** @import Ellipsoid from "./Ellipsoid.js"; */
/** @import FrameState from "../Scene/FrameState.js"; */
/** @import TilingScheme from "./TilingScheme.js"; */
/** @import { VectorTileData, VectorCollectionData } from "./VectorPipeline.js"; */

/** @ignore */
const scratchCollectionRectangle = new Rectangle();
const scratchIntersectRectangle = new Rectangle();

/**
 * @typedef {object} VectorProviderConstructorOptions
 * @property {TilingScheme} tilingScheme
 * @private
 */

/**
 * @ignore
 */
class VectorProvider {
  /** @param {VectorProviderConstructorOptions} options */
  constructor(options) {
    /** @private */
    this._tilingScheme = options.tilingScheme;

    /**
     * @type {Map<BufferPrimitiveCollection<BufferPrimitive>, VectorCollectionData>}
     * @private
     */
    this._collections = new Map();
  }

  /** @type {TilingScheme} */
  get tilingScheme() {
    return this._tilingScheme;
  }

  set tilingScheme(value) {
    this._tilingScheme = value;
  }

  /** @type {Ellipsoid} */
  get ellipsoid() {
    return this._tilingScheme.ellipsoid;
  }

  /**
   * @param {BufferPrimitiveCollection<BufferPrimitive>} collection
   */
  update(collection) {
    if (!_isSupportedCollection(collection)) {
      return;
    }

    let collectionData = this._collections.get(collection);
    const isCached = defined(collectionData);

    // Precompute projected positions and material properties, avoiding
    // duplicated work per-tile. Call exits early if unchanged.
    collectionData = VectorPipeline.packPolylineCollectionData(
      /** @type {BufferPolylineCollection} */ (collection),
      this.tilingScheme,
      collectionData,
    );

    if (collection._dirtyCount > 0) {
      collection._makeClean(); // Increments version, if dirty.
      collectionData.version = collection._version;
    }

    collectionData.active = true;

    if (!isCached) {
      this._collections.set(collection, collectionData);
    }
  }

  /** @param {FrameState} frameState */
  beginFrame(frameState) {
    // Purge inactive collections and reset .active flag.
    for (const collection of this._collections.keys()) {
      const collectionData = this._collections.get(collection);
      if (!collectionData.active) {
        this._collections.delete(collection);
      }
      collectionData.active = false;
    }
  }

  /** @param {FrameState} frameState */
  endFrame(frameState) {}

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} level
   * @param {Context} context
   * @returns {VectorTileData|undefined}
   */
  requestTileData(x, y, level, context) {
    const tilingScheme = this._tilingScheme;
    const tileRectangle = tilingScheme.tileXYToRectangle(x, y, level);
    const width = Rectangle.computeWidth(tileRectangle);

    /** @type {VectorTileData} */
    const result = { show: true, collectionVersions: new Map() };

    const candidates = this.getCollectionCandidates(x, y, level);

    for (const collection of candidates) {
      VectorPipeline.packPolylineSegments(
        collection,
        this._collections.get(collection),
        tileRectangle,
        width,
        result,
      );

      result.collectionVersions.set(collection, collection._version);
    }

    if (!defined(result.segments) || result.segments.length === 0) {
      result.show = false;
      return result;
    }

    VectorPipeline.packPolylineGrid(result);
    VectorPipeline.packPolylineTextures(context, result);

    return result;
  }

  /**
   * @param {VectorTileData} data
   */
  releaseTileData(data) {
    VectorPipeline.freeResources(data);
  }

  /**
   * Re-bakes a tile's vector data if the tile overlaps a region changed since
   * the last {@link VectorProvider#makeClean}, releasing the previous data.
   * Returns the current data unchanged when the tile is outside every changed
   * region.
   *
   * @param {number} x
   * @param {number} y
   * @param {number} level
   * @param {Context} context
   * @param {VectorTileData|undefined} currentData
   * @returns {VectorTileData|undefined}
   */
  updateTileData(x, y, level, context, currentData) {
    const cachedVersions = currentData.collectionVersions;
    const collections = this.getCollectionCandidates(x, y, level);

    const useCached =
      collections.length === cachedVersions.size &&
      collections.every((collection) => cachedVersions.has(collection)) &&
      collections.every(
        (collection) => collection._version === cachedVersions.get(collection),
      );

    if (useCached) {
      return currentData;
    }

    this.releaseTileData(currentData);
    return this.requestTileData(x, y, level, context);
  }

  /**
   * Returns a list of candidate vector collections for processing with
   * this tile.
   *
   * @param {number} x
   * @param {number} y
   * @param {number} level
   * @returns {BufferPolylineCollection[]}
   */
  getCollectionCandidates(x, y, level) {
    const ellipsoid = this._tilingScheme.ellipsoid;
    const tileRectangle = this._tilingScheme.tileXYToRectangle(x, y, level);

    /** @type {BufferPolylineCollection[]} */
    const result = [];

    for (const collection of this._collections.keys()) {
      if (!_isSupportedCollection(collection)) {
        continue;
      }

      const collectionRectangle = Rectangle.fromBoundingSphere(
        collection.boundingVolume,
        ellipsoid,
        scratchCollectionRectangle,
      );

      const isIntersected = !!Rectangle.intersection(
        tileRectangle,
        collectionRectangle,
        scratchIntersectRectangle,
      );

      if (!isIntersected) {
        continue;
      }

      result.push(/** @type {BufferPolylineCollection} */ (collection));
    }

    return result;
  }
}

/**
 * @param {BufferPrimitiveCollection<BufferPrimitive>} collection
 * @returns {boolean}
 * @private
 */
function _isSupportedCollection(collection) {
  if (!isHeightReferenceClamp(collection.heightReference)) {
    return false;
  }

  if (!(collection instanceof BufferPolylineCollection)) {
    return false;
  }

  return true;
}

export default VectorProvider;
