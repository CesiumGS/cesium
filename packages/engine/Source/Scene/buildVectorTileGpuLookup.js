// @ts-check

import Cartesian3 from "../Core/Cartesian3.js";
import Cartographic from "../Core/Cartographic.js";
import CesiumMath from "../Core/Math.js";
import defined from "../Core/defined.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import IndexDatatype from "../Core/IndexDatatype.js";
import Matrix4 from "../Core/Matrix4.js";
import BufferPolyline from "./BufferPolyline.js";

const GRID_TARGET_SEGMENTS_PER_CELL = 16;
const GRID_NEIGHBOR_PADDING_SCALE = 0.35;
const MAX_PATCH_LON_SEGMENTS = 180;
const MAX_PATCH_LAT_SEGMENTS = 90;
const PATCH_SEGMENT_ANGLE_DEGREES = 2.0;

const scratchMatrix = new Matrix4();
const scratchLocalPosition = new Cartesian3();
const scratchWorldPosition = new Cartesian3();
const scratchCartographic = new Cartographic();
const polylineScratch = new BufferPolyline();

/**
 * @param {*} tile
 * @returns {*}
 */
function getTileBoundingRegion(tile) {
  const candidates = [tile.contentBoundingVolume, tile.boundingVolume];
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    if (
      defined(candidate) &&
      defined(candidate.rectangle) &&
      defined(candidate.minimumHeight) &&
      defined(candidate.maximumHeight)
    ) {
      return candidate;
    }
  }

  return undefined;
}

/**
 * @param {*} rectangle
 * @returns {number}
 */
function computeRectangleWidth(rectangle) {
  let width = rectangle.east - rectangle.west;
  if (width < 0.0) {
    width += CesiumMath.TWO_PI;
  }
  return width;
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
 * @param {number} value
 * @returns {number}
 */
function nextPowerOfTwo(value) {
  let result = 1;
  while (result < value) {
    result <<= 1;
  }
  return result;
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

  const textureWidth = nextPowerOfTwo(
    Math.max(1, Math.ceil(Math.sqrt(packedSegmentCount))),
  );
  const textureHeight = nextPowerOfTwo(
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
 * @param {*} modelMatrix
 * @param {*} rectangle
 * @param {number} width
 * @param {number[][]} segments
 */
function appendPolylineSegments(
  collection,
  modelMatrix,
  rectangle,
  width,
  segments,
) {
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
        modelMatrix,
        rectangle,
        width,
        a,
      );
      const hasB = projectLocalPositionToUv(
        positions,
        (j + 1) * 3,
        modelMatrix,
        rectangle,
        width,
        b,
      );

      if (hasA && hasB) {
        segments.push([a[0], a[1], b[0], b[1]]);
      }
    }
  }
}

/**
 * @param {*} region
 * @returns {number}
 */
function choosePatchHeight(region) {
  return CesiumMath.clamp(0.0, region.minimumHeight, region.maximumHeight);
}

/**
 * @param {*} rectangle
 * @param {number} height
 * @returns {{positions: Float64Array, texCoords: Float32Array, indices: *}}
 */
function buildSurfacePatch(rectangle, height) {
  const width = computeRectangleWidth(rectangle);
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

/**
 * @param {*} tile
 * @param {Array<*>|undefined} collections
 * @param {*} vectorModelMatrix
 * @returns {*}
 */
function buildLookup(tile, collections, vectorModelMatrix) {
  if (!defined(collections) || collections.length === 0) {
    return undefined;
  }

  const region = getTileBoundingRegion(tile);
  if (!defined(region)) {
    return undefined;
  }

  const rectangle = region.rectangle;
  const width = computeRectangleWidth(rectangle);
  const patch = buildSurfacePatch(rectangle, choosePatchHeight(region));

  /** @type {number[][]} */
  const segments = [];
  for (let i = 0; i < collections.length; i++) {
    const collection = collections[i];
    const modelMatrix = Matrix4.multiplyTransformation(
      vectorModelMatrix,
      collection._vectorLocalModelMatrix,
      scratchMatrix,
    );
    appendPolylineSegments(collection, modelMatrix, rectangle, width, segments);
  }

  const packed = packGridSegments(segments);
  if (!defined(packed)) {
    return undefined;
  }
  return {
    kind: "polylines",
    ownerCollection: collections[0],
    positions: patch.positions,
    texCoords: patch.texCoords,
    indices: patch.indices,
    modelMatrix: Matrix4.clone(Matrix4.IDENTITY),
    boundingVolume: region.boundingSphere,
    ...packed,
  };
}

/**
 * @param {*} tile
 * @param {Array<*>|undefined} collections
 * @param {*} vectorModelMatrix
 * @returns {*}
 */
export function buildTileSurfacePolylineGpuLookup(
  tile,
  collections,
  vectorModelMatrix,
) {
  return buildLookup(tile, collections, vectorModelMatrix);
}

export default {
  buildTileSurfacePolylineGpuLookup: buildTileSurfacePolylineGpuLookup,
};
