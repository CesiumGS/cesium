import Cartesian3 from "../../Core/Cartesian3.js";
import Cartographic from "../../Core/Cartographic.js";
import defined from "../../Core/defined.js";
import Ellipsoid from "../../Core/Ellipsoid.js";
import Matrix4 from "../../Core/Matrix4.js";
import BufferPolyline from "../BufferPolyline.js";

function clamp(value, minValue, maxValue) {
  return Math.max(minValue, Math.min(maxValue, value));
}

function nextPowerOfTwo(value) {
  let power = 1;
  while (power < value) {
    power <<= 1;
  }
  return power;
}

function getCellIndex(
  lon,
  lat,
  minLon,
  minLat,
  invLonRange,
  invLatRange,
  gridSizeX,
  gridSizeY,
) {
  const x = clamp(Math.floor((lon - minLon) * invLonRange * gridSizeX), 0, gridSizeX - 1);
  const y = clamp(Math.floor((lat - minLat) * invLatRange * gridSizeY), 0, gridSizeY - 1);
  return {
    x: x,
    y: y,
    index: y * gridSizeX + x,
  };
}

/**
 * Creates GPU lookup line-segment textures from vector polyline buffers.
 *
 * Encoded format matches the prototype layout:
 * - `coords`: RGBA32F texture (x1, y1, x2, y2), normalized to [0, 1] in bbox.
 * - `gridCellIndices`: first 2 values are grid size [x, y], then cumulative end-index for each cell.
 * - `cutFlags`: all 0 for polylines (reserved for polygon clipping cases).
 *
 * @param {BufferPolylineCollection|undefined} polylineBuffers
 * @param {number} [targetLinePerCell=1000]
 * @param {Matrix4} [modelMatrix=Matrix4.IDENTITY]
 * @returns {object|undefined}
 *
 * @private
 */
function createVectorGpuLookup(
  polylineBuffers,
  targetLinePerCell = 1000,
  modelMatrix = Matrix4.IDENTITY,
) {
  if (!defined(polylineBuffers) || polylineBuffers.primitiveCount === 0) {
    return undefined;
  }

  const polyline = new BufferPolyline();
  const local0 = new Cartesian3();
  const local1 = new Cartesian3();
  const cartesian0 = new Cartesian3();
  const cartesian1 = new Cartesian3();
  const scratch0 = new Cartographic();
  const scratch1 = new Cartographic();
  const ellipsoid = Ellipsoid.WGS84;
  const hasTransform = !Matrix4.equals(modelMatrix, Matrix4.IDENTITY);

  const segments = [];
  let minLon = Number.POSITIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLon = Number.NEGATIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < polylineBuffers.primitiveCount; i++) {
    polylineBuffers.get(i, polyline);
    const positions = polyline.getPositions();
    const vertexCount = positions.length / 3;
    if (vertexCount < 2) {
      continue;
    }

    for (let j = 0; j < vertexCount - 1; j++) {
      const o0 = j * 3;
      const o1 = (j + 1) * 3;

      local0.x = positions[o0];
      local0.y = positions[o0 + 1];
      local0.z = positions[o0 + 2];
      local1.x = positions[o1];
      local1.y = positions[o1 + 1];
      local1.z = positions[o1 + 2];

      if (hasTransform) {
        Matrix4.multiplyByPoint(modelMatrix, local0, cartesian0);
        Matrix4.multiplyByPoint(modelMatrix, local1, cartesian1);
      } else {
        Cartesian3.clone(local0, cartesian0);
        Cartesian3.clone(local1, cartesian1);
      }

      const c0 = ellipsoid.cartesianToCartographic(
        cartesian0,
        scratch0,
      );
      const c1 = ellipsoid.cartesianToCartographic(
        cartesian1,
        scratch1,
      );
      if (!defined(c0) || !defined(c1)) {
        continue;
      }

      const lon0 = c0.longitude;
      const lat0 = c0.latitude;
      const lon1 = c1.longitude;
      const lat1 = c1.latitude;

      minLon = Math.min(minLon, lon0, lon1);
      minLat = Math.min(minLat, lat0, lat1);
      maxLon = Math.max(maxLon, lon0, lon1);
      maxLat = Math.max(maxLat, lat0, lat1);

      segments.push([lon0, lat0, lon1, lat1]);
    }
  }

  if (segments.length === 0) {
    return undefined;
  }

  const lonRange = Math.max(maxLon - minLon, 1e-9);
  const latRange = Math.max(maxLat - minLat, 1e-9);
  const invLonRange = 1.0 / lonRange;
  const invLatRange = 1.0 / latRange;

  const gridSizeBase = Math.ceil(Math.sqrt(segments.length / targetLinePerCell));
  const gridSizeX = Math.max(1, gridSizeBase);
  const gridSizeY = Math.max(1, gridSizeBase);
  const cellCount = gridSizeX * gridSizeY;

  const cells = new Array(cellCount);
  for (let i = 0; i < cellCount; i++) {
    cells[i] = [];
  }

  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    const cellA = getCellIndex(
      s[0],
      s[1],
      minLon,
      minLat,
      invLonRange,
      invLatRange,
      gridSizeX,
      gridSizeY,
    );
    const cellB = getCellIndex(
      s[2],
      s[3],
      minLon,
      minLat,
      invLonRange,
      invLatRange,
      gridSizeX,
      gridSizeY,
    );

    cells[cellA.index].push(s);
    if (cellB.index !== cellA.index) {
      cells[cellB.index].push(s);
    }
  }

  let assignedCount = 0;
  for (let i = 0; i < cellCount; i++) {
    assignedCount += cells[i].length;
  }

  const textureWidth = nextPowerOfTwo(Math.ceil(Math.sqrt(Math.max(1, assignedCount))));
  const textureHeight = nextPowerOfTwo(
    Math.ceil(Math.max(1, assignedCount) / textureWidth),
  );
  const maxSegmentCount = textureWidth * textureHeight;

  const coords = new Float32Array(maxSegmentCount * 4);
  const cutFlags = new Uint8Array(maxSegmentCount);
  const gridCellIndices = new Uint32Array(cellCount + 2);
  gridCellIndices[0] = gridSizeX;
  gridCellIndices[1] = gridSizeY;

  let writeIndex = 0;
  for (let y = 0; y < gridSizeY; y++) {
    for (let x = 0; x < gridSizeX; x++) {
      const index = y * gridSizeX + x;
      const cellSegments = cells[index];
      for (let i = 0; i < cellSegments.length; i++) {
        const s = cellSegments[i];
        coords[writeIndex * 4] = (s[0] - minLon) * invLonRange;
        coords[writeIndex * 4 + 1] = (s[1] - minLat) * invLatRange;
        coords[writeIndex * 4 + 2] = (s[2] - minLon) * invLonRange;
        coords[writeIndex * 4 + 3] = (s[3] - minLat) * invLatRange;
        cutFlags[writeIndex] = 0;
        writeIndex++;
      }
      gridCellIndices[2 + index] = writeIndex;
    }
  }

  for (; writeIndex < maxSegmentCount; writeIndex++) {
    coords[writeIndex * 4] = -1.0;
    coords[writeIndex * 4 + 1] = -1.0;
    coords[writeIndex * 4 + 2] = -1.0;
    coords[writeIndex * 4 + 3] = -1.0;
    cutFlags[writeIndex] = 2;
  }

  return {
    coords: coords,
    textureWidth: textureWidth,
    textureHeight: textureHeight,
    gridCellIndices: gridCellIndices,
    gridSizeX: gridSizeX,
    gridSizeY: gridSizeY,
    cutFlags: cutFlags,
    hasPolygons: false,
    segmentCount: assignedCount,
    bboxRadians: [minLon, minLat, maxLon, maxLat],
  };
}

export default createVectorGpuLookup;
