// @ts-check

import BlendingState from "./BlendingState.js";
import Buffer from "../Renderer/Buffer.js";
import BufferCollectionGpuLookupVS from "../Shaders/BufferCollectionGpuLookupVS.js";
import BufferPolyline from "./BufferPolyline.js";
import BufferPolylineCollectionGpuLookupFS from "../Shaders/BufferPolylineCollectionGpuLookupFS.js";
import BufferPolylineMaterial from "./BufferPolylineMaterial.js";
import BufferUsage from "../Renderer/BufferUsage.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartographic from "../Core/Cartographic.js";
import CesiumMath from "../Core/Math.js";
import Color from "../Core/Color.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import DrawCommand from "../Renderer/DrawCommand.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import EncodedCartesian3 from "../Core/EncodedCartesian3.js";
import IndexDatatype from "../Core/IndexDatatype.js";
import Matrix4 from "../Core/Matrix4.js";
import Pass from "../Renderer/Pass.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import PixelFormat from "../Core/PixelFormat.js";
import PrimitiveType from "../Core/PrimitiveType.js";
import Rectangle from "../Core/Rectangle.js";
import RenderState from "../Renderer/RenderState.js";
import Sampler from "../Renderer/Sampler.js";
import ShaderProgram from "../Renderer/ShaderProgram.js";
import ShaderSource from "../Renderer/ShaderSource.js";
import Texture from "../Renderer/Texture.js";
import TextureMagnificationFilter from "../Renderer/TextureMagnificationFilter.js";
import TextureMinificationFilter from "../Renderer/TextureMinificationFilter.js";
import TextureWrap from "../Renderer/TextureWrap.js";
import VertexArray from "../Renderer/VertexArray.js";
import defined from "../Core/defined.js";

/** @import FrameState from "./FrameState.js"; */
/** @import BufferPolylineCollection from "./BufferPolylineCollection.js"; */

// This renderer draws the tile surface patch and lets the fragment shader
// resolve line coverage from the packed segment lookup textures.

const attributeLocations = {
  positionHigh: 0,
  positionLow: 1,
  texCoord: 2,
};

const polylineScratch = new BufferPolyline();
const materialScratch = new BufferPolylineMaterial();
const colorScratch = new Color();
const encodedScratch = new EncodedCartesian3();
const cartesianScratch = new Cartesian3();
const defaultQuadTexCoords = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]);

/**
 * @param {BufferPolylineCollection} collection
 * @param {BufferPolyline} result
 * @returns {BufferPolyline|undefined}
 */
function getFirstVisiblePolyline(collection, result) {
  for (let i = 0; i < collection.primitiveCount; i++) {
    collection.get(i, result);
    if (result.show) {
      return result;
    }
  }
  return undefined;
}

/**
 * @param {*} context
 * @param {*} lookup
 * @returns {*}
 */
function createLookupTextures(context, lookup) {
  const sampler = new Sampler({
    wrapS: TextureWrap.CLAMP_TO_EDGE,
    wrapT: TextureWrap.CLAMP_TO_EDGE,
    minificationFilter: TextureMinificationFilter.NEAREST,
    magnificationFilter: TextureMagnificationFilter.NEAREST,
  });

  return {
    // @ts-expect-error Private in TS declarations, used internally by renderer code.
    segmentTexture: Texture.create({
      context: context,
      pixelFormat: PixelFormat.RGBA,
      pixelDatatype: PixelDatatype.FLOAT,
      source: {
        width: lookup.segmentTextureWidth,
        height: lookup.segmentTextureHeight,
        arrayBufferView: lookup.segmentTexels,
      },
      sampler: sampler,
      flipY: false,
    }),
    // @ts-expect-error Private in TS declarations, used internally by renderer code.
    gridCellIndicesTexture: Texture.create({
      context: context,
      pixelFormat: PixelFormat.RED,
      pixelDatatype: PixelDatatype.FLOAT,
      source: {
        width: lookup.gridCellIndices.length,
        height: 1,
        arrayBufferView: new Float32Array(lookup.gridCellIndices),
      },
      sampler: sampler,
      flipY: false,
    }),
  };
}

/**
 * @param {*} context
 * @param {*} lookup
 * @returns {VertexArray}
 */
function createVertexArray(context, lookup) {
  const positions = defined(lookup.positions)
    ? lookup.positions
    : lookup.quadPositions;
  const texCoords = defined(lookup.texCoords)
    ? lookup.texCoords
    : defaultQuadTexCoords;
  const indices = defined(lookup.indices)
    ? lookup.indices
    : new Uint16Array([0, 1, 2, 0, 2, 3]);
  const vertexCount = positions.length / 3;
  const positionsHigh = new Float32Array(vertexCount * 3);
  const positionsLow = new Float32Array(vertexCount * 3);

  for (let i = 0; i < vertexCount; i++) {
    EncodedCartesian3.fromCartesian(
      Cartesian3.fromArray(positions, i * 3, cartesianScratch),
      encodedScratch,
    );

    positionsHigh[i * 3] = encodedScratch.high.x;
    positionsHigh[i * 3 + 1] = encodedScratch.high.y;
    positionsHigh[i * 3 + 2] = encodedScratch.high.z;

    positionsLow[i * 3] = encodedScratch.low.x;
    positionsLow[i * 3 + 1] = encodedScratch.low.y;
    positionsLow[i * 3 + 2] = encodedScratch.low.z;
  }

  return new VertexArray({
    context: context,
    indexBuffer: Buffer.createIndexBuffer({
      context: context,
      typedArray: indices,
      // @ts-expect-error Requires https://github.com/CesiumGS/cesium/pull/13203.
      usage: BufferUsage.STATIC_DRAW,
      // @ts-expect-error Requires https://github.com/CesiumGS/cesium/pull/13203.
      indexDatatype: IndexDatatype.fromTypedArray(indices),
    }),
    attributes: [
      {
        index: attributeLocations.positionHigh,
        componentDatatype: ComponentDatatype.FLOAT,
        componentsPerAttribute: 3,
        vertexBuffer: Buffer.createVertexBuffer({
          context: context,
          typedArray: positionsHigh,
          // @ts-expect-error Requires https://github.com/CesiumGS/cesium/pull/13203.
          usage: BufferUsage.STATIC_DRAW,
        }),
      },
      {
        index: attributeLocations.positionLow,
        componentDatatype: ComponentDatatype.FLOAT,
        componentsPerAttribute: 3,
        vertexBuffer: Buffer.createVertexBuffer({
          context: context,
          typedArray: positionsLow,
          // @ts-expect-error Requires https://github.com/CesiumGS/cesium/pull/13203.
          usage: BufferUsage.STATIC_DRAW,
        }),
      },
      {
        index: attributeLocations.texCoord,
        componentDatatype: ComponentDatatype.FLOAT,
        componentsPerAttribute: 2,
        vertexBuffer: Buffer.createVertexBuffer({
          context: context,
          typedArray: texCoords,
          // @ts-expect-error Requires https://github.com/CesiumGS/cesium/pull/13203.
          usage: BufferUsage.STATIC_DRAW,
        }),
      },
    ],
  });
}

/**
 * @param {BufferPolylineCollection} collection
 * @param {FrameState} frameState
 * @param {*} [renderContext]
 * @returns {*}
 */
export default function renderBufferPolylineCollectionGpuLookup(
  collection,
  frameState,
  renderContext,
) {
  const context = frameState.context;
  if (!defined(renderContext)) {
    renderContext = { destroy: () => {} };
  }

  if (!defined(renderContext.vertexArray)) {
    const lookup = buildVectorTileGpuLookup(collection);
    renderContext.lookup = lookup;
    const textures = createLookupTextures(context, lookup);
    renderContext.segmentTexture = textures.segmentTexture;
    renderContext.gridCellIndicesTexture = textures.gridCellIndicesTexture;
    renderContext.vertexArray = createVertexArray(context, lookup);
  }

  if (!defined(renderContext.renderState)) {
    renderContext.renderState = RenderState.fromCache({
      blending: BlendingState.DISABLED,
      depthTest: { enabled: true },
    });
  }

  if (!defined(renderContext.shaderProgram)) {
    renderContext.shaderProgram = ShaderProgram.fromCache({
      context: context,
      vertexShaderSource: new ShaderSource({
        sources: [BufferCollectionGpuLookupVS],
      }),
      fragmentShaderSource: new ShaderSource({
        sources: [BufferPolylineCollectionGpuLookupFS],
      }),
      attributeLocations: attributeLocations,
    });
  }

  if (!defined(renderContext.command)) {
    const lookup = renderContext.lookup;
    renderContext.command = new DrawCommand({
      vertexArray: renderContext.vertexArray,
      renderState: renderContext.renderState,
      shaderProgram: renderContext.shaderProgram,
      primitiveType: PrimitiveType.TRIANGLES,
      pass: Pass.OPAQUE,
      owner: collection,
      count: lookup.indices.length,
      modelMatrix: lookup.modelMatrix,
      boundingVolume: lookup.boundingVolume,
      debugShowBoundingVolume: collection.debugShowBoundingVolume,
      uniformMap: {
        u_segmentTexture: function () {
          return renderContext.segmentTexture;
        },
        u_gridCellIndicesTexture: function () {
          return renderContext.gridCellIndicesTexture;
        },
        u_color: function () {
          if (!defined(getFirstVisiblePolyline(collection, polylineScratch))) {
            return Color.WHITE;
          }
          polylineScratch.getMaterial(materialScratch);
          return Color.clone(materialScratch.color, colorScratch);
        },
        u_lineWidth: function () {
          if (!defined(getFirstVisiblePolyline(collection, polylineScratch))) {
            return 1.0;
          }
          polylineScratch.getMaterial(materialScratch);
          return materialScratch.width;
        },
      },
    });
  }

  frameState.commandList.push(renderContext.command);
  collection._dirtyCount = 0;
  collection._dirtyOffset = 0;
  return renderContext;
}

///////////////////////////////////////////////////////////////////////////////
// BUILD GPU LOOKUP PATCH

// Builds a tile-shared lookup for clamped vector polylines. The output is:
// 1) a carrier surface patch over the tile region and 2) grid-indexed segment
// textures in tile-local UV space.
const GRID_TARGET_SEGMENTS_PER_CELL = 16;
const GRID_NEIGHBOR_PADDING_SCALE = 0.35;
const MAX_PATCH_LON_SEGMENTS = 180;
const MAX_PATCH_LAT_SEGMENTS = 90;
const PATCH_SEGMENT_ANGLE_DEGREES = 2.0;

const scratchLocalPosition = new Cartesian3();
const scratchWorldPosition = new Cartesian3();
const scratchCartographic = new Cartographic();

/**
 * @param {BufferPolylineCollection} collection
 */
function buildVectorTileGpuLookup(collection) {
  const rectangle = computeRectangle(collection);
  const width = Rectangle.computeWidth(rectangle);
  const patchHeight = 0;
  const patch = buildSurfacePatch(rectangle, patchHeight);
  const segments = appendPolylineSegments(collection, rectangle, width);
  const packed = packGridSegments(segments);

  return { ...patch, ...packed };
}

/**
 * @param {BufferPolylineCollection} collection
 * @returns {Rectangle}
 */
function computeRectangle(collection) {
  // TODO(donmccurdy): Unpacking to cartesian array is too expensive for
  // production. If we need the rectangle, compute on typed array.
  const array = [];
  for (let i = 0, il = collection.primitiveCount; i < il; i++) {
    collection.get(i, polylineScratch);
    const positions = polylineScratch.getPositions();
    for (let j = 0; j < positions.length; j += 3) {
      // @ts-expect-error TODO(tsd-jsdoc): See https://github.com/CesiumGS/cesium/pull/13302.
      const point = Cartesian3.fromArray(positions, j, new Cartesian3());
      array.push(point);
    }
  }
  return Rectangle.fromCartesianArray(array);
}

/**
 * @param {number} longitude
 * @param {*} rectangle
 * @param {number} width
 * @returns {number}
 */
function normalizeLongitude(longitude, rectangle, width) {
  let wrappedLongitude = longitude;
  const minLongitude = rectangle.west;
  const maxLongitude = minLongitude + width;

  while (wrappedLongitude < minLongitude) {
    wrappedLongitude += CesiumMath.TWO_PI;
  }

  while (wrappedLongitude > maxLongitude) {
    wrappedLongitude -= CesiumMath.TWO_PI;
  }

  return CesiumMath.clamp(wrappedLongitude, minLongitude, maxLongitude);
}

/**
 * @param {*} position
 * @param {*} rectangle
 * @param {number} width
 * @param {number[]} result
 * @returns {boolean}
 */
function projectWorldPositionToUv(position, rectangle, width, result) {
  const cartographic = Ellipsoid.WGS84.cartesianToCartographic(
    position,
    scratchCartographic,
  );
  if (!defined(cartographic)) {
    return false;
  }

  const longitude = normalizeLongitude(
    cartographic.longitude,
    rectangle,
    width,
  );
  result[0] = CesiumMath.clamp((longitude - rectangle.west) / width, 0.0, 1.0);
  result[1] = CesiumMath.clamp(
    (cartographic.latitude - rectangle.south) /
      (rectangle.north - rectangle.south),
    0.0,
    1.0,
  );
  return true;
}

/**
 * @param {*} positions
 * @param {number} offset
 * @param {*} modelMatrix
 * @param {*} rectangle
 * @param {number} width
 * @param {number[]} result
 * @returns {boolean}
 */
function projectLocalPositionToUv(
  positions,
  offset,
  modelMatrix,
  rectangle,
  width,
  result,
) {
  Cartesian3.fromArray(positions, offset, scratchLocalPosition);
  Matrix4.multiplyByPoint(
    modelMatrix,
    scratchLocalPosition,
    scratchWorldPosition,
  );
  return projectWorldPositionToUv(
    scratchWorldPosition,
    rectangle,
    width,
    result,
  );
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
 * @param {number[][]} segments
 * @param {number} [fixedGridSize]
 * @returns {*}
 */
function packGridSegments(segments, fixedGridSize) {
  if (segments.length === 0) {
    return undefined;
  }

  const gridSize = defined(fixedGridSize)
    ? fixedGridSize
    : Math.max(
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
      segmentTexels[offset * 4] = segment[0];
      segmentTexels[offset * 4 + 1] = segment[1];
      segmentTexels[offset * 4 + 2] = segment[2];
      segmentTexels[offset * 4 + 3] = segment[3];
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

/**
 * @param {*} collection
 * @param {*} rectangle
 * @param {number} width
 * @returns {number[][]}
 */
function appendPolylineSegments(collection, rectangle, width) {
  /** @type {number[][]} */
  const segments = [];

  const a = [0.0, 0.0];
  const b = [0.0, 0.0];

  for (let i = 0; i < collection.primitiveCount; i++) {
    collection.get(i, polylineScratch);
    if (!polylineScratch.show) {
      continue;
    }

    const positions = polylineScratch.getPositions();
    for (let j = 0; j + 1 < polylineScratch.vertexCount; j++) {
      const hasA = projectLocalPositionToUv(
        positions,
        j * 3,
        collection.modelMatrix,
        rectangle,
        width,
        a,
      );
      const hasB = projectLocalPositionToUv(
        positions,
        (j + 1) * 3,
        collection.modelMatrix,
        rectangle,
        width,
        b,
      );

      if (hasA && hasB) {
        segments.push([a[0], a[1], b[0], b[1]]);
      }
    }
  }

  return segments;
}

/**
 * @param {*} rectangle
 * @param {number} height
 * @returns {{positions: Float64Array, texCoords: Float32Array, indices: *}}
 */
function buildSurfacePatch(rectangle, height) {
  const width = Rectangle.computeWidth(rectangle);
  const widthDegrees = CesiumMath.toDegrees(width);
  const heightDegrees = CesiumMath.toDegrees(rectangle.north - rectangle.south);

  const lonSegments = Math.max(
    1,
    Math.min(
      MAX_PATCH_LON_SEGMENTS,
      Math.ceil(widthDegrees / PATCH_SEGMENT_ANGLE_DEGREES),
    ),
  );
  const latSegments = Math.max(
    1,
    Math.min(
      MAX_PATCH_LAT_SEGMENTS,
      Math.ceil(heightDegrees / PATCH_SEGMENT_ANGLE_DEGREES),
    ),
  );

  const vertexCount = (lonSegments + 1) * (latSegments + 1);
  const positions = new Float64Array(vertexCount * 3);
  const texCoords = new Float32Array(vertexCount * 2);
  // @ts-expect-error Requires https://github.com/CesiumGS/cesium/pull/13203.
  const indices = IndexDatatype.createTypedArray(
    vertexCount,
    lonSegments * latSegments * 6,
  );

  let vertexIndex = 0;
  for (let y = 0; y <= latSegments; y++) {
    const v = y / latSegments;
    const latitude = CesiumMath.lerp(rectangle.south, rectangle.north, v);

    for (let x = 0; x <= lonSegments; x++) {
      const u = x / lonSegments;
      const longitude = CesiumMath.negativePiToPi(rectangle.west + u * width);
      const position = Ellipsoid.WGS84.cartographicToCartesian(
        Cartographic.fromRadians(
          longitude,
          latitude,
          height,
          scratchCartographic,
        ),
        scratchWorldPosition,
      );

      positions[vertexIndex * 3] = position.x;
      positions[vertexIndex * 3 + 1] = position.y;
      positions[vertexIndex * 3 + 2] = position.z;

      texCoords[vertexIndex * 2] = u;
      texCoords[vertexIndex * 2 + 1] = v;
      vertexIndex++;
    }
  }

  let indexOffset = 0;
  for (let y = 0; y < latSegments; y++) {
    for (let x = 0; x < lonSegments; x++) {
      const topLeft = y * (lonSegments + 1) + x;
      const topRight = topLeft + 1;
      const bottomLeft = topLeft + lonSegments + 1;
      const bottomRight = bottomLeft + 1;

      indices[indexOffset++] = topLeft;
      indices[indexOffset++] = bottomLeft;
      indices[indexOffset++] = bottomRight;
      indices[indexOffset++] = topLeft;
      indices[indexOffset++] = bottomRight;
      indices[indexOffset++] = topRight;
    }
  }

  return {
    positions: positions,
    texCoords: texCoords,
    indices: indices,
  };
}
