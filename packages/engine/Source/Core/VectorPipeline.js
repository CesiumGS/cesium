// @ts-check

import PixelDatatype from "../Renderer/PixelDatatype.js";
import Sampler from "../Renderer/Sampler.js";
import Texture from "../Renderer/Texture.js";
import BufferPolygon from "../Scene/BufferPolygon.js";
import BufferPolygonMaterial from "../Scene/BufferPolygonMaterial.js";
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
import Rectangle from "./Rectangle.js";

/** @import BufferPrimitive from "../Scene/BufferPrimitive.js"; */
/** @import BufferPrimitiveCollection from "../Scene/BufferPrimitiveCollection.js"; */
/** @import BufferPolygonCollection from "../Scene/BufferPolygonCollection.js"; */
/** @import BufferPolylineCollection from "../Scene/BufferPolylineCollection.js"; */
/** @import Context from "../Renderer/Context.js"; */
/** @import Ellipsoid from "./Ellipsoid.js"; */
/** @import TilingScheme from "./TilingScheme.js"; */

const GRID_TARGET_SEGMENTS_PER_CELL = 16;
const GRID_NEIGHBOR_PADDING_SCALE = 0.35;

// Grid cells expand by this UV epsilon when clipping polygon rings, so every
// fragment mapping to a cell lies strictly inside the cell's clipped loops.
const POLYGON_CELL_CLIP_EPSILON = 1.0e-5;

const scratchPolyline = new BufferPolyline();
const scratchPolylineMaterial = new BufferPolylineMaterial();
const scratchPolygon = new BufferPolygon();
const scratchPolygonMaterial = new BufferPolygonMaterial();
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
 * @property {boolean} show Whether this vector data should be rendered.
 * @property {Rectangle} rectangle The rectangle which this data was generated with respect to.
 *
 * Stage 1: Collect vector segments and polygon rings intersecting tile.
 * @property {number[][]} [segments]
 * @property {number[]} [segmentPrimitiveIndices] Index per segment, mapping to material for the segment.
 * @property {Float64Array[]} [polygonRings] Tile-clipped polygon rings as flat [x0, y0, x1, y1, ...] in tile UV space.
 * @property {number[]} [polygonRingPrimitiveIndices] Index per ring, mapping to material for the ring.
 * @property {Uint8Array[]} [widths] Primitive widths, by primitive index.
 * @property {Uint8Array[]} [colors] Primitive colors, by primitive index.
 * @property {number} [primitiveCount] Number of vector primitives in tile.
 *
 * Stage 2: Build CPU grid structures.
 * @property {Float32Array} [segmentTexels] Packed RGBA line segments (ax, ay, bx, by) in tile UV space, -1 filled.
 * @property {number} [segmentTextureWidth] Width of the segment texture, in texels.
 * @property {number} [segmentTextureHeight] Height of the segment texture, in texels.
 * @property {Float32Array} [segmentPrimitiveIndicesTexels] Index per segment, mapping to material for the segment.
 * @property {Uint32Array} [gridCellIndices] Grid header [gridWidth, gridHeight, ...per-cell end offsets].
 * @property {Float32Array} [polygonEdgeTexels] Packed RGBA polygon ring edges (ax, ay, bx, by), clipped per grid cell, -1 filled.
 * @property {number} [polygonEdgeTextureWidth] Width of the polygon edge texture, in texels.
 * @property {number} [polygonEdgeTextureHeight] Height of the polygon edge texture, in texels.
 * @property {Float32Array} [polygonEdgePrimitiveIndicesTexels] Index per polygon edge, mapping to material for the edge.
 * @property {Uint32Array} [polygonGridCellIndices] Polygon grid header [gridWidth, gridHeight, ...per-cell end offsets].
 *
 * Stage 3: Build GPU texture resources, uploaded lazily at draw time.
 * @property {Texture} [segmentTexture] GPU texture of segmentTexels.
 * @property {Texture} [segmentPrimitiveIndicesTexture] GPU texture of primitive indices per segment.
 * @property {Texture} [widthTexture] GPU texture of primitive widths, by primitive index.
 * @property {Texture} [colorTexture] GPU texture of primitive colors, by primitive index.
 * @property {Texture} [gridCellIndicesTexture] GPU texture of gridCellIndices.
 * @property {Texture} [polygonEdgeTexture] GPU texture of polygonEdgeTexels.
 * @property {Texture} [polygonEdgePrimitiveIndicesTexture] GPU texture of primitive indices per polygon edge.
 * @property {Texture} [polygonGridCellIndicesTexture] GPU texture of polygonGridCellIndices.
 *
 * @private
 */

/**
 * Snapshot of a vector collection — projected vertex positions and
 * per-primitive material properties — extracted in a single pass so the
 * collection can be marked clean immediately afterward.
 *
 * @typedef {object} VectorCollectionData
 *
 * @property {number} version State of `collection._version` at time data was last updated.
 * @property {Rectangle} rectangle The rectangle of the vector collection's bounding volume.
 * @property {Float64Array} positions Collection positions, projected to the ellipsoid as [lng, lat] in radians.
 * @property {Uint8Array} widths Primitive widths, by primitive index. Zero-filled for polygon collections.
 * @property {Uint8Array} colors Primitive colors, by primitive index.
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
   * @param {BufferPolylineCollection} collection
   * @param {Ellipsoid} ellipsoid
   * @param {VectorCollectionData} [result]
   * @returns {VectorCollectionData}
   */
  static packPolylineCollectionData(collection, ellipsoid, result) {
    if (
      defined(result) &&
      collection._dirtyCount === 0 &&
      collection._version === result.version
    ) {
      return result;
    }

    const primitiveCount = collection.primitiveCount;
    const boundingVolume = collection.boundingVolume;

    const rectangle = Rectangle.fromBoundingSphere(boundingVolume, ellipsoid);
    const positions = _getProjectedPositions(collection, ellipsoid);

    const widths = new Uint8Array(primitiveCount);
    const colors = new Uint8Array(primitiveCount * 4);

    for (let i = 0; i < primitiveCount; i++) {
      const polyline = /** @type {BufferPolyline} */ (
        collection.get(i, scratchPolyline)
      );

      // Append materials unconditionally, to simplify indexing and updates.
      const polylineMaterial = /** @type {BufferPolylineMaterial} */ (
        polyline.getMaterial(scratchPolylineMaterial)
      );

      widths[i] = polylineMaterial.width;

      colors[i * 4] = Color.floatToByte(polylineMaterial.color.red);
      colors[i * 4 + 1] = Color.floatToByte(polylineMaterial.color.green);
      colors[i * 4 + 2] = Color.floatToByte(polylineMaterial.color.blue);
      colors[i * 4 + 3] = Color.floatToByte(polylineMaterial.color.alpha);
    }

    return Object.assign(
      result ?? {},
      /** @type {VectorCollectionData} */ ({
        version: collection._version,
        rectangle: rectangle,
        positions: positions,
        widths: widths,
        colors: colors,
      }),
    );
  }

  /**
   * Projects all visible polylines in a collection into tile-local UV segments,
   * clipped to the tile, appending [ax, ay, bx, by] to the segments array.
   *
   * @param {BufferPolylineCollection} collection
   * @param {VectorCollectionData} collectionData
   * @param {Rectangle} rectangle
   * @param {VectorTileData} result
   */
  static packPolylineSegments(collection, collectionData, rectangle, result) {
    result.segments ??= [];
    result.widths ??= [];
    result.colors ??= [];
    result.segmentPrimitiveIndices ??= [];
    result.primitiveCount ??= 0;
    result.rectangle ??= Rectangle.clone(rectangle);

    const width = rectangle.width;
    const primitiveCount = collection.primitiveCount;
    const positions = collectionData.positions;

    for (let i = 0; i < primitiveCount; i++) {
      const polyline = /** @type {BufferPolyline} */ (
        collection.get(i, scratchPolyline)
      );
      if (!polyline.show) {
        continue;
      }

      const vertexCount = polyline.vertexCount;
      const vertexOffset = polyline.vertexOffset;

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

    // Append materials unconditionally, to simplify indexing and updates.
    result.widths.push(collectionData.widths);
    result.colors.push(collectionData.colors);

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
   * @param {BufferPolygonCollection} collection
   * @param {Ellipsoid} ellipsoid
   * @param {VectorCollectionData} [result]
   * @returns {VectorCollectionData}
   */
  static packPolygonCollectionData(collection, ellipsoid, result) {
    if (
      defined(result) &&
      collection._dirtyCount === 0 &&
      collection._version === result.version
    ) {
      return result;
    }

    const primitiveCount = collection.primitiveCount;
    const boundingVolume = collection.boundingVolume;

    const rectangle = Rectangle.fromBoundingSphere(boundingVolume, ellipsoid);
    const positions = _getProjectedPositions(collection, ellipsoid);

    // Widths are unused by polygon fills; zero-filled so polygons share the
    // primitive index space (and width/color textures) with polylines.
    const widths = new Uint8Array(primitiveCount);
    const colors = new Uint8Array(primitiveCount * 4);

    for (let i = 0; i < primitiveCount; i++) {
      const polygon = /** @type {BufferPolygon} */ (
        collection.get(i, scratchPolygon)
      );

      // Append materials unconditionally, to simplify indexing and updates.
      const polygonMaterial = /** @type {BufferPolygonMaterial} */ (
        polygon.getMaterial(scratchPolygonMaterial)
      );

      colors[i * 4] = Color.floatToByte(polygonMaterial.color.red);
      colors[i * 4 + 1] = Color.floatToByte(polygonMaterial.color.green);
      colors[i * 4 + 2] = Color.floatToByte(polygonMaterial.color.blue);
      colors[i * 4 + 3] = Color.floatToByte(polygonMaterial.color.alpha);
    }

    return Object.assign(
      result ?? {},
      /** @type {VectorCollectionData} */ ({
        version: collection._version,
        rectangle: rectangle,
        positions: positions,
        widths: widths,
        colors: colors,
      }),
    );
  }

  /**
   * Projects all visible polygon rings (outer rings and holes) in a collection
   * into tile-local UV space, clipped to the tile, appending each surviving
   * ring as a flat [x0, y0, x1, y1, ...] closed loop.
   *
   * @param {BufferPolygonCollection} collection
   * @param {VectorCollectionData} collectionData
   * @param {Rectangle} rectangle
   * @param {VectorTileData} result
   */
  static packPolygonRings(collection, collectionData, rectangle, result) {
    result.polygonRings ??= [];
    result.polygonRingPrimitiveIndices ??= [];
    result.widths ??= [];
    result.colors ??= [];
    result.primitiveCount ??= 0;
    result.rectangle ??= Rectangle.clone(rectangle);

    const width = rectangle.width;
    const primitiveCount = collection.primitiveCount;
    const positions = collectionData.positions;

    for (let i = 0; i < primitiveCount; i++) {
      const polygon = /** @type {BufferPolygon} */ (
        collection.get(i, scratchPolygon)
      );
      if (!polygon.show) {
        continue;
      }

      const vertexOffset = polygon.vertexOffset;
      const vertexCount = polygon.vertexCount;
      const holes = polygon.getHoles();

      // Ring r spans [ringStart, ringEnd): the outer ring, then each hole.
      // The shader's even-odd test makes hole rings cancel enclosing coverage.
      for (let r = 0; r <= holes.length; r++) {
        const ringStart = r === 0 ? 0 : holes[r - 1];
        const ringEnd = r === holes.length ? vertexCount : holes[r];
        const ringVertexCount = ringEnd - ringStart;
        if (ringVertexCount < 3) {
          continue;
        }

        const ringUv = _projectRingToTileUv(
          positions,
          vertexOffset + ringStart,
          ringVertexCount,
          rectangle,
          width,
        );

        // Clip to the tile plus the polyline clip margin. A ring enclosing
        // the whole tile clips to the tile rectangle itself, so tiles
        // interior to a large polygon remain covered.
        const clippedCount = _clipRingToRect(
          ringUv,
          ringVertexCount,
          -CesiumMath.EPSILON3,
          1.0 + CesiumMath.EPSILON3,
          -CesiumMath.EPSILON3,
          1.0 + CesiumMath.EPSILON3,
        );
        if (clippedCount < 3) {
          continue;
        }

        result.polygonRings.push(scratchClipB.slice(0, clippedCount * 2));
        result.polygonRingPrimitiveIndices.push(result.primitiveCount + i);
      }
    }

    // Append materials unconditionally, to simplify indexing and updates.
    result.widths.push(collectionData.widths);
    result.colors.push(collectionData.colors);

    result.primitiveCount += primitiveCount;
  }

  /**
   * Packs UV-space polygon rings into a grid-indexed edge lookup. Each ring
   * is clipped to every grid cell it overlaps — unlike polyline segments,
   * which are only assigned to cells — so a cell's edges form closed loops
   * and a fragment can evaluate even-odd coverage from its own cell alone.
   *
   * @param {VectorTileData} result
   */
  static packPolygonGrid(result) {
    const rings = result.polygonRings;
    const ringPrimitiveIndices = result.polygonRingPrimitiveIndices;

    let ringEdgeCount = 0;
    for (let i = 0; i < rings.length; i++) {
      ringEdgeCount += rings[i].length / 2;
    }

    const gridSize = Math.max(
      1,
      Math.ceil(Math.sqrt(ringEdgeCount / GRID_TARGET_SEGMENTS_PER_CELL)),
    );

    // Per-cell packed edges [ax, ay, bx, by, primitiveIndex, ...].
    /** @type {number[][]} */
    const grid = new Array(gridSize * gridSize);
    for (let i = 0; i < grid.length; i++) {
      grid[i] = [];
    }

    // Rings are appended in primitive order, so each cell's edge list stays
    // grouped by primitive; the shader resolves parity per group.
    let packedEdgeCount = 0;
    for (let r = 0; r < rings.length; r++) {
      const ring = rings[r];
      const primitiveIndex = ringPrimitiveIndices[r];
      const ringVertexCount = ring.length / 2;

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (let k = 0; k < ringVertexCount; k++) {
        minX = Math.min(minX, ring[k * 2]);
        maxX = Math.max(maxX, ring[k * 2]);
        minY = Math.min(minY, ring[k * 2 + 1]);
        maxY = Math.max(maxY, ring[k * 2 + 1]);
      }

      const startCellX = _clampCellIndex(Math.floor(minX * gridSize), gridSize);
      const endCellX = _clampCellIndex(Math.floor(maxX * gridSize), gridSize);
      const startCellY = _clampCellIndex(Math.floor(minY * gridSize), gridSize);
      const endCellY = _clampCellIndex(Math.floor(maxY * gridSize), gridSize);

      for (let y = startCellY; y <= endCellY; y++) {
        for (let x = startCellX; x <= endCellX; x++) {
          // Expand the clip rectangle slightly so fragments at shared cell
          // boundaries fall strictly inside the clipped loops.
          const clippedCount = _clipRingToRect(
            ring,
            ringVertexCount,
            x / gridSize - POLYGON_CELL_CLIP_EPSILON,
            (x + 1) / gridSize + POLYGON_CELL_CLIP_EPSILON,
            y / gridSize - POLYGON_CELL_CLIP_EPSILON,
            (y + 1) / gridSize + POLYGON_CELL_CLIP_EPSILON,
          );
          if (clippedCount < 3) {
            continue;
          }

          const cell = grid[y * gridSize + x];
          for (let k = 0; k < clippedCount; k++) {
            const k2 = (k + 1) % clippedCount;
            const ax = scratchClipB[k * 2];
            const ay = scratchClipB[k * 2 + 1];
            const bx = scratchClipB[k2 * 2];
            const by = scratchClipB[k2 * 2 + 1];
            // Horizontal edges never toggle parity against the shader's
            // horizontal ray; clipping produces many along cell bounds.
            if (ay === by) {
              continue;
            }
            cell.push(ax, ay, bx, by, primitiveIndex);
            packedEdgeCount++;
          }
        }
      }
    }

    const [textureWidth, textureHeight] = _nextPowerOfTwoSize(packedEdgeCount);
    const capacity = textureWidth * textureHeight;

    const edgeTexels = new Float32Array(capacity * 4).fill(-1.0);
    const edgePrimitiveIndicesTexels = new Float32Array(capacity).fill(-1.0);

    const gridCellIndices = new Uint32Array(grid.length + 2);
    gridCellIndices[0] = gridSize;
    gridCellIndices[1] = gridSize;

    let offset = 0;
    for (let i = 0; i < grid.length; i++) {
      const cellEdges = grid[i];
      for (let j = 0; j < cellEdges.length; j += 5) {
        edgeTexels[offset * 4] = cellEdges[j]; // R
        edgeTexels[offset * 4 + 1] = cellEdges[j + 1]; // G
        edgeTexels[offset * 4 + 2] = cellEdges[j + 2]; // B
        edgeTexels[offset * 4 + 3] = cellEdges[j + 3]; // A

        edgePrimitiveIndicesTexels[offset] = cellEdges[j + 4];

        offset++;
      }
      gridCellIndices[i + 2] = offset;
    }

    result.polygonEdgeTexels = edgeTexels;
    result.polygonEdgeTextureWidth = textureWidth;
    result.polygonEdgeTextureHeight = textureHeight;
    result.polygonEdgePrimitiveIndicesTexels = edgePrimitiveIndicesTexels;
    result.polygonGridCellIndices = gridCellIndices;
  }

  /**
   * Creates the width and color textures indexed by the primitive index space
   * shared between polylines and polygons.
   *
   * @param {Context} context
   * @param {VectorTileData} result
   */
  static packPrimitiveTextures(context, result) {
    const [primTextureWidth, primTextureHeight] = _nextPowerOfTwoSize(
      result.primitiveCount,
    );

    const widthTextureView = new Uint8Array(
      primTextureWidth * primTextureHeight,
    );
    widthTextureView.set(_concatByteArrays(result.widths));
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
    colorTextureView.set(_concatByteArrays(result.colors));
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

    result.gridCellIndicesTexture = _createGridCellIndicesTexture(
      context,
      result.gridCellIndices,
    );
  }

  /**
   * @param {Context} context
   * @param {VectorTileData} result
   */
  static packPolygonTextures(context, result) {
    result.polygonEdgeTexture = new Texture({
      context,
      pixelFormat: PixelFormat.RGBA,
      pixelDatatype: PixelDatatype.FLOAT,
      source: {
        width: result.polygonEdgeTextureWidth,
        height: result.polygonEdgeTextureHeight,
        arrayBufferView: result.polygonEdgeTexels,
      },
      sampler: Sampler.NEAREST,
      flipY: false,
    });

    result.polygonEdgePrimitiveIndicesTexture = new Texture({
      context,
      pixelFormat: PixelFormat.RED,
      pixelDatatype: PixelDatatype.FLOAT,
      source: {
        width: result.polygonEdgeTextureWidth,
        height: result.polygonEdgeTextureHeight,
        arrayBufferView: result.polygonEdgePrimitiveIndicesTexels,
      },
      sampler: Sampler.NEAREST,
      flipY: false,
    });

    result.polygonGridCellIndicesTexture = _createGridCellIndicesTexture(
      context,
      result.polygonGridCellIndices,
    );
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
    data.polygonEdgeTexture?.destroy();
    data.polygonEdgePrimitiveIndicesTexture?.destroy();
    data.polygonGridCellIndicesTexture?.destroy();
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

// Growable module scratch for ring projection and Sutherland-Hodgman clipping.
let scratchRingUv = new Float64Array(512);
let scratchClipA = new Float64Array(512);
let scratchClipB = new Float64Array(512);

/**
 * Projects a polygon ring ([lng, lat] radian pairs from `positions`) into the
 * tile's [0,1]^2 UV domain. Longitudes are sequentially unwrapped so an
 * antimeridian-crossing ring stays continuous, then the whole ring is shifted
 * to the 2π frame nearest the tile center (matching the polyline projection).
 * Returns a module scratch valid until the next call.
 *
 * Only supporting geographic tiling scheme (UV maps linearly to lon/lat)
 *
 * @param {Float64Array} positions Projected collection positions ([lng, lat] radians).
 * @param {number} vertexStart Index of the ring's first vertex.
 * @param {number} vertexCount Number of vertices in the ring.
 * @param {Rectangle} rectangle
 * @param {number} width
 * @returns {Float64Array} Flat [u0, v0, u1, v1, ...] ring coordinates.
 * @private
 */
function _projectRingToTileUv(
  positions,
  vertexStart,
  vertexCount,
  rectangle,
  width,
) {
  if (scratchRingUv.length < vertexCount * 2) {
    scratchRingUv = new Float64Array(vertexCount * 4);
  }
  const result = scratchRingUv;
  const height = rectangle.north - rectangle.south;

  let previousLon = positions[vertexStart * 2];
  result[0] = previousLon;
  result[1] = positions[vertexStart * 2 + 1];
  for (let i = 1; i < vertexCount; i++) {
    const lon =
      previousLon +
      CesiumMath.negativePiToPi(positions[(vertexStart + i) * 2] - previousLon);
    result[i * 2] = lon;
    result[i * 2 + 1] = positions[(vertexStart + i) * 2 + 1];
    previousLon = lon;
  }

  const center = rectangle.west + width * 0.5;
  const lon0 = result[0];
  const shift = center + CesiumMath.negativePiToPi(lon0 - center) - lon0;

  for (let i = 0; i < vertexCount; i++) {
    result[i * 2] = (result[i * 2] + shift - rectangle.west) / width;
    result[i * 2 + 1] = (result[i * 2 + 1] - rectangle.south) / height;
  }

  return result;
}

/**
 * Clips a closed ring to an axis-aligned rectangle with Sutherland-Hodgman.
 * Returns the clipped vertex count; the clipped ring is left in
 * `scratchClipB` (flat [x0, y0, ...]), valid until the next call. Returns 0
 * when the ring is entirely outside.
 *
 * @param {Float64Array} ring Flat [x0, y0, x1, y1, ...] ring coordinates.
 * @param {number} vertexCount
 * @param {number} minX
 * @param {number} maxX
 * @param {number} minY
 * @param {number} maxY
 * @returns {number}
 * @private
 */
function _clipRingToRect(ring, vertexCount, minX, maxX, minY, maxY) {
  let input = ring;
  let inputCount = vertexCount;

  // axis (0 = x, 1 = y), keep side (1 = keep >= limit, -1 = keep <= limit).
  for (let plane = 0; plane < 4; plane++) {
    const axis = plane >> 1;
    const sign = (plane & 1) === 0 ? 1.0 : -1.0;
    const limit =
      plane === 0 ? minX : plane === 1 ? maxX : plane === 2 ? minY : maxY;

    // Each input vertex emits at most 2 output vertices.
    const requiredLength = inputCount * 4 + 4;
    let output = (plane & 1) === 0 ? scratchClipA : scratchClipB;
    if (output.length < requiredLength) {
      output = new Float64Array(requiredLength * 2);
      if ((plane & 1) === 0) {
        scratchClipA = output;
      } else {
        scratchClipB = output;
      }
    }

    let outputCount = 0;
    let prevX = input[(inputCount - 1) * 2];
    let prevY = input[(inputCount - 1) * 2 + 1];
    let prevInside = sign * ((axis === 0 ? prevX : prevY) - limit) >= 0.0;

    for (let i = 0; i < inputCount; i++) {
      const x = input[i * 2];
      const y = input[i * 2 + 1];
      const inside = sign * ((axis === 0 ? x : y) - limit) >= 0.0;

      if (inside !== prevInside) {
        // Pin the clipped coordinate exactly to the plane so boundary edges
        // stay axis-aligned.
        const t =
          axis === 0
            ? (limit - prevX) / (x - prevX)
            : (limit - prevY) / (y - prevY);
        output[outputCount * 2] = axis === 0 ? limit : prevX + t * (x - prevX);
        output[outputCount * 2 + 1] =
          axis === 0 ? prevY + t * (y - prevY) : limit;
        outputCount++;
      }
      if (inside) {
        output[outputCount * 2] = x;
        output[outputCount * 2 + 1] = y;
        outputCount++;
      }

      prevX = x;
      prevY = y;
      prevInside = inside;
    }

    if (outputCount === 0) {
      return 0;
    }

    input = output;
    inputCount = outputCount;
  }

  // Four passes always end in scratchClipB (ring → A → B → A → B).
  return inputCount;
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

/**
 * Creates a grid header texture, wrapped to a 2D power-of-two size so the
 * header length is not limited by the maximum texture width.
 *
 * @param {Context} context
 * @param {Uint32Array} gridCellIndices
 * @returns {Texture}
 * @private
 */
function _createGridCellIndicesTexture(context, gridCellIndices) {
  const [width, height] = _nextPowerOfTwoSize(gridCellIndices.length);
  const texels = new Float32Array(width * height);
  texels.set(gridCellIndices);
  return new Texture({
    context: context,
    pixelFormat: PixelFormat.RED,
    pixelDatatype: PixelDatatype.FLOAT,
    source: {
      width: width,
      height: height,
      arrayBufferView: texels,
    },
    sampler: Sampler.NEAREST,
    flipY: false,
  });
}

/**
 * Returns the collection's vertex positions, projected to [lng, lat]
 * coordinates, in radians, on the given ellipsoid.
 *
 * @param {BufferPrimitiveCollection<BufferPrimitive>} collection
 * @param {Ellipsoid} ellipsoid
 * @param {Float64Array} [result]
 * @ignore
 */
function _getProjectedPositions(collection, ellipsoid, result) {
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
 * Concatenates N byte arrays.
 * @param {Uint8Array[]} arrays
 * @returns {Uint8Array}
 * @ignore
 */
function _concatByteArrays(arrays) {
  let totalByteLength = 0;
  for (const array of arrays) {
    totalByteLength += array.byteLength;
  }

  const result = new Uint8Array(totalByteLength);
  let byteOffset = 0;

  for (const array of arrays) {
    result.set(array, byteOffset);
    byteOffset += array.byteLength;
  }

  return result;
}

export default VectorPipeline;
