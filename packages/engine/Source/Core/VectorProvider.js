// @ts-check

import BufferPointCollection from "../Scene/BufferPointCollection.js";
import BufferPolygonCollection from "../Scene/BufferPolygonCollection.js";
import BufferPolylineCollection from "../Scene/BufferPolylineCollection.js";
import CesiumMath from "./Math.js";
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
 * Packing functions for a collection type.
 *
 * @typedef {object} CollectionPacker
 * @property {(collection: *, tilingScheme: TilingScheme, result?: VectorCollectionData) => VectorCollectionData} packCollectionData Extracts the per-collection snapshot.
 * @property {(collection: *, collectionData: VectorCollectionData, rectangle: Rectangle, width: number, result: VectorTileData) => void} packTilePrimitives Packs the collection's primitives into a tile.
 * @private
 */

/**
 * Per-type packing functions, keyed by collection class.
 * @type {Map<Function, CollectionPacker>}
 * @private
 */
const collectionPackers = new Map();
collectionPackers.set(BufferPolylineCollection, {
  packCollectionData: VectorPipeline.packPolylineCollectionData,
  packTilePrimitives: VectorPipeline.packPolylineSegments,
});
collectionPackers.set(BufferPolygonCollection, {
  packCollectionData: VectorPipeline.packPolygonCollectionData,
  packTilePrimitives: VectorPipeline.packPolygonRings,
});
collectionPackers.set(BufferPointCollection, {
  packCollectionData: VectorPipeline.packPointCollectionData,
  packTilePrimitives: VectorPipeline.packPointSegments,
});

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
    this._dirtyRectangles.push(
      computeCollectionRectangle(
        collection,
        this._tilingScheme.ellipsoid,
        new Rectangle(),
      ),
    );
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
    const result = { show: true };

    for (const collection of this._collections) {
      const packer = collectionPackers.get(collection.constructor);
      if (!defined(packer)) {
        continue;
      }

      const collectionRectangle = computeCollectionRectangle(
        collection,
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

      const collectionData = this._getCollectionDataCached(
        collection,
        packer.packCollectionData,
      );
      packer.packTilePrimitives(
        collection,
        collectionData,
        tileRectangle,
        width,
        result,
      );
    }

    // Points pack as zero-length segments, sharing the polyline lookup.
    const hasSegments = defined(result.segments) && result.segments.length > 0;
    const hasPolygons =
      defined(result.polygonRings) && result.polygonRings.length > 0;

    if (!hasSegments && !hasPolygons) {
      result.show = false;
      return result;
    }

    if (hasSegments) {
      VectorPipeline.packPolylineGrid(result);
      VectorPipeline.packPolylineTextures(context, result);
    }

    if (hasPolygons) {
      VectorPipeline.packPolygonGrid(result);
      VectorPipeline.packPolygonTextures(context, result);
    }

    VectorPipeline.packPrimitiveTextures(context, result);

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
   * @param {BufferPrimitiveCollection<BufferPrimitive>} collection
   * @param {(collection: *, tilingScheme: TilingScheme, result?: VectorCollectionData) => VectorCollectionData} packCollectionData
   * @returns {VectorCollectionData}
   * @private
   */
  _getCollectionDataCached(collection, packCollectionData) {
    const cache = this._collectionDataCache.get(collection);
    const dirty = collection._dirtyCount > 0;
    const outdated = cache?.version !== collection._version;

    if (defined(cache) && !dirty && !outdated) {
      return cache;
    }

    const data = packCollectionData(collection, this._tilingScheme, cache);

    // If dirty, the version increments +1 when marked clean below.
    data.version = collection._version + (dirty ? 1 : 0);
    data.rectangle = computeCollectionRectangle(
      collection,
      this.ellipsoid,
      data.rectangle,
    );
    this._collectionDataCache.set(collection, data);

    collection._makeClean();

    return data;
  }
}

/**
 * Computes the cartographic rectangle covered by a collection. A collection
 * of a single point has a zero-radius bounding sphere, which projects to a
 * zero-area rectangle that {@link Rectangle.intersection} treats as empty;
 * expand degenerate extents by a small epsilon so such collections still
 * intersect the tiles containing them.
 *
 * @param {BufferPrimitiveCollection<BufferPrimitive>} collection
 * @param {Ellipsoid} ellipsoid
 * @param {Rectangle} [result]
 * @returns {Rectangle}
 * @private
 */
function computeCollectionRectangle(collection, ellipsoid, result) {
  result = Rectangle.fromBoundingSphere(
    collection.boundingVolume,
    ellipsoid,
    result,
  );
  if (result.east - result.west < CesiumMath.EPSILON10) {
    result.west -= CesiumMath.EPSILON10;
    result.east += CesiumMath.EPSILON10;
  }
  if (result.north - result.south < CesiumMath.EPSILON10) {
    result.south -= CesiumMath.EPSILON10;
    result.north += CesiumMath.EPSILON10;
  }
  return result;
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
