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

// Scratch variables for the cheap bounding-volume broad-phase in getTileData.

/** @ignore */
const collectionRectangleScratch = new Rectangle();
/** @ignore */
const intersectionRectangleScratch = new Rectangle();

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
     * Cartographic rectangles of collections changed since the last
     * {@link VectorProvider#consumeDirtyRegion}, so only overlapping terrain
     * tiles need re-baking.
     * @type {Rectangle[]}
     * @private
     */
    this._dirtyRectangles = [];

    /**
     * Set when a changed collection's region can't be represented (near-global
     * or antimeridian-crossing), forcing a full re-bake.
     * @private
     */
    this._dirtyAll = false;
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
   * Records the cartographic region of a changed collection so the next re-bake
   * only touches overlapping tiles. An unrepresentable region (near-global or
   * antimeridian-crossing) forces a full re-bake.
   * @param {BufferPrimitiveCollection<BufferPrimitive>} collection
   * @private
   */
  _markCollectionRegionDirty(collection) {
    if (this._dirtyAll) {
      return;
    }
    const rectangle = computeCollectionRectangle(
      collection,
      this._tilingScheme.ellipsoid,
      new Rectangle(),
    );
    if (!defined(rectangle)) {
      this._dirtyAll = true;
      this._dirtyRectangles.length = 0;
      return;
    }
    this._dirtyRectangles.push(rectangle);
  }

  /**
   * Returns and clears the regions changed since the last call, so the caller can
   * re-bake only the affected terrain tiles.
   * @returns {{ all: boolean, rectangles: Rectangle[] }}
   */
  consumeDirtyRegion() {
    const result = { all: this._dirtyAll, rectangles: this._dirtyRectangles };
    this._dirtyRectangles = [];
    this._dirtyAll = false;
    return result;
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
}

export default VectorProvider;

///////////////////////////////////////////////////////////////////////////////
// TILE OVERLAP DETECTION (broad-phase + exact test)

/**
 * Cheap broad-phase: tests whether a collection's world-space bounding volume
 * overlaps a terrain tile's rectangle, so collections that cannot contribute to
 * a tile are skipped before the per-segment projection.
 *
 * Conservative by design — returns true (do not skip) whenever the bounding
 * rectangle cannot be trusted, so the broad-phase never drops a tile that the
 * exact test would keep:
 *  - bounding volume not yet computed (zero radius, updated lazily at render time);
 *  - a rectangle spanning the full longitude range or crossing the antimeridian,
 *    where {@link Rectangle.fromBoundingSphere} cannot represent the seam.
 * @param {BufferPrimitiveCollection<BufferPrimitive>} collection
 * @param {Rectangle} tileRect
 * @param {TilingScheme} tilingScheme
 * @returns {boolean}
 * @ignore
 */
function collectionOverlapsTileRect(collection, tileRect, tilingScheme) {
  const collectionRect = computeCollectionRectangle(
    collection,
    tilingScheme.ellipsoid,
    collectionRectangleScratch,
  );

  // An unrepresentable rectangle (bounding volume not ready, near-global, or
  // antimeridian-crossing) cannot be compared reliably, so do not skip.
  if (!defined(collectionRect)) {
    return true;
  }

  return defined(
    Rectangle.simpleIntersection(
      tileRect,
      collectionRect,
      intersectionRectangleScratch,
    ),
  );
}

/**
 * Computes a collection's cartographic bounding rectangle from its ECEF bounding
 * volume, or returns undefined when it can't be represented reliably (bounding
 * volume not yet computed, near-global, or antimeridian-crossing).
 * @param {BufferPrimitiveCollection<BufferPrimitive>} collection
 * @param {Ellipsoid} ellipsoid
 * @param {Rectangle} result
 * @returns {Rectangle|undefined}
 * @ignore
 */
function computeCollectionRectangle(collection, ellipsoid, result) {
  const boundingVolume = collection.boundingVolume;
  if (!defined(boundingVolume) || boundingVolume.radius <= 0.0) {
    return undefined;
  }

  const rectangle = Rectangle.fromBoundingSphere(
    boundingVolume,
    ellipsoid,
    result,
  );

  if (
    rectangle.east < rectangle.west ||
    Rectangle.computeWidth(rectangle) >= CesiumMath.PI
  ) {
    return undefined;
  }

  return rectangle;
}
