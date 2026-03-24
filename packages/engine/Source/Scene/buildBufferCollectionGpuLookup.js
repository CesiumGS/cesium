import Cartesian3 from "../Core/Cartesian3.js";
import defined from "../Core/defined.js";
import BufferPolygon from "./BufferPolygon.js";
import BufferPolyline from "./BufferPolyline.js";

const scratchOrigin = new Cartesian3();
const scratchPoint = new Cartesian3();
const scratchPoint2 = new Cartesian3();
const scratchPoint3 = new Cartesian3();
const scratchVector = new Cartesian3();
const scratchVector2 = new Cartesian3();
const scratchVector3 = new Cartesian3();

const GRID_TARGET_SEGMENTS_PER_CELL = 64;
const PLANAR_TOLERANCE_SCALE = 1e-4;

function nextPowerOfTwo(value) {
  let result = 1;
  while (result < value) {
    result <<= 1;
  }
  return result;
}

function getCollectionPositionView(collection) {
  const positionView = collection._positionView;
  return positionView.subarray(0, collection.vertexCount * 3);
}

function computeProjectionFrame(positionView) {
  const vertexCount = positionView.length / 3;
  if (vertexCount < 2) {
    return {
      frame: undefined,
      reason: "tooFewVertices",
      details: { vertexCount: vertexCount },
    };
  }

  Cartesian3.fromArray(positionView, 0, scratchOrigin);

  let firstDistinctIndex = -1;
  for (let i = 1; i < vertexCount; i++) {
    Cartesian3.fromArray(positionView, i * 3, scratchPoint);
    Cartesian3.subtract(scratchPoint, scratchOrigin, scratchVector);
    if (Cartesian3.magnitudeSquared(scratchVector) > 0.0) {
      firstDistinctIndex = i;
      break;
    }
  }

  if (firstDistinctIndex < 0) {
    return {
      frame: undefined,
      reason: "allVerticesCoincident",
      details: { vertexCount: vertexCount },
    };
  }

  Cartesian3.fromArray(positionView, firstDistinctIndex * 3, scratchPoint);
  const uAxis = Cartesian3.normalize(
    Cartesian3.subtract(scratchPoint, scratchOrigin, new Cartesian3()),
    new Cartesian3(),
  );

  let normalMagnitude = 0.0;
  const normal = new Cartesian3();
  for (let i = firstDistinctIndex + 1; i < vertexCount; i++) {
    Cartesian3.fromArray(positionView, i * 3, scratchPoint2);
    Cartesian3.subtract(scratchPoint2, scratchOrigin, scratchVector2);
    Cartesian3.cross(uAxis, scratchVector2, scratchVector3);
    const magnitude = Cartesian3.magnitudeSquared(scratchVector3);
    if (magnitude > normalMagnitude) {
      normalMagnitude = magnitude;
      Cartesian3.clone(scratchVector3, normal);
    }
  }

  if (normalMagnitude === 0.0) {
    const axisCandidates = [
      Cartesian3.UNIT_X,
      Cartesian3.UNIT_Y,
      Cartesian3.UNIT_Z,
    ];
    let bestAxis = Cartesian3.UNIT_Z;
    let bestDot = 1.0;
    for (let i = 0; i < axisCandidates.length; i++) {
      const dot = Math.abs(Cartesian3.dot(uAxis, axisCandidates[i]));
      if (dot < bestDot) {
        bestDot = dot;
        bestAxis = axisCandidates[i];
      }
    }
    Cartesian3.cross(uAxis, bestAxis, normal);
  }

  Cartesian3.normalize(normal, normal);
  const vAxis = Cartesian3.normalize(
    Cartesian3.cross(normal, uAxis, new Cartesian3()),
    new Cartesian3(),
  );

  let minU = Number.POSITIVE_INFINITY;
  let maxU = Number.NEGATIVE_INFINITY;
  let minV = Number.POSITIVE_INFINITY;
  let maxV = Number.NEGATIVE_INFINITY;
  let maxDistance = 0.0;

  for (let i = 0; i < vertexCount; i++) {
    Cartesian3.fromArray(positionView, i * 3, scratchPoint3);
    Cartesian3.subtract(scratchPoint3, scratchOrigin, scratchVector);
    const u = Cartesian3.dot(scratchVector, uAxis);
    const v = Cartesian3.dot(scratchVector, vAxis);
    const distance = Math.abs(Cartesian3.dot(scratchVector, normal));

    minU = Math.min(minU, u);
    maxU = Math.max(maxU, u);
    minV = Math.min(minV, v);
    maxV = Math.max(maxV, v);
    maxDistance = Math.max(maxDistance, distance);
  }

  const extentU = maxU - minU;
  const extentV = maxV - minV;
  const extent = Math.max(extentU, extentV, 1.0);
  if (maxDistance > extent * PLANAR_TOLERANCE_SCALE) {
    return {
      frame: undefined,
      reason: "nonPlanar",
      details: {
        maxDistance: maxDistance,
        extent: extent,
        tolerance: extent * PLANAR_TOLERANCE_SCALE,
      },
    };
  }

  const padding = Math.max(extent * 0.01, 1.0e-6);
  minU -= padding;
  maxU += padding;
  minV -= padding;
  maxV += padding;

  return {
    frame: {
      origin: Cartesian3.clone(scratchOrigin, new Cartesian3()),
      uAxis: uAxis,
      vAxis: vAxis,
      minU: minU,
      maxU: maxU,
      minV: minV,
      maxV: maxV,
    },
    reason: undefined,
    details: undefined,
  };
}

function projectPosition(positionArray, offset, frame) {
  Cartesian3.fromArray(positionArray, offset, scratchPoint);
  Cartesian3.subtract(scratchPoint, frame.origin, scratchVector);
  const u = Cartesian3.dot(scratchVector, frame.uAxis);
  const v = Cartesian3.dot(scratchVector, frame.vAxis);
  const uNorm = (u - frame.minU) / (frame.maxU - frame.minU);
  const vNorm = (v - frame.minV) / (frame.maxV - frame.minV);
  return [uNorm, vNorm];
}

function buildQuadPositions(frame) {
  const result = new Float64Array(12);
  const corners = [
    [frame.minU, frame.minV],
    [frame.maxU, frame.minV],
    [frame.maxU, frame.maxV],
    [frame.minU, frame.maxV],
  ];

  for (let i = 0; i < corners.length; i++) {
    const corner = corners[i];
    const u = corner[0];
    const v = corner[1];
    const position = Cartesian3.clone(frame.origin, scratchPoint);
    Cartesian3.multiplyByScalar(frame.uAxis, u, scratchVector);
    Cartesian3.add(position, scratchVector, position);
    Cartesian3.multiplyByScalar(frame.vAxis, v, scratchVector2);
    Cartesian3.add(position, scratchVector2, position);
    result[i * 3] = position.x;
    result[i * 3 + 1] = position.y;
    result[i * 3 + 2] = position.z;
  }

  return result;
}

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
    gridSizeX: gridSize,
    gridSizeY: gridSize,
  };
}

function buildPolylineSegments(collection, frame) {
  const segments = [];
  const polyline = new BufferPolyline();
  for (let i = 0; i < collection.primitiveCount; i++) {
    collection.get(i, polyline);
    if (!polyline.show) {
      continue;
    }
    const positions = polyline.getPositions();
    for (let j = 0; j + 1 < polyline.vertexCount; j++) {
      const a = projectPosition(positions, j * 3, frame);
      const b = projectPosition(positions, (j + 1) * 3, frame);
      segments.push([a[0], a[1], b[0], b[1]]);
    }
  }
  return segments;
}

function appendRingSegments(ringPositions, frame, segments) {
  const vertexCount = ringPositions.length / 3;
  if (vertexCount < 2) {
    return;
  }

  for (let i = 0; i + 1 < vertexCount; i++) {
    const a = projectPosition(ringPositions, i * 3, frame);
    const b = projectPosition(ringPositions, (i + 1) * 3, frame);
    segments.push([a[0], a[1], b[0], b[1]]);
  }

  const first = projectPosition(ringPositions, 0, frame);
  const last = projectPosition(ringPositions, (vertexCount - 1) * 3, frame);
  if (first[0] !== last[0] || first[1] !== last[1]) {
    segments.push([last[0], last[1], first[0], first[1]]);
  }
}

function buildPolygonSegments(collection, frame) {
  const segments = [];
  const polygon = new BufferPolygon();
  for (let i = 0; i < collection.primitiveCount; i++) {
    collection.get(i, polygon);
    if (!polygon.show) {
      continue;
    }
    appendRingSegments(polygon.getOuterPositions(), frame, segments);
    for (let j = 0; j < polygon.holeCount; j++) {
      appendRingSegments(polygon.getHolePositions(j), frame, segments);
    }
  }
  return segments;
}

function buildLookup(collection, segmentBuilder, kind, fixedGridSize) {
  const positionView = getCollectionPositionView(collection);
  if (positionView.length === 0) {
    return undefined;
  }

  const frameResult = computeProjectionFrame(positionView);
  const frame = frameResult.frame;
  if (!defined(frame)) {
    return undefined;
  }

  const segments = segmentBuilder(collection, frame);
  if (segments.length === 0) {
    return undefined;
  }

  const packed = packGridSegments(segments, fixedGridSize);
  if (!defined(packed)) {
    return undefined;
  }

  return {
    kind: kind,
    quadPositions: buildQuadPositions(frame),
    ...packed,
  };
}

export function buildPolylineCollectionGpuLookup(collection) {
  return buildLookup(collection, buildPolylineSegments, "polylines");
}

export function buildPolygonCollectionGpuLookup(collection) {
  return buildLookup(collection, buildPolygonSegments, "polygons", 1);
}

export default {
  buildPolylineCollectionGpuLookup: buildPolylineCollectionGpuLookup,
  buildPolygonCollectionGpuLookup: buildPolygonCollectionGpuLookup,
};
