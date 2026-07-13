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
/** @import TilingScheme from "./TilingScheme.js"; */
/** @import { VectorTileData } from "./VectorPipeline.js"; */

/** @ignore */
const scratchTileRectangle = new Rectangle();
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

    // TODO(donmccurdy): Consider map of collection->{version, rectangle, positions, ...}, instead.
    /**
     * @type {Set<BufferPrimitiveCollection<BufferPrimitive>>}
     * @private
     */
    this._collections = new Set();

    /**
     * Per-collection cache of vertices projected to version and [lng, lat] in radians.
     * @type {WeakMap<BufferPrimitiveCollection<BufferPrimitive>, {version: number, positions: Float64Array}>}
     * @private
     */
    this._projectedPositionCache = new WeakMap();

    /**
     * Collections marked selected this frame (only these are baked).
     * @type {Set<BufferPrimitiveCollection<BufferPrimitive>>}
     * @private
     */
    this._selectedThisFrame = new Set();

    /**
     * Collections added via markSelected (not add); only these are pruned.
     * @type {Set<BufferPrimitiveCollection<BufferPrimitive>>}
     * @private
     */
    this._selectionDriven = new Set();

    /** @private */
    this._selectionFrameNumber = -1;

    /**
     * Cartographic regions changed since the last
     * {@link VectorProvider#consumeDirtyRegion}, so only overlapping terrain
     * tiles are re-baked.
     * @type {Rectangle[]}
     * @private
     */
    this._dirtyRectangles = [];
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
  add(collection) {
    const previousSize = this._collections.size;
    this._collections.add(collection);
    if (this._collections.size !== previousSize) {
      this._markCollectionRegionDirty(collection);
    }
  }

  /**
   * @param {BufferPrimitiveCollection<BufferPrimitive>} collection
   */
  remove(collection) {
    this._selectedThisFrame.delete(collection);
    this._selectionDriven.delete(collection);
    if (this._collections.delete(collection)) {
      this._markCollectionRegionDirty(collection);
    }
  }

  /**
   * Marks a collection as selected this frame so it is baked; collections not
   * marked are pruned next frame, keeping the baked set aligned with the
   * rendered LOD.
   *
   * @param {BufferPrimitiveCollection<BufferPrimitive>} collection
   * @param {number} frameNumber
   */
  markSelected(collection, frameNumber) {
    if (frameNumber !== this._selectionFrameNumber) {
      this._commitSelectedFrame();
      this._selectionFrameNumber = frameNumber;
    }
    this._selectedThisFrame.add(collection);
    this._selectionDriven.add(collection);
    const previousSize = this._collections.size;
    this._collections.add(collection);
    if (this._collections.size !== previousSize) {
      this._markCollectionRegionDirty(collection);
    }
  }

  /**
   * Prunes selection-driven collections not marked in the frame that just ended.
   * @private
   */
  _commitSelectedFrame() {
    for (const collection of this._selectionDriven) {
      if (!this._selectedThisFrame.has(collection)) {
        this._selectionDriven.delete(collection);
        if (this._collections.delete(collection)) {
          this._markCollectionRegionDirty(collection);
        }
      }
    }
    this._selectedThisFrame.clear();
  }

  /**
   * Records a changed collection's region(s) so the next re-bake only touches
   * overlapping tiles.
   * @param {BufferPrimitiveCollection<BufferPrimitive>} collection
   * @private
   */
  _markCollectionRegionDirty(collection) {
    const collectionRectangle = Rectangle.fromBoundingSphere(
      collection.boundingVolume,
      this._tilingScheme.ellipsoid,
      new Rectangle(),
    );
    this._dirtyRectangles.push(collectionRectangle);
  }

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
    const result = { show: true };

    for (const collection of this._collections) {
      if (!isHeightReferenceClamp(collection.heightReference)) {
        continue;
      }

      const collectionRectangle = Rectangle.fromBoundingSphere(
        collection.boundingVolume,
        tilingScheme.ellipsoid,
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

      if (collection instanceof BufferPolylineCollection) {
        const positions = this._getProjectedPositionsCached(collection);
        VectorPipeline.packPolylineSegments(
          collection,
          positions,
          tileRectangle,
          width,
          result,
        );
      }
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
    const dirtyRectangles = this._dirtyRectangles;
    const tilingScheme = this._tilingScheme;
    if (!intersectRectangles(x, y, level, dirtyRectangles, tilingScheme)) {
      return currentData;
    }

    if (defined(currentData)) {
      this.releaseTileData(currentData);
    }

    return this.requestTileData(x, y, level, context);
  }

  /**
   * Clears the regions recorded as changed. Call once after a re-bake pass has
   * updated the overlapping tiles via {@link VectorProvider#updateTileData}.
   */
  makeClean() {
    this._dirtyRectangles.length = 0;
  }

  /**
   * @param {BufferPrimitiveCollection<BufferPrimitive>} collection
   * @private
   */
  _getProjectedPositionsCached(collection) {
    const ellipsoid = this.ellipsoid;
    const cache = this._projectedPositionCache.get(collection);
    const dirty = collection._dirtyCount > 0;
    const outdated = cache?.version !== collection._version;

    let positions = cache?.positions;

    if (!defined(cache) || dirty || outdated) {
      positions = VectorPipeline.getProjectedPositions(
        collection,
        ellipsoid,
        positions,
      );

      // If collection is dirty, its version will be incremented +1 at
      // the end of this update cycle.
      this._projectedPositionCache.set(collection, {
        version: collection._version + (dirty ? 1 : 0),
        positions,
      });

      collection._makeClean();
    }

    return positions;
  }
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} level
 * @param {Rectangle[]} rectangles
 * @param {TilingScheme} tilingScheme
 * @returns {boolean}
 * @private
 */
function intersectRectangles(x, y, level, rectangles, tilingScheme) {
  // An empty dirty set means a non-local change was recorded, so every tile is treated as dirty.
  // TODO(donmccurdy): Disambiguate "no dirty region" vs "all regions dirty"? Use Rectangle.MAX_VALUE?
  if (rectangles.length === 0) {
    return true;
  }

  const tileRectangle = tilingScheme.tileXYToRectangle(
    x,
    y,
    level,
    scratchTileRectangle,
  );

  for (let i = 0; i < rectangles.length; i++) {
    const isIntersected = Rectangle.intersection(
      tileRectangle,
      rectangles[i],
      scratchIntersectRectangle,
    );

    if (isIntersected) {
      return true;
    }
  }

  return false;
}

export default VectorProvider;
