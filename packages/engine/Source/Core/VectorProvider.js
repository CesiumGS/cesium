// @ts-check

import BoundingSphere from "./BoundingSphere.js";
import BufferPolyline from "../Scene/BufferPolyline.js";
import BufferPolylineCollection from "../Scene/BufferPolylineCollection.js";
import Cartesian3 from "./Cartesian3.js";
import Cartographic from "./Cartographic.js";
import CesiumMath from "./Math.js";
import Color from "./Color.js";
import Event from "./Event.js";
import Matrix4 from "./Matrix4.js";
import Rectangle from "./Rectangle.js";
import defined from "./defined.js";

// /** @import BufferPolygonCollection from "../Scene/BufferPolygonCollection.js"; */
/** @import BufferPrimitive from "../Scene/BufferPrimitive.js"; */
/** @import BufferPrimitiveCollection from "../Scene/BufferPrimitiveCollection.js"; */
/** @import Ellipsoid from "./Ellipsoid.js"; */
/** @import { TypedArray } from "./globalTypes.js"; */
/** @import Texture from "../Renderer/Texture.js"; */
/** @import TilingScheme from "./TilingScheme.js"; */

// Scratch variables for the cheap bounding-volume broad-phase in getTileData.
const collectionBoundsScratch = new BoundingSphere();
const collectionRectangleScratch = new Rectangle();
const intersectionRectangleScratch = new Rectangle();

/**
 * @typedef {object} VectorProviderOptions
 * @property {TilingScheme} tilingScheme
 * @property {Ellipsoid} [ellipsoid]
 * @private
 */

/**
 * Vector geometry intersecting a terrain tile, mapped into the tile's [0,1]^2 UV domain.
 * @typedef {object} VectorData
 * @property {Color} color Tile tint color (CRIMSON when overlapped, else WHITE).
 * @property {number} [lineWidth] Representative line width, in pixels.
 * @property {Float32Array} [segmentTexels] Packed RGBA line segments (ax, ay, bx, by) in tile UV space, -1 filled.
 * @property {number} [segmentTextureWidth] Width of the segment texture, in texels.
 * @property {number} [segmentTextureHeight] Height of the segment texture, in texels.
 * @property {Uint32Array} [gridCellIndices] Grid header [gridWidth, gridHeight, ...per-cell end offsets].
 * @property {Texture} [segmentTexture] GPU texture of segmentTexels, uploaded lazily at draw time.
 * @property {Texture} [gridCellIndicesTexture] GPU texture of gridCellIndices, uploaded lazily at draw time.
 * @private
 */

/**
 * @ignore
 */
class VectorProvider {
  /** @param {VectorProviderOptions} [options] */
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
   * @readonly
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
    const before = this._collections.size;
    this._collections.add(collection);
    if (this._collections.size !== before) {
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
   * @returns {VectorData}
   */
  getTileData(x, y, level) {
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
        collection instanceof BufferPolylineCollection &&
        collectionOverlapsTileRect(collection, rectangle, tilingScheme)
      ) {
        appendPolylineSegments(
          collection,
          rectangle,
          width,
          ellipsoid,
          segments,
        );
      }
    }

    if (segments.length > 0) {
      const packed = packGridSegments(segments);
      return {
        color: Color.CRIMSON,
        lineWidth: DEFAULT_LINE_WIDTH,
        segmentTexels: packed.segmentTexels,
        segmentTextureWidth: packed.segmentTextureWidth,
        segmentTextureHeight: packed.segmentTextureHeight,
        gridCellIndices: packed.gridCellIndices,
      };
    }

    // TODO (next PR): Fallback for collections not yet draped (points, polygons)
    for (const collection of this._collections) {
      if (collection instanceof BufferPolylineCollection) {
        continue;
      }
      if (tileIntersectsCollection(x, y, level, tilingScheme, collection)) {
        return { color: Color.CRIMSON };
      }
    }

    return { color: Color.WHITE };
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

/**
 * @param {number} x
 * @param {number} y
 * @param {number} level
 * @param {TilingScheme} tilingScheme
 * @param {BufferPrimitiveCollection<BufferPrimitive>} collection
 * @returns {boolean}
 */
function tileIntersectsCollection(x, y, level, tilingScheme, collection) {
  const { ellipsoid } = tilingScheme;
  const tileRect = tilingScheme.tileXYToRectangle(x, y, level);

  if (!collectionOverlapsTileRect(collection, tileRect, tilingScheme)) {
    return false;
  }

  const cartesian = new Cartesian3();
  const cartographic = new Cartographic();

  const positionCount = collection._positionCount;
  const positionView = collection._positionView;

  for (let i = 0; i < positionCount; i++) {
    // @ts-expect-error TODO.
    Cartesian3.fromArray(positionView, i * 3, cartesian);
    ellipsoid.cartesianToCartographic(cartesian, cartographic);
    if (Rectangle.contains(tileRect, cartographic)) {
      return true;
    }
  }

  return false;
}

///////////////////////////////////////////////////////////////////////////////
// GPU LOOKUP DATA (clamped polylines)
//
// Projects clamped polyline segments into the
// terrain tile's [0,1]^2 UV domain, clips them to the tile, and packs them into
// a grid-indexed segment lookup consumed by the GlobeFS HAS_VECTOR_LAYER path.
// Unlike #13325 (which projected against each collection's own rectangle and
// clamped), this projects against the terrain tile rectangle and clips, so
// far-away geometry is removed rather than smeared onto the tile edges.

const DEFAULT_LINE_WIDTH = 2.0;
const GRID_TARGET_SEGMENTS_PER_CELL = 16;
const GRID_NEIGHBOR_PADDING_SCALE = 0.35;

const polylineScratch = new BufferPolyline();
const scratchLocalPosition = new Cartesian3();
const scratchWorldPosition = new Cartesian3();
const scratchCartographic = new Cartographic();
const scratchLonLatA = [0.0, 0.0];
const scratchLonLatB = [0.0, 0.0];
const scratchClippedSegment = [0.0, 0.0, 0.0, 0.0];

/**
 * Transforms a model-local position by the collection's model matrix and
 * converts it to [longitude, latitude] radians.
 * @param {TypedArray} positions
 * @param {number} offset
 * @param {Matrix4} modelMatrix
 * @param {Ellipsoid} ellipsoid
 * @param {number[]} result
 * @returns {boolean}
 */
function localPositionToLonLat(
  positions,
  offset,
  modelMatrix,
  ellipsoid,
  result,
) {
  // @ts-expect-error Cartesian3.fromArray accepts a TypedArray here.
  Cartesian3.fromArray(positions, offset, scratchLocalPosition);
  Matrix4.multiplyByPoint(
    modelMatrix,
    scratchLocalPosition,
    scratchWorldPosition,
  );
  const cartographic = ellipsoid.cartesianToCartographic(
    scratchWorldPosition,
    scratchCartographic,
  );
  if (!defined(cartographic)) {
    return false;
  }
  result[0] = cartographic.longitude;
  result[1] = cartographic.latitude;
  return true;
}

/**
 * Projects a polyline segment (two [lon, lat] endpoints, radians) into the
 * tile's [0,1]^2 UV domain. Endpoint B's longitude is first unwrapped to within
 * π of A so an antimeridian-crossing segment stays geometrically short instead
 * of spanning the globe; then both endpoints are shifted together to the 2π
 * frame nearest the tile center so a segment adjacent to (or crossing) the
 * tile's west/east edge projects correctly. Writes [uAx, uAy, uBx, uBy] and
 * returns false only on degenerate input.
 * @param {number[]} a [lonA, latA] radians
 * @param {number[]} b [lonB, latB] radians
 * @param {Rectangle} rectangle
 * @param {number} width
 * @param {number[]} result
 * @returns {boolean}
 */
function projectSegmentToTileUv(a, b, rectangle, width, result) {
  let lonA = a[0];
  let lonB = b[0];

  // Unwrap B relative to A so the segment follows the shortest longitudinal path
  // (handles antimeridian-crossing segments).
  while (lonB - lonA > CesiumMath.PI) {
    lonB -= CesiumMath.TWO_PI;
  }
  while (lonB - lonA < -CesiumMath.PI) {
    lonB += CesiumMath.TWO_PI;
  }

  // Shift the whole segment to the 2π frame nearest the tile center.
  const center = rectangle.west + width * 0.5;
  while (lonA < center - CesiumMath.PI) {
    lonA += CesiumMath.TWO_PI;
    lonB += CesiumMath.TWO_PI;
  }
  while (lonA > center + CesiumMath.PI) {
    lonA -= CesiumMath.TWO_PI;
    lonB -= CesiumMath.TWO_PI;
  }

  const height = rectangle.north - rectangle.south;
  result[0] = (lonA - rectangle.west) / width;
  result[1] = (a[1] - rectangle.south) / height;
  result[2] = (lonB - rectangle.west) / width;
  result[3] = (b[1] - rectangle.south) / height;
  return true;
}

/**
 * Clips a UV-space segment to the unit square [0,1]^2 using Liang-Barsky.
 * Writes the clipped endpoints to result and returns true when any portion lies
 * inside; returns false when the segment is entirely outside.
 * @param {number} ax
 * @param {number} ay
 * @param {number} bx
 * @param {number} by
 * @param {number[]} result
 * @returns {boolean}
 */
function clipSegmentToUnitSquare(ax, ay, bx, by, result) {
  let tMin = 0.0;
  let tMax = 1.0;
  const dx = bx - ax;
  const dy = by - ay;
  const p = [-dx, dx, -dy, dy];
  const q = [ax, 1.0 - ax, ay, 1.0 - ay];

  for (let i = 0; i < 4; i++) {
    if (Math.abs(p[i]) < 1.0e-12) {
      if (q[i] < 0.0) {
        return false;
      }
      continue;
    }

    const t = q[i] / p[i];
    if (p[i] < 0.0) {
      tMin = Math.max(tMin, t);
    } else {
      tMax = Math.min(tMax, t);
    }

    if (tMin > tMax) {
      return false;
    }
  }

  result[0] = ax + tMin * dx;
  result[1] = ay + tMin * dy;
  result[2] = ax + tMax * dx;
  result[3] = ay + tMax * dy;
  return true;
}

/**
 * Projects all visible polylines in a collection into tile-local UV segments,
 * clipped to the tile, appending [ax, ay, bx, by] to the segments array.
 * @param {BufferPolylineCollection} collection
 * @param {Rectangle} rectangle
 * @param {number} width
 * @param {Ellipsoid} ellipsoid
 * @param {number[][]} segments
 */
function appendPolylineSegments(
  collection,
  rectangle,
  width,
  ellipsoid,
  segments,
) {
  for (let i = 0; i < collection.primitiveCount; i++) {
    collection.get(i, polylineScratch);
    if (!polylineScratch.show) {
      continue;
    }

    const positions = polylineScratch.getPositions();
    const vertexCount = polylineScratch.vertexCount;

    let hasPrevious = localPositionToLonLat(
      positions,
      0,
      collection.modelMatrix,
      ellipsoid,
      scratchLonLatA,
    );

    for (let j = 0; j + 1 < vertexCount; j++) {
      // Endpoint A is the previous endpoint B (avoids recomputing). Alternate
      // the two scratch buffers so both endpoints survive each iteration.
      const a = j % 2 === 0 ? scratchLonLatA : scratchLonLatB;
      const b = j % 2 === 0 ? scratchLonLatB : scratchLonLatA;
      const hasB = localPositionToLonLat(
        positions,
        (j + 1) * 3,
        collection.modelMatrix,
        ellipsoid,
        b,
      );

      if (
        hasPrevious &&
        hasB &&
        projectSegmentToTileUv(a, b, rectangle, width, scratchClippedSegment) &&
        clipSegmentToUnitSquare(
          scratchClippedSegment[0],
          scratchClippedSegment[1],
          scratchClippedSegment[2],
          scratchClippedSegment[3],
          scratchClippedSegment,
        )
      ) {
        segments.push([
          scratchClippedSegment[0],
          scratchClippedSegment[1],
          scratchClippedSegment[2],
          scratchClippedSegment[3],
        ]);
      }

      hasPrevious = hasB;
    }
  }
}

/**
 * @param {number} index
 * @param {number} gridSize
 * @returns {number}
 */
function clampCellIndex(index, gridSize) {
  return Math.max(0, Math.min(gridSize - 1, index));
}

/**
 * @param {number} px
 * @param {number} py
 * @param {number} ax
 * @param {number} ay
 * @param {number} bx
 * @param {number} by
 * @returns {number}
 */
function pointToSegmentDistanceSquared(px, py, ax, ay, bx, by) {
  const abX = bx - ax;
  const abY = by - ay;
  const abLengthSquared = abX * abX + abY * abY;
  if (abLengthSquared < 1.0e-12) {
    const dx = px - ax;
    const dy = py - ay;
    return dx * dx + dy * dy;
  }

  const t = CesiumMath.clamp(
    ((px - ax) * abX + (py - ay) * abY) / abLengthSquared,
    0.0,
    1.0,
  );
  const closestX = ax + t * abX;
  const closestY = ay + t * abY;
  const dx = px - closestX;
  const dy = py - closestY;
  return dx * dx + dy * dy;
}

/**
 * @param {number} px
 * @param {number} py
 * @param {number} minX
 * @param {number} maxX
 * @param {number} minY
 * @param {number} maxY
 * @returns {number}
 */
function pointToRectDistanceSquared(px, py, minX, maxX, minY, maxY) {
  const dx = Math.max(minX - px, 0.0, px - maxX);
  const dy = Math.max(minY - py, 0.0, py - maxY);
  return dx * dx + dy * dy;
}

/**
 * @param {number} ax
 * @param {number} ay
 * @param {number} bx
 * @param {number} by
 * @param {number} minX
 * @param {number} maxX
 * @param {number} minY
 * @param {number} maxY
 * @returns {boolean}
 */
function segmentIntersectsRect(ax, ay, bx, by, minX, maxX, minY, maxY) {
  let tMin = 0.0;
  let tMax = 1.0;
  const dx = bx - ax;
  const dy = by - ay;

  const p = [-dx, dx, -dy, dy];
  const q = [ax - minX, maxX - ax, ay - minY, maxY - ay];

  for (let i = 0; i < 4; i++) {
    if (Math.abs(p[i]) < 1.0e-12) {
      if (q[i] < 0.0) {
        return false;
      }
      continue;
    }

    const t = q[i] / p[i];
    if (p[i] < 0.0) {
      tMin = Math.max(tMin, t);
    } else {
      tMax = Math.min(tMax, t);
    }

    if (tMin > tMax) {
      return false;
    }
  }

  return true;
}

/**
 * @param {number} ax
 * @param {number} ay
 * @param {number} bx
 * @param {number} by
 * @param {number} minX
 * @param {number} maxX
 * @param {number} minY
 * @param {number} maxY
 * @returns {number}
 */
function segmentToRectDistanceSquared(ax, ay, bx, by, minX, maxX, minY, maxY) {
  if (
    (ax >= minX && ax <= maxX && ay >= minY && ay <= maxY) ||
    (bx >= minX && bx <= maxX && by >= minY && by <= maxY) ||
    segmentIntersectsRect(ax, ay, bx, by, minX, maxX, minY, maxY)
  ) {
    return 0.0;
  }

  let minDistanceSquared = Math.min(
    pointToRectDistanceSquared(ax, ay, minX, maxX, minY, maxY),
    pointToRectDistanceSquared(bx, by, minX, maxX, minY, maxY),
  );

  minDistanceSquared = Math.min(
    minDistanceSquared,
    pointToSegmentDistanceSquared(minX, minY, ax, ay, bx, by),
    pointToSegmentDistanceSquared(maxX, minY, ax, ay, bx, by),
    pointToSegmentDistanceSquared(maxX, maxY, ax, ay, bx, by),
    pointToSegmentDistanceSquared(minX, maxY, ax, ay, bx, by),
  );

  return minDistanceSquared;
}

/**
 * Packs UV-space segments into a grid-indexed segment lookup. Returns the packed
 * segment texels (RGBA, -1 filled) plus a grid-cell index header.
 * @param {number[][]} segments
 * @returns {{segmentTexels: Float32Array, segmentTextureWidth: number, segmentTextureHeight: number, gridCellIndices: Uint32Array}|undefined}
 */
function packGridSegments(segments) {
  if (segments.length === 0) {
    return undefined;
  }

  const gridSize = Math.max(
    1,
    Math.ceil(Math.sqrt(segments.length / GRID_TARGET_SEGMENTS_PER_CELL)),
  );

  const grid = new Array(gridSize * gridSize);
  for (let i = 0; i < grid.length; i++) {
    grid[i] = [];
  }

  let packedSegmentCount = 0;
  const padding = GRID_NEIGHBOR_PADDING_SCALE / gridSize;
  const paddingSquared = padding * padding;
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const ax = segment[0];
    const ay = segment[1];
    const bx = segment[2];
    const by = segment[3];
    const minX = Math.max(0.0, Math.min(segment[0], segment[2]));
    const maxX = Math.min(1.0, Math.max(segment[0], segment[2]));
    const minY = Math.max(0.0, Math.min(segment[1], segment[3]));
    const maxY = Math.min(1.0, Math.max(segment[1], segment[3]));

    const startCellX = clampCellIndex(Math.floor(minX * gridSize), gridSize);
    const endCellX = clampCellIndex(Math.floor(maxX * gridSize), gridSize);
    const startCellY = clampCellIndex(Math.floor(minY * gridSize), gridSize);
    const endCellY = clampCellIndex(Math.floor(maxY * gridSize), gridSize);

    for (let y = startCellY; y <= endCellY; y++) {
      for (let x = startCellX; x <= endCellX; x++) {
        grid[y * gridSize + x].push(segment);
        packedSegmentCount++;
      }
    }

    for (let y = startCellY - 1; y <= endCellY + 1; y++) {
      if (y < 0 || y >= gridSize) {
        continue;
      }
      for (let x = startCellX - 1; x <= endCellX + 1; x++) {
        if (
          x < 0 ||
          x >= gridSize ||
          (x >= startCellX && x <= endCellX && y >= startCellY && y <= endCellY)
        ) {
          continue;
        }

        const cellMinX = x / gridSize;
        const cellMaxX = (x + 1) / gridSize;
        const cellMinY = y / gridSize;
        const cellMaxY = (y + 1) / gridSize;
        const distanceSquared = segmentToRectDistanceSquared(
          ax,
          ay,
          bx,
          by,
          cellMinX,
          cellMaxX,
          cellMinY,
          cellMaxY,
        );
        if (distanceSquared <= paddingSquared) {
          grid[y * gridSize + x].push(segment);
          packedSegmentCount++;
        }
      }
    }
  }

  const textureWidth = CesiumMath.nextPowerOfTwo(
    Math.max(1, Math.ceil(Math.sqrt(packedSegmentCount))),
  );
  const textureHeight = CesiumMath.nextPowerOfTwo(
    Math.max(1, Math.ceil(packedSegmentCount / textureWidth)),
  );
  const capacity = textureWidth * textureHeight;

  const segmentTexels = new Float32Array(capacity * 4);
  segmentTexels.fill(-1.0);

  const gridCellIndices = new Uint32Array(grid.length + 2);
  gridCellIndices[0] = gridSize;
  gridCellIndices[1] = gridSize;

  let offset = 0;
  for (let i = 0; i < grid.length; i++) {
    const cellSegments = grid[i];
    for (let j = 0; j < cellSegments.length; j++) {
      const segment = cellSegments[j];
      segmentTexels[offset * 4] = segment[0]; // R
      segmentTexels[offset * 4 + 1] = segment[1]; // G
      segmentTexels[offset * 4 + 2] = segment[2]; // B
      segmentTexels[offset * 4 + 3] = segment[3]; // A
      offset++;
    }
    gridCellIndices[i + 2] = offset;
  }

  return {
    segmentTexels: segmentTexels,
    segmentTextureWidth: textureWidth,
    segmentTextureHeight: textureHeight,
    gridCellIndices: gridCellIndices,
  };
}
