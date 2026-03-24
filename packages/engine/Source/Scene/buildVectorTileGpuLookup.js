// @ts-check

import Cartesian3 from "../Core/Cartesian3.js";
import Cartographic from "../Core/Cartographic.js";
import CesiumMath from "../Core/Math.js";
import defined from "../Core/defined.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import IndexDatatype from "../Core/IndexDatatype.js";
import Matrix4 from "../Core/Matrix4.js";
import BufferPolygon from "./BufferPolygon.js";
import BufferPolyline from "./BufferPolyline.js";

const GRID_TARGET_SEGMENTS_PER_CELL = 64;
const MAX_PATCH_LON_SEGMENTS = 180;
const MAX_PATCH_LAT_SEGMENTS = 90;
const PATCH_SEGMENT_ANGLE_DEGREES = 2.0;
const POLYGON_MASK_MAX_DIMENSION = 8192;

const scratchMatrix = new Matrix4();
const scratchLocalPosition = new Cartesian3();
const scratchWorldPosition = new Cartesian3();
const scratchCartographic = new Cartographic();
const polylineScratch = new BufferPolyline();
const polygonScratch = new BufferPolygon();

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
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const minX = Math.max(0.0, Math.min(segment[0], segment[2]));
    const maxX = Math.min(1.0, Math.max(segment[0], segment[2]));
    const minY = Math.max(0.0, Math.min(segment[1], segment[3]));
    const maxY = Math.min(1.0, Math.max(segment[1], segment[3]));

    const startCellX = Math.min(gridSize - 1, Math.floor(minX * gridSize));
    const endCellX = Math.min(gridSize - 1, Math.floor(maxX * gridSize));
    const startCellY = Math.min(gridSize - 1, Math.floor(minY * gridSize));
    const endCellY = Math.min(gridSize - 1, Math.floor(maxY * gridSize));

    for (let y = startCellY; y <= endCellY; y++) {
      for (let x = startCellX; x <= endCellX; x++) {
        grid[y * gridSize + x].push(segment);
        packedSegmentCount++;
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
 * @param {*} rectangle
 * @returns {{width: number, height: number}}
 */
function choosePolygonMaskSize(rectangle) {
  const widthDegrees = Math.max(
    CesiumMath.toDegrees(computeRectangleWidth(rectangle)),
    1.0e-6,
  );
  const heightDegrees = Math.max(
    CesiumMath.toDegrees(rectangle.north - rectangle.south),
    1.0e-6,
  );
  const aspect = widthDegrees / heightDegrees;
  const maxDimension = POLYGON_MASK_MAX_DIMENSION;

  if (aspect >= 1.0) {
    return {
      width: maxDimension,
      height: Math.max(1, Math.round(maxDimension / aspect)),
    };
  }

  return {
    width: Math.max(1, Math.round(maxDimension * aspect)),
    height: maxDimension,
  };
}

/**
 * @param {number} ax
 * @param {number} ay
 * @param {number} bx
 * @param {number} by
 * @param {number} px
 * @param {number} py
 * @returns {number}
 */
function edgeFunction(ax, ay, bx, by, px, py) {
  return (px - ax) * (by - ay) - (py - ay) * (bx - ax);
}

/**
 * @param {Uint8Array} maskTexels
 * @param {number} maskWidth
 * @param {number} maskHeight
 * @param {number} ax
 * @param {number} ay
 * @param {number} bx
 * @param {number} by
 * @param {number} cx
 * @param {number} cy
 */
function rasterizeTriangle(
  maskTexels,
  maskWidth,
  maskHeight,
  ax,
  ay,
  bx,
  by,
  cx,
  cy,
) {
  const minX = Math.max(
    0,
    Math.min(maskWidth - 1, Math.floor(Math.min(ax, bx, cx) * maskWidth)),
  );
  const maxX = Math.max(
    0,
    Math.min(maskWidth - 1, Math.ceil(Math.max(ax, bx, cx) * maskWidth)),
  );
  const minY = Math.max(
    0,
    Math.min(maskHeight - 1, Math.floor(Math.min(ay, by, cy) * maskHeight)),
  );
  const maxY = Math.max(
    0,
    Math.min(maskHeight - 1, Math.ceil(Math.max(ay, by, cy) * maskHeight)),
  );

  const area = edgeFunction(ax, ay, bx, by, cx, cy);
  if (Math.abs(area) < 1.0e-10) {
    return;
  }

  for (let y = minY; y <= maxY; y++) {
    const py = (y + 0.5) / maskHeight;
    for (let x = minX; x <= maxX; x++) {
      const px = (x + 0.5) / maskWidth;
      const w0 = edgeFunction(bx, by, cx, cy, px, py);
      const w1 = edgeFunction(cx, cy, ax, ay, px, py);
      const w2 = edgeFunction(ax, ay, bx, by, px, py);
      const inside =
        (w0 >= 0.0 && w1 >= 0.0 && w2 >= 0.0) ||
        (w0 <= 0.0 && w1 <= 0.0 && w2 <= 0.0);
      if (inside) {
        maskTexels[y * maskWidth + x] = 255;
      }
    }
  }
}

/**
 * @param {Array<*>} collections
 * @param {*} vectorModelMatrix
 * @param {*} rectangle
 * @param {number} width
 * @returns {*}
 */
function buildPolygonMask(collections, vectorModelMatrix, rectangle, width) {
  const maskSize = choosePolygonMaskSize(rectangle);
  const maskTexels = new Uint8Array(maskSize.width * maskSize.height);
  let triangleCount = 0;

  for (let i = 0; i < collections.length; i++) {
    const collection = collections[i];
    const modelMatrix = Matrix4.multiplyTransformation(
      vectorModelMatrix,
      collection._vectorLocalModelMatrix,
      scratchMatrix,
    );

    for (let j = 0; j < collection.primitiveCount; j++) {
      collection.get(j, polygonScratch);
      if (!polygonScratch.show) {
        continue;
      }

      const positions = polygonScratch.getPositions();
      const vertexCount = polygonScratch.vertexCount;
      const projected = new Float32Array(vertexCount * 2);
      let validVertexCount = 0;
      const uv = [0.0, 0.0];
      for (let k = 0; k < vertexCount; k++) {
        if (
          projectLocalPositionToUv(
            positions,
            k * 3,
            modelMatrix,
            rectangle,
            width,
            uv,
          )
        ) {
          projected[k * 2] = uv[0];
          projected[k * 2 + 1] = uv[1];
          validVertexCount++;
        }
      }

      if (validVertexCount !== vertexCount) {
        continue;
      }
      const triangles = polygonScratch.getTriangles();
      for (let k = 0; k < triangles.length; k += 3) {
        const ia = triangles[k];
        const ib = triangles[k + 1];
        const ic = triangles[k + 2];
        rasterizeTriangle(
          maskTexels,
          maskSize.width,
          maskSize.height,
          projected[ia * 2],
          projected[ia * 2 + 1],
          projected[ib * 2],
          projected[ib * 2 + 1],
          projected[ic * 2],
          projected[ic * 2 + 1],
        );
        triangleCount++;
      }
    }
  }

  if (triangleCount === 0) {
    return undefined;
  }

  return {
    maskTexels: maskTexels,
    maskTextureWidth: maskSize.width,
    maskTextureHeight: maskSize.height,
    triangleCount: triangleCount,
  };
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
 * @param {"polylines"|"polygons"} kind
 * @returns {*}
 */
function buildLookup(tile, collections, vectorModelMatrix, kind) {
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
  if (kind === "polygons") {
    const mask = buildPolygonMask(
      collections,
      vectorModelMatrix,
      rectangle,
      width,
    );
    if (!defined(mask)) {
      return undefined;
    }
    return {
      kind: kind,
      ownerCollection: collections[0],
      positions: patch.positions,
      texCoords: patch.texCoords,
      indices: patch.indices,
      modelMatrix: Matrix4.clone(Matrix4.IDENTITY),
      boundingVolume: region.boundingSphere,
      ...mask,
    };
  }

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
    kind: kind,
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
  return buildLookup(tile, collections, vectorModelMatrix, "polylines");
}

/**
 * @param {*} tile
 * @param {Array<*>|undefined} collections
 * @param {*} vectorModelMatrix
 * @returns {*}
 */
export function buildTileSurfacePolygonGpuLookup(
  tile,
  collections,
  vectorModelMatrix,
) {
  return buildLookup(tile, collections, vectorModelMatrix, "polygons");
}
