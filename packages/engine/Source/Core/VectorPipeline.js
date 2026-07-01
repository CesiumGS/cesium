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

// Clip segments to the tile expanded by a small margin instead of exactly to
// [0,1], for robustness at the shared tile boundary. The boundary artifacts
// observed so far are consistent with floating-point error placing a segment
// vertex slightly outside the tile; a segment lying just outside the edge could
// also bleed in through its half line-width, though that case is unconfirmed.
// The margin is a small fixed fraction of the tile, independent of line width.
const TILE_CLIP_MARGIN_UV = 0.001;

const polylineScratch = new BufferPolyline();
const polylineMaterialScratch = new BufferPolylineMaterial();
const scratchLocalPosition = new Cartesian3();
const scratchWorldPosition = new Cartesian3();
const scratchCartographic = new Cartographic();
const scratchLonLatA = [0.0, 0.0];
const scratchLonLatB = [0.0, 0.0];
const scratchClippedSegment = [0.0, 0.0, 0.0, 0.0];

// Per-collection cache of vertices projected to [longitude, latitude] radians.
// The projection (matrix transform + cartesianToCartographic per vertex) is
// tile-independent, so it is computed once per collection and reused across
// every terrain tile and re-bake, until the collection's model matrix or
// geometry version changes.
/**
 * @type {WeakMap<BufferPolylineCollection, {
 *   modelMatrix: Matrix4,
 *   primitiveCount: number,
 *   geometryVersion: number,
 *   polylines: Float64Array[],
 * }>}
 */
const projectionCache = new WeakMap();

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
 * @property {Float32Array} [segmentPrimitiveIndicesTexels] Index per segment, mapping to material for the segment.
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

    // Vertices projected to lon/lat are cached per collection (tile-independent);
    // here we only do the cheap per-tile UV projection + clip on those.
    const projected = this._getProjectedPolylines(collection, ellipsoid);
    const primitiveCount = collection.primitiveCount;

    for (let i = 0; i < primitiveCount; i++) {
      const polyline = /** @type {BufferPolyline} */ (
        collection.get(i, polylineScratch)
      );

      // Append materials unconditionally, to simplify indexing and updates.
      const polylineMaterial = /** @type {BufferPolylineMaterial} */ (
        polyline.getMaterial(polylineMaterialScratch)
      );
      result.widths.push(polylineMaterial.width);
      result.colors.push(
        Color.floatToByte(polylineMaterial.color.red),
        Color.floatToByte(polylineMaterial.color.green),
        Color.floatToByte(polylineMaterial.color.blue),
        Color.floatToByte(polylineMaterial.color.alpha),
      );

      if (!polyline.show) {
        continue;
      }

      const lonLat = projected[i];
      const vertexCount = lonLat.length / 2;

      for (let j = 0; j + 1 < vertexCount; j++) {
        const aLon = lonLat[j * 2];
        const bLon = lonLat[(j + 1) * 2];
        // A NaN longitude marks a vertex that failed to project; skip its segments.
        if (Number.isNaN(aLon) || Number.isNaN(bLon)) {
          continue;
        }
        scratchLonLatA[0] = aLon;
        scratchLonLatA[1] = lonLat[j * 2 + 1];
        scratchLonLatB[0] = bLon;
        scratchLonLatB[1] = lonLat[(j + 1) * 2 + 1];

        if (
          this._projectSegmentToTileUv(
            scratchLonLatA,
            scratchLonLatB,
            rectangle,
            width,
            scratchClippedSegment,
          ) &&
          this._clipSegmentToTile(
            scratchClippedSegment[0],
            scratchClippedSegment[1],
            scratchClippedSegment[2],
            scratchClippedSegment[3],
            TILE_CLIP_MARGIN_UV,
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
      }
    }

    result.primitiveCount += primitiveCount;
  }

  /**
   * Packs UV-space segments into a grid-indexed segment lookup. Returns the packed
   * segment texels (RGBA, -1 filled) plus a grid-cell index header.
   *
   * @param {VectorTileData} result
   */
  static packGridSegments(result) {
    const segments = result.segments;
    const segmentPrimitiveIndices = result.segmentPrimitiveIndices;

    const gridSize = Math.max(
      1,
      Math.ceil(Math.sqrt(segments.length / GRID_TARGET_SEGMENTS_PER_CELL)),
    );

    const grid = new Array(gridSize * gridSize);
    for (let i = 0; i < grid.length; i++) {
      grid[i] = [];
    }

    let packedSegmentCount = 0;
    // Expand each segment's bounding box by the neighbor padding, then assign it
    // to every grid cell the expanded box overlaps. This includes cells just
    // outside the segment (so the shader still tests lines near cell borders)
    // without a per-cell segment-to-rect distance computation. The shader does
    // the exact distance test, so the slight over-inclusion only costs a few
    // extra comparisons there.
    const padding = GRID_NEIGHBOR_PADDING_SCALE / gridSize;
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const minX = Math.max(0.0, Math.min(segment[0], segment[2]) - padding);
      const maxX = Math.min(1.0, Math.max(segment[0], segment[2]) + padding);
      const minY = Math.max(0.0, Math.min(segment[1], segment[3]) - padding);
      const maxY = Math.min(1.0, Math.max(segment[1], segment[3]) + padding);

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
          grid[y * gridSize + x].push(i);
          packedSegmentCount++;
        }
      }
    }

    const [textureWidth, textureHeight] =
      nextPowerOfTwoSize(packedSegmentCount);
    const capacity = textureWidth * textureHeight;

    const segmentTexels = new Float32Array(capacity * 4).fill(-1.0);
    const segmentPrimitiveIndicesTexels = new Float32Array(capacity).fill(-1.0);

    const gridCellIndices = new Uint32Array(grid.length + 2);
    gridCellIndices[0] = gridSize;
    gridCellIndices[1] = gridSize;

    let offset = 0;
    for (let i = 0; i < grid.length; i++) {
      const cellSegments = grid[i];
      for (let j = 0; j < cellSegments.length; j++) {
        const segmentIndex = cellSegments[j];
        const segment = segments[segmentIndex];
        segmentTexels[offset * 4] = segment[0]; // R
        segmentTexels[offset * 4 + 1] = segment[1]; // G
        segmentTexels[offset * 4 + 2] = segment[2]; // B
        segmentTexels[offset * 4 + 3] = segment[3]; // A

        const primitiveIndex = segmentPrimitiveIndices[segmentIndex];
        segmentPrimitiveIndicesTexels[offset] = primitiveIndex;

        offset++;
      }
      gridCellIndices[i + 2] = offset;
    }

    result.segmentTexels = segmentTexels;
    result.segmentTextureWidth = textureWidth;
    result.segmentTextureHeight = textureHeight;
    result.segmentPrimitiveIndicesTexels = segmentPrimitiveIndicesTexels;
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

    const [primTextureWidth, primTextureHeight] = nextPowerOfTwoSize(
      result.primitiveCount,
    );

    const widthTextureView = new Uint8Array(
      primTextureWidth * primTextureHeight,
    );
    widthTextureView.set(result.widths);
    result.widthTexture = new Texture({
      context,
      pixelFormat: PixelFormat.RED,
      pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
      source: {
        width: primTextureWidth,
        height: primTextureHeight,
        arrayBufferView: widthTextureView,
      },
      sampler: Sampler.NEAREST,
      flipY: false,
    });

    const colorTextureView = new Uint8Array(
      primTextureWidth * primTextureHeight * 4,
    );
    colorTextureView.set(result.colors);
    result.colorTexture = new Texture({
      context,
      pixelFormat: PixelFormat.RGBA,
      pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
      source: {
        width: primTextureWidth,
        height: primTextureHeight,
        arrayBufferView: colorTextureView,
      },
      sampler: Sampler.NEAREST,
      flipY: false,
    });

    result.segmentPrimitiveIndicesTexture = new Texture({
      context,
      pixelFormat: PixelFormat.RED,
      pixelDatatype: PixelDatatype.FLOAT,
      source: {
        width: result.segmentTextureWidth,
        height: result.segmentTextureHeight,
        arrayBufferView: result.segmentPrimitiveIndicesTexels,
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
   * Returns the collection's polyline vertices projected to [lon, lat] radians,
   * one Float64Array ([lon0, lat0, lon1, lat1, ...]) per primitive. Cached per
   * collection and reused until its model matrix or geometry changes, so the
   * per-vertex projection runs once instead of per tile and per re-bake. A
   * vertex that fails to project is stored as NaN.
   *
   * @param {BufferPolylineCollection} collection
   * @param {Ellipsoid} ellipsoid
   * @returns {Float64Array[]}
   * @private
   */
  static _getProjectedPolylines(collection, ellipsoid) {
    const modelMatrix = collection.modelMatrix;
    const primitiveCount = collection.primitiveCount;
    const geometryVersion = collection.geometryVersion;

    const cached = projectionCache.get(collection);
    if (
      defined(cached) &&
      cached.primitiveCount === primitiveCount &&
      cached.geometryVersion === geometryVersion &&
      Matrix4.equals(cached.modelMatrix, modelMatrix)
    ) {
      return cached.polylines;
    }

    const polylines = new Array(primitiveCount);
    for (let i = 0; i < primitiveCount; i++) {
      const polyline = /** @type {BufferPolyline} */ (
        collection.get(i, polylineScratch)
      );
      const positions = polyline.getPositions();
      const vertexCount = polyline.vertexCount;
      const lonLat = new Float64Array(vertexCount * 2);
      for (let j = 0; j < vertexCount; j++) {
        if (
          this._localPositionToLonLat(
            positions,
            j * 3,
            modelMatrix,
            ellipsoid,
            scratchLonLatA,
          )
        ) {
          lonLat[j * 2] = scratchLonLatA[0];
          lonLat[j * 2 + 1] = scratchLonLatA[1];
        } else {
          lonLat[j * 2] = NaN;
          lonLat[j * 2 + 1] = NaN;
        }
      }
      polylines[i] = lonLat;
    }

    projectionCache.set(collection, {
      modelMatrix: Matrix4.clone(modelMatrix),
      primitiveCount,
      geometryVersion,
      polylines,
    });
    return polylines;
  }

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

    // Unwrap B relative to A so the segment follows the shortest longitudinal
    // path (handles antimeridian-crossing segments).
    lonB = lonA + CesiumMath.negativePiToPi(lonB - lonA);

    // Shift the whole segment to the 2π frame nearest the tile center.
    const center = rectangle.west + width * 0.5;
    const shift = center + CesiumMath.negativePiToPi(lonA - center) - lonA;
    lonA += shift;
    lonB += shift;

    const height = rectangle.north - rectangle.south;
    result[0] = (lonA - rectangle.west) / width;
    result[1] = (a[1] - rectangle.south) / height;
    result[2] = (lonB - rectangle.west) / width;
    result[3] = (b[1] - rectangle.south) / height;
    return true;
  }

  /**
   * Clips a UV-space segment to the tile domain expanded by `margin` on each
   * side ([-margin, 1 + margin]^2) using Liang-Barsky, so a segment just outside
   * the tile boundary is still kept. Writes the clipped endpoints to result;
   * returns false when the segment is entirely outside.
   *
   * @param {number} ax
   * @param {number} ay
   * @param {number} bx
   * @param {number} by
   * @param {number} margin
   * @param {number[]} result
   * @returns {boolean}
   * @private
   */
  static _clipSegmentToTile(ax, ay, bx, by, margin, result) {
    const lo = -margin;
    const hi = 1.0 + margin;
    let tMin = 0.0;
    let tMax = 1.0;
    const dx = bx - ax;
    const dy = by - ay;
    const p = [-dx, dx, -dy, dy];
    const q = [ax - lo, hi - ax, ay - lo, hi - ay];

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
}

/**
 * @param {number} count
 * @returns {number[]}
 * @private
 */
function nextPowerOfTwoSize(count) {
  const width = CesiumMath.nextPowerOfTwo(
    Math.max(1, Math.ceil(Math.sqrt(count))),
  );
  const height = CesiumMath.nextPowerOfTwo(
    Math.max(1, Math.ceil(count / width)),
  );
  return [width, height];
}

export default VectorPipeline;
