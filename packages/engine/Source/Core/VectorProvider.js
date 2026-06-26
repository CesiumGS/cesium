// @ts-check

import BoundingSphere from "./BoundingSphere.js";
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
const collectionBoundsScratch = new BoundingSphere();
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
      this._changed.raiseEvent();
    }
  }

  /**
   * @param {BufferPrimitiveCollection<BufferPrimitive>} collection
   */
  remove(collection) {
    if (this._collections.delete(collection)) {
      this._changed.raiseEvent();
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

    // Aggregate clamped polyline segments from all registered collections into a
    // single tile-local lookup. Segments are projected into the terrain tile's
    // [0,1]^2 UV domain and clipped to the tile.
    /** @type {number[][]} */
    const segments = [];
    for (const collection of this._collections) {
      if (
        isHeightReferenceClamp(collection.heightReference) &&
        collectionOverlapsTileRect(collection, rectangle, tilingScheme)
      ) {
        if (collection instanceof BufferPolylineCollection) {
          VectorPipeline.appendPolylineSegments(
            collection,
            rectangle,
            width,
            ellipsoid,
            segments,
          );
        }
      }
    }

    if (segments.length === 0) {
      return undefined;
    }

    const packed = VectorPipeline.packGridSegments(segments);
    return {
      segmentTexels: packed.segmentTexels,
      segmentTextureWidth: packed.segmentTextureWidth,
      segmentTextureHeight: packed.segmentTextureHeight,
      gridCellIndices: packed.gridCellIndices,
    };
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
  const boundingVolume = collection.boundingVolume;
  if (!defined(boundingVolume) || boundingVolume.radius <= 0.0) {
    return true;
  }

  const { projection, ellipsoid } = tilingScheme;
  const collectionBounds = BoundingSphere.projectTo2D(
    boundingVolume,
    projection,
    collectionBoundsScratch,
  );
  const collectionRect = Rectangle.fromBoundingSphere(
    collectionBounds,
    ellipsoid,
    collectionRectangleScratch,
  );

  // A near-global or antimeridian-crossing rectangle cannot be compared reliably
  // against a tile rectangle, so do not skip in those cases.
  if (
    collectionRect.east < collectionRect.west ||
    Rectangle.computeWidth(collectionRect) >= CesiumMath.PI
  ) {
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
