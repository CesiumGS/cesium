// @ts-check

import BufferPolylineCollection from "../Scene/BufferPolylineCollection.js";
import CesiumMath from "./Math.js";
import Event from "./Event.js";
import Rectangle from "./Rectangle.js";
import defined from "./defined.js";
import { isHeightReferenceClamp } from "../Scene/HeightReference.js";
import VectorPipeline from "./VectorPipeline.js";

/** @import BufferPrimitive from "../Scene/BufferPrimitive.js"; */
/** @import BufferPrimitiveCollection from "../Scene/BufferPrimitiveCollection.js"; */
/** @import Ellipsoid from "./Ellipsoid.js"; */
/** @import TilingScheme from "./TilingScheme.js"; */
/** @import { VectorTileData } from "./VectorPipeline.js"; */

// Scratch variables for the cheap bounding-volume broad-phase and dirty-region
// rectangle computation.

/** @ignore */
const fromBoundingSphereScratch = new Rectangle();
/** @ignore */
const intersectionRectangleScratch = new Rectangle();
/** @ignore */
const updateTileRectangleScratch = new Rectangle();
/**
 * @type {Rectangle[]}
 * @ignore
 */
const markDirtyRectanglesScratch = [];
/**
 * @type {Rectangle[]}
 * @ignore
 */
const overlapRectanglesScratch = [];

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
     * Raised when the set of registered collections changes, so consumers can
     * invalidate any cached per-tile lookup data.
     * @type {Event<function(): void>}
     * @private
     */
    this._changed = new Event();

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

  /**
   * Gets an event raised when the registered collections change. Consumers
   * should invalidate cached tile data in response.
   * @type {Event<function(): void>}
   */
  get changed() {
    return this._changed;
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
      this._changed.raiseEvent();
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
      this._changed.raiseEvent();
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
      this._changed.raiseEvent();
    }
  }

  /**
   * Prunes selection-driven collections not marked in the frame that just ended.
   * @private
   */
  _commitSelectedFrame() {
    let changed = false;
    for (const collection of this._selectionDriven) {
      if (!this._selectedThisFrame.has(collection)) {
        this._selectionDriven.delete(collection);
        if (this._collections.delete(collection)) {
          this._markCollectionRegionDirty(collection);
          changed = true;
        }
      }
    }
    this._selectedThisFrame.clear();
    if (changed) {
      this._changed.raiseEvent();
    }
  }

  /**
   * Records a changed collection's region(s) so the next re-bake only touches
   * overlapping tiles.
   * @param {BufferPrimitiveCollection<BufferPrimitive>} collection
   * @private
   */
  _markCollectionRegionDirty(collection) {
    const count = computeCollectionRectangles(
      collection,
      this._tilingScheme.ellipsoid,
      markDirtyRectanglesScratch,
    );
    for (let i = 0; i < count; i++) {
      this._dirtyRectangles.push(
        Rectangle.clone(markDirtyRectanglesScratch[i]),
      );
    }
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} level
   * @returns {VectorTileData|undefined}
   */
  requestTileData(x, y, level) {
    const tilingScheme = this._tilingScheme;
    const ellipsoid = tilingScheme.ellipsoid;
    const rectangle = tilingScheme.tileXYToRectangle(x, y, level);
    const width = Rectangle.computeWidth(rectangle);

    /** @type {VectorTileData} */
    const data = {};

    for (const collection of this._collections) {
      if (!isHeightReferenceClamp(collection.heightReference)) {
        continue;
      }
      if (!collectionOverlapsTileRect(collection, rectangle, tilingScheme)) {
        continue;
      }

      if (collection instanceof BufferPolylineCollection) {
        VectorPipeline.appendPolylines(
          collection,
          rectangle,
          width,
          ellipsoid,
          data,
        );
      }
    }

    if (!defined(data.segments) || data.segments.length === 0) {
      return undefined;
    }

    VectorPipeline.packGridSegments(data);

    return data;
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
   * @param {VectorTileData|undefined} currentData
   * @returns {VectorTileData|undefined}
   */
  updateTileData(x, y, level, currentData) {
    if (!this._tileOverlapsDirtyRegion(x, y, level)) {
      return currentData;
    }
    if (defined(currentData)) {
      this.releaseTileData(currentData);
    }
    return this.requestTileData(x, y, level);
  }

  /**
   * Clears the regions recorded as changed. Call once after a re-bake pass has
   * updated the overlapping tiles via {@link VectorProvider#updateTileData}.
   */
  makeClean() {
    this._dirtyRectangles.length = 0;
  }

  /**
   * Whether a tile overlaps any region changed since the last
   * {@link VectorProvider#makeClean}. An empty dirty set means a non-local
   * change was recorded, so every tile is treated as dirty.
   *
   * @param {number} x
   * @param {number} y
   * @param {number} level
   * @returns {boolean}
   * @private
   */
  _tileOverlapsDirtyRegion(x, y, level) {
    const dirtyRectangles = this._dirtyRectangles;
    if (dirtyRectangles.length === 0) {
      return true;
    }
    const tileRectangle = this._tilingScheme.tileXYToRectangle(
      x,
      y,
      level,
      updateTileRectangleScratch,
    );
    for (let i = 0; i < dirtyRectangles.length; i++) {
      const dirtyRectangle = dirtyRectangles[i];
      if (
        tileRectangle.west <= dirtyRectangle.east &&
        tileRectangle.east >= dirtyRectangle.west &&
        tileRectangle.south <= dirtyRectangle.north &&
        tileRectangle.north >= dirtyRectangle.south
      ) {
        return true;
      }
    }
    return false;
  }
}

export default VectorProvider;

///////////////////////////////////////////////////////////////////////////////
// TILE OVERLAP DETECTION (broad-phase + exact test)

/**
 * Cheap broad-phase: tests whether a collection's region overlaps a terrain
 * tile's rectangle, so non-contributing collections are skipped before the
 * per-segment projection. Returns true when the collection has no region yet
 * (bounding volume computed lazily at render time) so no tile is wrongly dropped.
 * @param {BufferPrimitiveCollection<BufferPrimitive>} collection
 * @param {Rectangle} tileRect
 * @param {TilingScheme} tilingScheme
 * @returns {boolean}
 * @ignore
 */
function collectionOverlapsTileRect(collection, tileRect, tilingScheme) {
  const count = computeCollectionRectangles(
    collection,
    tilingScheme.ellipsoid,
    overlapRectanglesScratch,
  );

  // No region yet (zero-radius bounding volume): do not skip.
  if (count === 0) {
    return true;
  }

  for (let i = 0; i < count; i++) {
    if (
      defined(
        Rectangle.simpleIntersection(
          tileRect,
          overlapRectanglesScratch[i],
          intersectionRectangleScratch,
        ),
      )
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Lazily allocates and returns `array[index]`.
 * @param {Rectangle[]} array
 * @param {number} index
 * @returns {Rectangle}
 * @ignore
 */
function ensureRectangle(array, index) {
  let rectangle = array[index];
  if (!defined(rectangle)) {
    rectangle = new Rectangle();
    array[index] = rectangle;
  }
  return rectangle;
}

/**
 * Writes a collection's cartographic bounding rectangle(s) into `result` and
 * returns the count: 0 when empty or bounds not yet computed, 2 when the region
 * crosses the antimeridian (split at the seam), otherwise 1 (near-global regions
 * collapse to {@link Rectangle.MAX_VALUE}). Entries are reused; callers must use
 * the returned count, not `result.length`.
 * @param {BufferPrimitiveCollection<BufferPrimitive>} collection
 * @param {Ellipsoid} ellipsoid
 * @param {Rectangle[]} result
 * @returns {number}
 * @ignore
 */
function computeCollectionRectangles(collection, ellipsoid, result) {
  const boundingVolume = collection.boundingVolume;
  if (!defined(boundingVolume) || boundingVolume.radius <= 0.0) {
    return 0;
  }

  const rectangle = Rectangle.fromBoundingSphere(
    boundingVolume,
    ellipsoid,
    fromBoundingSphereScratch,
  );

  // Wider than a hemisphere has no usable lon/lat extent: treat as global.
  if (Rectangle.computeWidth(rectangle) >= CesiumMath.PI) {
    Rectangle.clone(Rectangle.MAX_VALUE, ensureRectangle(result, 0));
    return 1;
  }

  // fromBoundingSphere encodes an antimeridian crossing as east < west; split
  // it into two rectangles at the seam.
  if (rectangle.east < rectangle.west) {
    const eastPart = ensureRectangle(result, 0);
    eastPart.west = rectangle.west;
    eastPart.south = rectangle.south;
    eastPart.east = CesiumMath.PI;
    eastPart.north = rectangle.north;

    const westPart = ensureRectangle(result, 1);
    westPart.west = -CesiumMath.PI;
    westPart.south = rectangle.south;
    westPart.east = rectangle.east;
    westPart.north = rectangle.north;
    return 2;
  }

  Rectangle.clone(rectangle, ensureRectangle(result, 0));
  return 1;
}
