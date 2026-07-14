// @ts-check

import BufferPolylineCollection from "../Scene/BufferPolylineCollection.js";
import Rectangle from "./Rectangle.js";
import defined from "./defined.js";
import VectorPipeline from "./VectorPipeline.js";

/** @import BufferPrimitive from "../Scene/BufferPrimitive.js"; */
/** @import BufferPrimitiveCollection from "../Scene/BufferPrimitiveCollection.js"; */
/** @import Context from "../Renderer/Context.js"; */
/** @import Ellipsoid from "./Ellipsoid.js"; */
/** @import TilingScheme from "./TilingScheme.js"; */
/** @import { VectorCollectionData, VectorTileData } from "./VectorPipeline.js"; */

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

    /**
     * @type {Set<BufferPrimitiveCollection<BufferPrimitive>>}
     * @private
     */
    this._collections = new Set();

    /**
     * Per-collection snapshot of projected positions and per-primitive
     * material properties, keyed by collection version.
     * @type {WeakMap<BufferPrimitiveCollection<BufferPrimitive>, VectorCollectionData>}
     * @private
     */
    this._collectionDataCache = new WeakMap();

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
     * {@link VectorProvider#makeClean}, so only overlapping terrain
     * tiles are re-baked.
     * @type {Rectangle[]}
     * @private
     */
    this._dirtyRectangles = [];

    /**
     * Total number of dirty regions ever recorded. Tile data is stamped with
     * this value when validated, so a tile that missed regions cleared while
     * it was not rendered can be detected and re-baked.
     * @private
     */
    this._changeCount = 0;

    /**
     * Value of {@link VectorProvider#_changeCount} at the last
     * {@link VectorProvider#makeClean}.
     * @private
     */
    this._changeCountAtClean = 0;
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
    this._changeCount++;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} level
   * @param {Context} context
   * @returns {VectorTileData}
   */
  requestTileData(x, y, level, context) {
    const tilingScheme = this._tilingScheme;
    const tileRectangle = tilingScheme.tileXYToRectangle(x, y, level);
    const width = Rectangle.computeWidth(tileRectangle);

    /** @type {VectorTileData} */
    const result = { show: true, changeCount: this._changeCount };

    for (const collection of this._collections) {
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
        const collectionData = this._getPolylineDataCached(collection);
        VectorPipeline.packPolylineSegments(
          collection,
          collectionData,
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
   * region. A tile whose data predates regions already cleared — because the
   * tile was not rendered while they were consumed — is re-baked
   * conservatively.
   *
   * @param {number} x
   * @param {number} y
   * @param {number} level
   * @param {Context} context
   * @param {VectorTileData|undefined} currentData
   * @returns {VectorTileData|undefined}
   */
  updateTileData(x, y, level, context, currentData) {
    const validated =
      defined(currentData) &&
      currentData.changeCount >= this._changeCountAtClean;

    if (
      validated &&
      !intersectRectangles(
        x,
        y,
        level,
        this._dirtyRectangles,
        this._tilingScheme,
      )
    ) {
      // Now validated against every recorded change.
      currentData.changeCount = this._changeCount;
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
    this._changeCountAtClean = this._changeCount;
  }

  /**
   * Records dirty regions for collections whose content has changed since
   * their last extraction, so overlapping tiles are re-baked. Call once per
   * frame, before {@link VectorProvider#updateTileData}.
   */
  update() {
    for (const collection of this._collections) {
      const cache = this._collectionDataCache.get(collection);
      if (!defined(cache)) {
        // Never extracted; new tiles bake on request.
        continue;
      }
      const changed =
        collection._dirtyCount > 0 || cache.version !== collection._version;
      if (!changed) {
        continue;
      }
      // Re-bake both the previously baked region (content may have moved
      // away from it) and the collection's current region.
      if (defined(cache.rectangle)) {
        this._dirtyRectangles.push(Rectangle.clone(cache.rectangle));
      }
      this._markCollectionRegionDirty(collection);
    }
  }

  /**
   * Returns the collection's {@link VectorCollectionData} snapshot,
   * re-extracted when the collection has changed. The collection is marked
   * clean only after everything has been read back.
   *
   * @param {BufferPolylineCollection} collection
   * @returns {VectorCollectionData}
   * @private
   */
  _getPolylineDataCached(collection) {
    const cache = this._collectionDataCache.get(collection);
    const dirty = collection._dirtyCount > 0;
    const outdated = cache?.version !== collection._version;

    if (defined(cache) && !dirty && !outdated) {
      return cache;
    }

    const data = VectorPipeline.packPolylineCollectionData(
      collection,
      this._tilingScheme,
      cache,
    );

    // If dirty, the version increments +1 when marked clean below.
    data.version = collection._version + (dirty ? 1 : 0);
    data.rectangle = Rectangle.fromBoundingSphere(
      collection.boundingVolume,
      this.ellipsoid,
      data.rectangle,
    );
    this._collectionDataCache.set(collection, data);

    collection._makeClean();

    return data;
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
  // No dirty regions recorded — nothing to re-bake. A caller needing a full
  // re-bake should record Rectangle.MAX_VALUE instead.
  if (rectangles.length === 0) {
    return false;
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
