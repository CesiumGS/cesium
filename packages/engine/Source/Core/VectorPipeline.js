// @ts-check

import PixelDatatype from "../Renderer/PixelDatatype.js";
import Sampler from "../Renderer/Sampler.js";
import Texture from "../Renderer/Texture.js";
import BufferPolyline from "../Scene/BufferPolyline.js";
import BufferPolylineMaterial from "../Scene/BufferPolylineMaterial.js";
import Cartesian3 from "./Cartesian3.js";
import Cartographic from "./Cartographic.js";
import Color from "./Color.js";
import CesiumMath from "./Math.js";
import Matrix4 from "./Matrix4.js";
import PixelFormat from "./PixelFormat.js";
import defined from "./defined.js";

/** @import BufferPolylineCollection from "../Scene/BufferPolylineCollection.js"; */
/** @import Context from "../Renderer/Context.js"; */
/** @import Ellipsoid from "./Ellipsoid.js"; */
/** @import Rectangle from "./Rectangle.js"; */
/** @import { TypedArray } from "./globalTypes.js"; */

const GRID_TARGET_SEGMENTS_PER_CELL = 16;
const GRID_NEIGHBOR_PADDING_SCALE = 0.35;

const polylineScratch = new BufferPolyline();
const polylineMaterialScratch = new BufferPolylineMaterial();
const scratchLocalPosition = new Cartesian3();
const scratchWorldPosition = new Cartesian3();
const scratchCartographic = new Cartographic();
const scratchLonLatA = [0.0, 0.0];
const scratchLonLatB = [0.0, 0.0];
const scratchClippedSegment = [0.0, 0.0, 0.0, 0.0];

/**
 * Vector geometry intersecting a terrain tile, mapped into the tile's [0,1]^2 UV domain.
 *
 * @typedef {object} VectorTileData
 *
 * Stage 1: Collect vector segments intersecting tile.
 * @property {number[][]} [segments]
 * @property {number[]} [segmentPrimitiveIndices] Index per segment, mapping to material for the segment.
 * @property {number[]} [widths] Segment widths, by primitive index.
 * @property {number[]} [colors] Segment colors, by primitive index.
 * @property {number} [primitiveCount] Number of vector primitives in tile.
 *
 * Stage 2: Build CPU grid structures.
 * @property {Float32Array} [segmentTexels] Packed RGBA line segments (ax, ay, bx, by) in tile UV space, -1 filled.
 * @property {number} [segmentTextureWidth] Width of the segment texture, in texels.
 * @property {number} [segmentTextureHeight] Height of the segment texture, in texels.
 * @property {Uint32Array} [gridCellIndices] Grid header [gridWidth, gridHeight, ...per-cell end offsets].
 *
 * Stage 3: Build GPU texture resources, uploaded lazily at draw time.
 * @property {Texture} [segmentTexture] GPU texture of segmentTexels.
 * @property {Texture} [segmentPrimitiveIndicesTexture] GPU texture of primitive indices per segment.
 * @property {Texture} [widthTexture] GPU texture of segment widths, by primitive index.
 * @property {Texture} [colorTexture] GPU texture of segment colors, by primitive index.
 * @property {Texture} [gridCellIndicesTexture] GPU texture of gridCellIndices.
 *
 * @private
 */

/**
 * Pipeline for vector data rendered using clamped {@link HeightReference} modes.
 *
 * Projects vector data into the [0,1]^2 UV domain of a given {@link TilingScheme}, clips to tile
 * bounds, and packs grid-indexed segment lookup tables consumed by Globe and 3D Tiles renderers.
 *
 * @see VectorProvider
 * @ignore
 */
class VectorPipeline {
  /////////////////////////////////////////////////////////////////////////////
  // PUBLIC METHODS

  /**
   * Projects all visible polylines in a collection into tile-local UV segments,
   * clipped to the tile, appending [ax, ay, bx, by] to the segments array.
   *
   * @param {BufferPolylineCollection} collection
   * @param {Rectangle} rectangle
   * @param {number} width
   * @param {Ellipsoid} ellipsoid
   * @param {VectorTileData} result
   */
  static appendPolylines(collection, rectangle, width, ellipsoid, result) {
    result.segments ??= [];
    result.widths ??= [];
    result.colors ??= [];
    result.segmentPrimitiveIndices ??= [];
    result.primitiveCount ??= 0;

    for (let i = 0; i < collection.primitiveCount; i++) {
      collection.get(i, polylineScratch);

      // Append materials unconditionally, to simplify indexing and updates.
      polylineScratch.getMaterial(polylineMaterialScratch);
      result.widths.push(polylineMaterialScratch.width);
      result.colors.push(
        Color.floatToByte(polylineMaterialScratch.color.red),
        Color.floatToByte(polylineMaterialScratch.color.green),
        Color.floatToByte(polylineMaterialScratch.color.blue),
        Color.floatToByte(polylineMaterialScratch.color.alpha),
      );

      if (!polylineScratch.show) {
        continue;
      }

      const positions = polylineScratch.getPositions();
      const vertexCount = polylineScratch.vertexCount;

      let hasPrevious = this._localPositionToLonLat(
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
        const hasB = this._localPositionToLonLat(
          positions,
          (j + 1) * 3,
          collection.modelMatrix,
          ellipsoid,
          b,
        );

        if (
          hasPrevious &&
          hasB &&
          this._projectSegmentToTileUv(
            a,
            b,
            rectangle,
            width,
            scratchClippedSegment,
          ) &&
          this._clipSegmentToUnitSquare(
            scratchClippedSegment[0],
            scratchClippedSegment[1],
            scratchClippedSegment[2],
            scratchClippedSegment[3],
            scratchClippedSegment,
          )
        ) {
          result.segments.push([
            scratchClippedSegment[0],
            scratchClippedSegment[1],
            scratchClippedSegment[2],
            scratchClippedSegment[3],
          ]);
          result.segmentPrimitiveIndices.push(result.primitiveCount + i);
        }

        hasPrevious = hasB;
      }
    }

    result.primitiveCount += collection.primitiveCount;
  }

  /**
   * Packs UV-space segments into a grid-indexed segment lookup. Returns the packed
   * segment texels (RGBA, -1 filled) plus a grid-cell index header.
   *
   * @param {VectorTileData} result
   */
  static packGridSegments(result) {
    const segments = result.segments;

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

      const startCellX = this._clampCellIndex(
        Math.floor(minX * gridSize),
        gridSize,
      );
      const endCellX = this._clampCellIndex(
        Math.floor(maxX * gridSize),
        gridSize,
      );
      const startCellY = this._clampCellIndex(
        Math.floor(minY * gridSize),
        gridSize,
      );
      const endCellY = this._clampCellIndex(
        Math.floor(maxY * gridSize),
        gridSize,
      );

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
            (x >= startCellX &&
              x <= endCellX &&
              y >= startCellY &&
              y <= endCellY)
          ) {
            continue;
          }

          const cellMinX = x / gridSize;
          const cellMaxX = (x + 1) / gridSize;
          const cellMinY = y / gridSize;
          const cellMaxY = (y + 1) / gridSize;
          const distanceSquared = VectorPipeline._segmentToRectDistanceSquared(
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

    result.segmentTexels = segmentTexels;
    result.segmentTextureWidth = textureWidth;
    result.segmentTextureHeight = textureHeight;
    result.gridCellIndices = gridCellIndices;
  }

  /**
   * @param {Context} context
   * @param {VectorTileData} result
   */
  static packLookupTextures(context, result) {
    result.segmentTexture = new Texture({
      context,
      pixelFormat: PixelFormat.RGBA,
      pixelDatatype: PixelDatatype.FLOAT,
      source: {
        width: result.segmentTextureWidth,
        height: result.segmentTextureHeight,
        arrayBufferView: result.segmentTexels,
      },
      sampler: Sampler.NEAREST,
      flipY: false,
    });

    result.widthTexture = new Texture({
      context,
      pixelFormat: PixelFormat.RED,
      pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
      source: {
        width: result.primitiveCount,
        height: 1,
        arrayBufferView: new Uint8Array(result.widths),
      },
      sampler: Sampler.NEAREST,
      flipY: false,
    });

    result.colorTexture = new Texture({
      context,
      pixelFormat: PixelFormat.RGBA,
      pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
      source: {
        width: result.primitiveCount,
        height: 1,
        arrayBufferView: new Uint8Array(result.colors),
      },
      sampler: Sampler.NEAREST,
      flipY: false,
    });

    const segmentPrimitiveIndicesTexture = new Float32Array(
      result.segmentTextureWidth * result.segmentTextureHeight,
    );
    segmentPrimitiveIndicesTexture.set(result.segmentPrimitiveIndices);
    result.segmentPrimitiveIndicesTexture = new Texture({
      context,
      pixelFormat: PixelFormat.RED,
      pixelDatatype: PixelDatatype.FLOAT,
      source: {
        width: result.segmentTextureWidth,
        height: result.segmentTextureHeight,
        arrayBufferView: segmentPrimitiveIndicesTexture,
      },
      sampler: Sampler.NEAREST,
      flipY: false,
    });

    result.gridCellIndicesTexture = new Texture({
      context: context,
      pixelFormat: PixelFormat.RED,
      pixelDatatype: PixelDatatype.FLOAT,
      source: {
        width: result.gridCellIndices.length,
        height: 1,
        arrayBufferView: new Float32Array(result.gridCellIndices),
      },
      sampler: Sampler.NEAREST,
      flipY: false,
    });
  }

  /**
   * @param {VectorTileData} data
   */
  static freeResources(data) {
    data.segmentTexture?.destroy();
    data.widthTexture?.destroy();
    data.colorTexture?.destroy();
    data.segmentPrimitiveIndicesTexture?.destroy();
    data.gridCellIndicesTexture?.destroy();
  }

  /////////////////////////////////////////////////////////////////////////////
  // INTERNAL METHODS

  /**
   * Transforms a model-local position by the collection's model matrix and
   * converts it to [longitude, latitude] radians.
   *
   * @param {TypedArray} positions
   * @param {number} offset
   * @param {Matrix4} modelMatrix
   * @param {Ellipsoid} ellipsoid
   * @param {number[]} result
   * @returns {boolean}
   * @private
   */
  static _localPositionToLonLat(
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
   *
   * @param {number[]} a [lonA, latA] radians
   * @param {number[]} b [lonB, latB] radians
   * @param {Rectangle} rectangle
   * @param {number} width
   * @param {number[]} result
   * @returns {boolean}
   * @private
   */
  static _projectSegmentToTileUv(a, b, rectangle, width, result) {
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
   *
   * @param {number} ax
   * @param {number} ay
   * @param {number} bx
   * @param {number} by
   * @param {number[]} result
   * @returns {boolean}
   * @private
   */
  static _clipSegmentToUnitSquare(ax, ay, bx, by, result) {
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
   * @param {number} index
   * @param {number} gridSize
   * @returns {number}
   * @private
   */
  static _clampCellIndex(index, gridSize) {
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
   * @private
   */
  static _pointToSegmentDistanceSquared(px, py, ax, ay, bx, by) {
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
   * @private
   */
  static _pointToRectDistanceSquared(px, py, minX, maxX, minY, maxY) {
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
   * @private
   */
  static _segmentIntersectsRect(ax, ay, bx, by, minX, maxX, minY, maxY) {
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
   * @private
   */
  static _segmentToRectDistanceSquared(ax, ay, bx, by, minX, maxX, minY, maxY) {
    if (
      (ax >= minX && ax <= maxX && ay >= minY && ay <= maxY) ||
      (bx >= minX && bx <= maxX && by >= minY && by <= maxY) ||
      this._segmentIntersectsRect(ax, ay, bx, by, minX, maxX, minY, maxY)
    ) {
      return 0.0;
    }

    let minDistanceSquared = Math.min(
      this._pointToRectDistanceSquared(ax, ay, minX, maxX, minY, maxY),
      this._pointToRectDistanceSquared(bx, by, minX, maxX, minY, maxY),
    );

    minDistanceSquared = Math.min(
      minDistanceSquared,
      this._pointToSegmentDistanceSquared(minX, minY, ax, ay, bx, by),
      this._pointToSegmentDistanceSquared(maxX, minY, ax, ay, bx, by),
      this._pointToSegmentDistanceSquared(maxX, maxY, ax, ay, bx, by),
      this._pointToSegmentDistanceSquared(minX, maxY, ax, ay, bx, by),
    );

    return minDistanceSquared;
  }
}

export default VectorPipeline;
