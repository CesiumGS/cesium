// @ts-check

import PixelDatatype from "../Renderer/PixelDatatype.js";
import Sampler from "../Renderer/Sampler.js";
import Texture from "../Renderer/Texture.js";
import BufferPolyline from "../Scene/BufferPolyline.js";
import BufferPolylineMaterial from "../Scene/BufferPolylineMaterial.js";
import Cartesian2 from "./Cartesian2.js";
import Cartesian3 from "./Cartesian3.js";
import Cartographic from "./Cartographic.js";
import Color from "./Color.js";
import CesiumMath from "./Math.js";
import Matrix4 from "./Matrix4.js";
import PixelFormat from "./PixelFormat.js";
import defined from "./defined.js";

/** @import BufferPrimitive from "../Scene/BufferPrimitive.js"; */
/** @import BufferPrimitiveCollection from "../Scene/BufferPrimitiveCollection.js"; */
/** @import BufferPolylineCollection from "../Scene/BufferPolylineCollection.js"; */
/** @import Context from "../Renderer/Context.js"; */
/** @import Ellipsoid from "./Ellipsoid.js"; */
/** @import Rectangle from "./Rectangle.js"; */

const GRID_TARGET_SEGMENTS_PER_CELL = 16;
const GRID_NEIGHBOR_PADDING_SCALE = 0.35;

const scratchPolyline = new BufferPolyline();
const scratchPolylineMaterial = new BufferPolylineMaterial();
const scratchLocalPosition = new Cartesian3();
const scratchWorldPosition = new Cartesian3();
const scratchCartographic = new Cartographic();
const scratchSegmentStart = new Cartesian2();
const scratchSegmentEnd = new Cartesian2();

/**
 * Vector geometry intersecting a terrain tile, mapped into the tile's [0,1]^2 UV domain.
 *
 * @typedef {object} VectorTileData
 *
 * Stage 1: Collect vector segments intersecting tile.
 * @property {boolean} show Whether this vector data should be rendered.
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
 * Snapshot of a polyline collection — projected vertex positions and
 * per-primitive material properties — extracted in a single pass so the
 * collection can be marked clean immediately afterward.
 *
 * @typedef {object} VectorCollectionData
 * @property {number} version Collection version at extraction time.
 * @property {number} primitiveCount
 * @property {Float64Array} positions Projected [lng, lat] vertex pairs, in radians.
 * @property {Uint32Array} vertexOffsets First vertex index, per primitive.
 * @property {Uint32Array} vertexCounts Vertex count, per primitive.
 * @property {Uint8Array} shows Show flag (0 or 1), per primitive.
 * @property {Float32Array} widths Width in pixels, per primitive.
 * @property {Uint8Array} colors RGBA color bytes, per primitive.
 * @property {Rectangle} [rectangle] Collection bounds at extraction time,
 *   managed by VectorProvider for dirty-region tracking.
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
  /**
   * Returns the collection's vertex positions, projected to [lng, lat]
   * coordinates, in radians, on the given ellipsoid.
   *
   * @param {BufferPrimitiveCollection<BufferPrimitive>} collection
   * @param {Ellipsoid} ellipsoid
   * @param {Float64Array} [result]
   */
  static getProjectedPositions(collection, ellipsoid, result) {
    if (!defined(result)) {
      result = new Float64Array(collection._positionCountMax * 2);
    }

    const positions = collection._positionView;
    const modelMatrix = collection.modelMatrix;

    for (let i = 0; i < collection._positionCount; i++) {
      const local = Cartesian3.fromArray(
        // @ts-expect-error https://github.com/CesiumGS/cesium/pull/13302
        positions,
        i * 3,
        scratchLocalPosition,
      );
      const world = Matrix4.multiplyByPoint(
        modelMatrix,
        local,
        scratchWorldPosition,
      );
      const cartographic = ellipsoid.cartesianToCartographic(
        world,
        scratchCartographic,
      );

      result[i * 2] = cartographic.longitude;
      result[i * 2 + 1] = cartographic.latitude;
    }

    return result;
  }

  /**
   * Extracts a {@link VectorCollectionData} snapshot from a polyline
   * collection in a single pass. Buffers on 'result' are reused when given.
   *
   * @param {BufferPolylineCollection} collection
   * @param {Ellipsoid} ellipsoid
   * @param {VectorCollectionData} [result]
   * @returns {VectorCollectionData}
   */
  static getPolylineData(collection, ellipsoid, result) {
    const positions = this.getProjectedPositions(
      collection,
      ellipsoid,
      result?.positions,
    );

    if (!defined(result)) {
      const primitiveCountMax = collection.primitiveCountMax;
      result = {
        version: -1,
        primitiveCount: 0,
        positions,
        vertexOffsets: new Uint32Array(primitiveCountMax),
        vertexCounts: new Uint32Array(primitiveCountMax),
        shows: new Uint8Array(primitiveCountMax),
        widths: new Float32Array(primitiveCountMax),
        colors: new Uint8Array(primitiveCountMax * 4),
      };
    } else {
      result.positions = positions;
    }

    const primitiveCount = collection.primitiveCount;
    for (let i = 0; i < primitiveCount; i++) {
      const polyline = /** @type {BufferPolyline} */ (
        collection.get(i, scratchPolyline)
      );
      const polylineMaterial = /** @type {BufferPolylineMaterial} */ (
        polyline.getMaterial(scratchPolylineMaterial)
      );

      result.vertexOffsets[i] = polyline.vertexOffset;
      result.vertexCounts[i] = polyline.vertexCount;
      result.shows[i] = polyline.show ? 1 : 0;
      result.widths[i] = polylineMaterial.width;
      result.colors[i * 4] = Color.floatToByte(polylineMaterial.color.red);
      result.colors[i * 4 + 1] = Color.floatToByte(
        polylineMaterial.color.green,
      );
      result.colors[i * 4 + 2] = Color.floatToByte(polylineMaterial.color.blue);
      result.colors[i * 4 + 3] = Color.floatToByte(
        polylineMaterial.color.alpha,
      );
    }
    result.primitiveCount = primitiveCount;

    return result;
  }

  /**
   * Projects all visible polylines in a collection into tile-local UV segments,
   * clipped to the tile, appending [ax, ay, bx, by] to the segments array.
   *
   * @param {VectorCollectionData} collectionData
   * @param {Rectangle} rectangle
   * @param {number} width
   * @param {VectorTileData} result
   */
  static packPolylineSegments(collectionData, rectangle, width, result) {
    result.segments ??= [];
    result.widths ??= [];
    result.colors ??= [];
    result.segmentPrimitiveIndices ??= [];
    result.primitiveCount ??= 0;

    const {
      primitiveCount,
      positions,
      vertexOffsets,
      vertexCounts,
      shows,
      widths,
      colors,
    } = collectionData;

    for (let i = 0; i < primitiveCount; i++) {
      // Append materials unconditionally, to simplify indexing and updates.
      result.widths.push(widths[i]);
      result.colors.push(
        colors[i * 4],
        colors[i * 4 + 1],
        colors[i * 4 + 2],
        colors[i * 4 + 3],
      );

      if (shows[i] === 0) {
        continue;
      }

      const vertexCount = vertexCounts[i];
      const vertexOffset = vertexOffsets[i];

      for (let j = 0; j + 1 < vertexCount; j++) {
        const segmentStart = Cartesian2.fromArray(
          // @ts-expect-error https://github.com/CesiumGS/cesium/pull/13302
          positions,
          (vertexOffset + j) * 2,
          scratchSegmentStart,
        );

        const segmentEnd = Cartesian2.fromArray(
          // @ts-expect-error https://github.com/CesiumGS/cesium/pull/13302
          positions,
          (vertexOffset + j + 1) * 2,
          scratchSegmentEnd,
        );

        _projectSegmentToTileUv(segmentStart, segmentEnd, rectangle, width);

        // Clip segments to the tile expanded by a small margin instead of exactly to
        // [0,1], for robustness at the shared tile boundary. The boundary artifacts
        // observed so far are consistent with floating-point error placing a segment
        // vertex slightly outside the tile; a segment lying just outside the edge could
        // also bleed in through its half line-width, though that case is unconfirmed.
        // The margin is a small fixed fraction of the tile, independent of line width.
        const clipped = _clipSegmentToTile(
          segmentStart,
          segmentEnd,
          CesiumMath.EPSILON3,
        );

        if (clipped) {
          result.segments.push([
            segmentStart.x,
            segmentStart.y,
            segmentEnd.x,
            segmentEnd.y,
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
  static packPolylineGrid(result) {
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

      const startCellX = _clampCellIndex(Math.floor(minX * gridSize), gridSize);
      const endCellX = _clampCellIndex(Math.floor(maxX * gridSize), gridSize);
      const startCellY = _clampCellIndex(Math.floor(minY * gridSize), gridSize);
      const endCellY = _clampCellIndex(Math.floor(maxY * gridSize), gridSize);

      for (let y = startCellY; y <= endCellY; y++) {
        for (let x = startCellX; x <= endCellX; x++) {
          grid[y * gridSize + x].push(i);
          packedSegmentCount++;
        }
      }
    }

    const [textureWidth, textureHeight] =
      _nextPowerOfTwoSize(packedSegmentCount);
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
  static packPolylineTextures(context, result) {
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

    const [primTextureWidth, primTextureHeight] = _nextPowerOfTwoSize(
      result.primitiveCount,
    );

    const widthTextureView = new Uint8Array(
      primTextureWidth * primTextureHeight,
    );
    // Clamp rather than TypedArray.set(), which wraps values modulo 256.
    const widths = result.widths;
    for (let i = 0; i < widths.length; i++) {
      widthTextureView[i] = CesiumMath.clamp(widths[i], 0, 255);
    }
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
}

/////////////////////////////////////////////////////////////////////////////
// INTERNAL METHODS

/**
 * Projects a polyline segment (start/end Cartesian2s, x=lng, y=lat, in radians) into the
 * tile's [0,1]^2 UV domain. Endpoint B's longitude is first unwrapped to within
 * π of A so an antimeridian-crossing segment stays geometrically short instead
 * of spanning the globe; then both endpoints are shifted together to the 2π
 * frame nearest the tile center so a segment adjacent to (or crossing) the
 * tile's west/east edge projects correctly. Result written to input Cartesian2s.
 *
 * Only supporting geographic tiling scheme (UV maps linearly to lon/lat)
 *
 * @param {Cartesian2} a [lonA, latA] radians, modified in place.
 * @param {Cartesian2} b [lonB, latB] radians, modified in place.
 * @param {Rectangle} rectangle
 * @param {number} width
 * @private
 */
function _projectSegmentToTileUv(a, b, rectangle, width) {
  let lonA = a.x;
  let lonB = b.x;

  // Unwrap B relative to A so the segment follows the shortest longitudinal
  // path (handles antimeridian-crossing segments).
  lonB = lonA + CesiumMath.negativePiToPi(lonB - lonA);

  // Shift the whole segment to the 2π frame nearest the tile center.
  const center = rectangle.west + width * 0.5;
  const shift = center + CesiumMath.negativePiToPi(lonA - center) - lonA;
  lonA += shift;
  lonB += shift;

  const height = rectangle.north - rectangle.south;
  a.x = (lonA - rectangle.west) / width;
  a.y = (a.y - rectangle.south) / height;
  b.x = (lonB - rectangle.west) / width;
  b.y = (b.y - rectangle.south) / height;
}

/**
 * Clips a UV-space segment to the tile domain expanded by `margin` on each
 * side ([-margin, 1 + margin]^2) using Liang-Barsky, so a segment just outside
 * the tile boundary is still kept. Writes the clipped endpoints to result;
 * returns false when the segment is entirely outside.
 *
 * @param {Cartesian2} a
 * @param {Cartesian2} b
 * @param {number} margin
 * @returns {boolean}
 * @private
 */
function _clipSegmentToTile(a, b, margin) {
  const lo = -margin;
  const hi = 1.0 + margin;

  let tMin = 0.0;
  let tMax = 1.0;

  const ax = a.x;
  const ay = a.y;
  const bx = b.x;
  const by = b.y;

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

  a.x = ax + tMin * dx;
  a.y = ay + tMin * dy;
  b.x = ax + tMax * dx;
  b.y = ay + tMax * dy;

  return true;
}

/**
 * @param {number} index
 * @param {number} gridSize
 * @returns {number}
 * @private
 */
function _clampCellIndex(index, gridSize) {
  return Math.max(0, Math.min(gridSize - 1, index));
}

/**
 * @param {number} count
 * @returns {number[]}
 * @private
 */
function _nextPowerOfTwoSize(count) {
  const width = CesiumMath.nextPowerOfTwo(
    Math.max(1, Math.ceil(Math.sqrt(count))),
  );
  const height = CesiumMath.nextPowerOfTwo(
    Math.max(1, Math.ceil(count / width)),
  );
  return [width, height];
}

export default VectorPipeline;
