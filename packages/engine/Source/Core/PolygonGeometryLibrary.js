import ArcType from "./ArcType.js";
import arrayRemoveDuplicates from "./arrayRemoveDuplicates.js";
import Cartesian2 from "./Cartesian2.js";
import Cartesian3 from "./Cartesian3.js";
import Cartographic from "./Cartographic.js";
import ComponentDatatype from "./ComponentDatatype.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import Ellipsoid from "./Ellipsoid.js";
import EllipsoidRhumbLine from "./EllipsoidRhumbLine.js";
import Geometry from "./Geometry.js";
import GeometryAttribute from "./GeometryAttribute.js";
import GeometryAttributes from "./GeometryAttributes.js";
import GeometryPipeline from "./GeometryPipeline.js";
import IndexDatatype from "./IndexDatatype.js";
import IntersectionTests from "./IntersectionTests.js";
import CesiumMath from "./Math.js";
import Matrix3 from "./Matrix3.js";
import Plane from "./Plane.js";
import PolygonHierarchy from "./PolygonHierarchy.js";
import PolygonPipeline from "./PolygonPipeline.js";
import PrimitiveType from "./PrimitiveType.js";
import Quaternion from "./Quaternion.js";
import Queue from "./Queue.js";
import WindingOrder from "./WindingOrder.js";

/**
 * @private
 */
const PolygonGeometryLibrary = {};

PolygonGeometryLibrary.computeHierarchyPackedLength = function (
  polygonHierarchy,
  CartesianX,
) {
  let numComponents = 0;
  const stack = [polygonHierarchy];
  while (stack.length > 0) {
    const hierarchy = stack.pop();
    if (!defined(hierarchy)) {
      continue;
    }

    numComponents += 2;

    const positions = hierarchy.positions;
    const holes = hierarchy.holes;

    if (defined(positions) && positions.length > 0) {
      numComponents += positions.length * CartesianX.packedLength;
    }

    if (defined(holes)) {
      const length = holes.length;
      for (let i = 0; i < length; ++i) {
        stack.push(holes[i]);
      }
    }
  }

  return numComponents;
};

PolygonGeometryLibrary.packPolygonHierarchy = function (
  polygonHierarchy,
  array,
  startingIndex,
  CartesianX,
) {
  const stack = [polygonHierarchy];
  while (stack.length > 0) {
    const hierarchy = stack.pop();
    if (!defined(hierarchy)) {
      continue;
    }

    const positions = hierarchy.positions;
    const holes = hierarchy.holes;

    array[startingIndex++] = defined(positions) ? positions.length : 0;
    array[startingIndex++] = defined(holes) ? holes.length : 0;

    if (defined(positions)) {
      const positionsLength = positions.length;
      for (
        let i = 0;
        i < positionsLength;
        ++i, startingIndex += CartesianX.packedLength
      ) {
        CartesianX.pack(positions[i], array, startingIndex);
      }
    }

    if (defined(holes)) {
      const holesLength = holes.length;
      for (let j = 0; j < holesLength; ++j) {
        stack.push(holes[j]);
      }
    }
  }

  return startingIndex;
};

PolygonGeometryLibrary.unpackPolygonHierarchy = function (
  array,
  startingIndex,
  CartesianX,
) {
  const positionsLength = array[startingIndex++];
  const holesLength = array[startingIndex++];

  const positions = new Array(positionsLength);
  const holes = holesLength > 0 ? new Array(holesLength) : undefined;

  for (
    let i = 0;
    i < positionsLength;
    ++i, startingIndex += CartesianX.packedLength
  ) {
    positions[i] = CartesianX.unpack(array, startingIndex);
  }

  for (let j = 0; j < holesLength; ++j) {
    holes[j] = PolygonGeometryLibrary.unpackPolygonHierarchy(
      array,
      startingIndex,
      CartesianX,
    );
    startingIndex = holes[j].startingIndex;
    delete holes[j].startingIndex;
  }

  return {
    positions: positions,
    holes: holes,
    startingIndex: startingIndex,
  };
};

const distance2DScratch = new Cartesian2();
function getPointAtDistance2D(p0, p1, distance, length) {
  Cartesian2.subtract(p1, p0, distance2DScratch);
  Cartesian2.multiplyByScalar(
    distance2DScratch,
    distance / length,
    distance2DScratch,
  );
  Cartesian2.add(p0, distance2DScratch, distance2DScratch);
  return [distance2DScratch.x, distance2DScratch.y];
}

const distanceScratch = new Cartesian3();
function getPointAtDistance(p0, p1, distance, length) {
  Cartesian3.subtract(p1, p0, distanceScratch);
  Cartesian3.multiplyByScalar(
    distanceScratch,
    distance / length,
    distanceScratch,
  );
  Cartesian3.add(p0, distanceScratch, distanceScratch);
  return [distanceScratch.x, distanceScratch.y, distanceScratch.z];
}

PolygonGeometryLibrary.subdivideLineCount = function (p0, p1, minDistance) {
  const distance = Cartesian3.distance(p0, p1);
  const n = distance / minDistance;
  const countDivide = Math.max(0, Math.ceil(CesiumMath.log2(n)));
  return Math.pow(2, countDivide);
};

const scratchCartographic0 = new Cartographic();
const scratchCartographic1 = new Cartographic();
const scratchCartographic2 = new Cartographic();
const scratchCartesian0 = new Cartesian3();
const scratchRhumbLine = new EllipsoidRhumbLine();
PolygonGeometryLibrary.subdivideRhumbLineCount = function (
  ellipsoid,
  p0,
  p1,
  minDistance,
) {
  const c0 = ellipsoid.cartesianToCartographic(p0, scratchCartographic0);
  const c1 = ellipsoid.cartesianToCartographic(p1, scratchCartographic1);
  const rhumb = new EllipsoidRhumbLine(c0, c1, ellipsoid);
  const n = rhumb.surfaceDistance / minDistance;
  const countDivide = Math.max(0, Math.ceil(CesiumMath.log2(n)));
  return Math.pow(2, countDivide);
};

/**
 * Subdivides texture coordinates based on the subdivision of the associated world positions.
 *
 * @param {Cartesian2} t0 First texture coordinate.
 * @param {Cartesian2} t1 Second texture coordinate.
 * @param {Cartesian3} p0 First world position.
 * @param {Cartesian3} p1 Second world position.
 * @param {number} minDistance Minimum distance for a segment.
 * @param {Cartesian2[]} result The subdivided texture coordinates.
 *
 * @private
 */
PolygonGeometryLibrary.subdivideTexcoordLine = function (
  t0,
  t1,
  p0,
  p1,
  minDistance,
  result,
) {
  // Compute the number of subdivisions.
  const subdivisions = PolygonGeometryLibrary.subdivideLineCount(
    p0,
    p1,
    minDistance,
  );

  // Compute the distance between each subdivided point.
  const length2D = Cartesian2.distance(t0, t1);
  const distanceBetweenCoords = length2D / subdivisions;

  // Resize the result array.
  const texcoords = result;
  texcoords.length = subdivisions * 2;

  // Compute texture coordinates using linear interpolation.
  let index = 0;
  for (let i = 0; i < subdivisions; i++) {
    const t = getPointAtDistance2D(t0, t1, i * distanceBetweenCoords, length2D);
    texcoords[index++] = t[0];
    texcoords[index++] = t[1];
  }

  return texcoords;
};

PolygonGeometryLibrary.subdivideLine = function (p0, p1, minDistance, result) {
  const numVertices = PolygonGeometryLibrary.subdivideLineCount(
    p0,
    p1,
    minDistance,
  );
  const length = Cartesian3.distance(p0, p1);
  const distanceBetweenVertices = length / numVertices;

  if (!defined(result)) {
    result = [];
  }

  const positions = result;
  positions.length = numVertices * 3;

  let index = 0;
  for (let i = 0; i < numVertices; i++) {
    const p = getPointAtDistance(p0, p1, i * distanceBetweenVertices, length);
    positions[index++] = p[0];
    positions[index++] = p[1];
    positions[index++] = p[2];
  }

  return positions;
};

/**
 * Subdivides texture coordinates based on the subdivision of the associated world positions using a rhumb line.
 *
 * @param {Cartesian2} t0 First texture coordinate.
 * @param {Cartesian2} t1 Second texture coordinate.
 * @param {Ellipsoid} ellipsoid The ellipsoid.
 * @param {Cartesian3} p0 First world position.
 * @param {Cartesian3} p1 Second world position.
 * @param {number} minDistance Minimum distance for a segment.
 * @param {Cartesian2[]} result The subdivided texture coordinates.
 *
 * @private
 */
PolygonGeometryLibrary.subdivideTexcoordRhumbLine = function (
  t0,
  t1,
  ellipsoid,
  p0,
  p1,
  minDistance,
  result,
) {
  // Compute the surface distance.
  const c0 = ellipsoid.cartesianToCartographic(p0, scratchCartographic0);
  const c1 = ellipsoid.cartesianToCartographic(p1, scratchCartographic1);
  scratchRhumbLine.setEndPoints(c0, c1);
  const n = scratchRhumbLine.surfaceDistance / minDistance;

  // Compute the number of subdivisions.
  const countDivide = Math.max(0, Math.ceil(CesiumMath.log2(n)));
  const subdivisions = Math.pow(2, countDivide);

  // Compute the distance between each subdivided point.
  const length2D = Cartesian2.distance(t0, t1);
  const distanceBetweenCoords = length2D / subdivisions;

  // Resize the result array.
  const texcoords = result;
  texcoords.length = subdivisions * 2;

  // Compute texture coordinates using linear interpolation.
  let index = 0;
  for (let i = 0; i < subdivisions; i++) {
    const t = getPointAtDistance2D(t0, t1, i * distanceBetweenCoords, length2D);
    texcoords[index++] = t[0];
    texcoords[index++] = t[1];
  }

  return texcoords;
};

PolygonGeometryLibrary.subdivideRhumbLine = function (
  ellipsoid,
  p0,
  p1,
  minDistance,
  result,
) {
  const c0 = ellipsoid.cartesianToCartographic(p0, scratchCartographic0);
  const c1 = ellipsoid.cartesianToCartographic(p1, scratchCartographic1);
  const rhumb = new EllipsoidRhumbLine(c0, c1, ellipsoid);

  const n = rhumb.surfaceDistance / minDistance;
  const countDivide = Math.max(0, Math.ceil(CesiumMath.log2(n)));
  const numVertices = Math.pow(2, countDivide);
  const distanceBetweenVertices = rhumb.surfaceDistance / numVertices;

  if (!defined(result)) {
    result = [];
  }

  const positions = result;
  positions.length = numVertices * 3;

  let index = 0;
  for (let i = 0; i < numVertices; i++) {
    const c = rhumb.interpolateUsingSurfaceDistance(
      i * distanceBetweenVertices,
      scratchCartographic2,
    );
    const p = ellipsoid.cartographicToCartesian(c, scratchCartesian0);
    positions[index++] = p.x;
    positions[index++] = p.y;
    positions[index++] = p.z;
  }

  return positions;
};

const scaleToGeodeticHeightN1 = new Cartesian3();
const scaleToGeodeticHeightN2 = new Cartesian3();
const scaleToGeodeticHeightP1 = new Cartesian3();
const scaleToGeodeticHeightP2 = new Cartesian3();

PolygonGeometryLibrary.scaleToGeodeticHeightExtruded = function (
  geometry,
  maxHeight,
  minHeight,
  ellipsoid,
  perPositionHeight,
) {
  ellipsoid = defaultValue(ellipsoid, Ellipsoid.default);

  const n1 = scaleToGeodeticHeightN1;
  let n2 = scaleToGeodeticHeightN2;
  const p = scaleToGeodeticHeightP1;
  let p2 = scaleToGeodeticHeightP2;

  if (
    defined(geometry) &&
    defined(geometry.attributes) &&
    defined(geometry.attributes.position)
  ) {
    const positions = geometry.attributes.position.values;
    const length = positions.length / 2;

    for (let i = 0; i < length; i += 3) {
      Cartesian3.fromArray(positions, i, p);

      ellipsoid.geodeticSurfaceNormal(p, n1);
      p2 = ellipsoid.scaleToGeodeticSurface(p, p2);
      n2 = Cartesian3.multiplyByScalar(n1, minHeight, n2);
      n2 = Cartesian3.add(p2, n2, n2);
      positions[i + length] = n2.x;
      positions[i + 1 + length] = n2.y;
      positions[i + 2 + length] = n2.z;

      if (perPositionHeight) {
        p2 = Cartesian3.clone(p, p2);
      }
      n2 = Cartesian3.multiplyByScalar(n1, maxHeight, n2);
      n2 = Cartesian3.add(p2, n2, n2);
      positions[i] = n2.x;
      positions[i + 1] = n2.y;
      positions[i + 2] = n2.z;
    }
  }
  return geometry;
};

PolygonGeometryLibrary.polygonOutlinesFromHierarchy = function (
  polygonHierarchy,
  scaleToEllipsoidSurface,
  ellipsoid,
) {
  // create from a polygon hierarchy
  // Algorithm adapted from http://www.geometrictools.com/Documentation/TriangulationByEarClipping.pdf
  const polygons = [];
  const queue = new Queue();
  queue.enqueue(polygonHierarchy);
  let i;
  let j;
  let length;
  while (queue.length !== 0) {
    const outerNode = queue.dequeue();
    let outerRing = outerNode.positions;
    if (scaleToEllipsoidSurface) {
      length = outerRing.length;
      for (i = 0; i < length; i++) {
        ellipsoid.scaleToGeodeticSurface(outerRing[i], outerRing[i]);
      }
    }
    outerRing = arrayRemoveDuplicates(
      outerRing,
      Cartesian3.equalsEpsilon,
      true,
    );
    if (outerRing.length < 3) {
      continue;
    }

    const numChildren = outerNode.holes ? outerNode.holes.length : 0;
    // The outer polygon contains inner polygons
    for (i = 0; i < numChildren; i++) {
      const hole = outerNode.holes[i];
      let holePositions = hole.positions;
      if (scaleToEllipsoidSurface) {
        length = holePositions.length;
        for (j = 0; j < length; ++j) {
          ellipsoid.scaleToGeodeticSurface(holePositions[j], holePositions[j]);
        }
      }
      holePositions = arrayRemoveDuplicates(
        holePositions,
        Cartesian3.equalsEpsilon,
        true,
      );
      if (holePositions.length < 3) {
        continue;
      }
      polygons.push(holePositions);

      let numGrandchildren = 0;
      if (defined(hole.holes)) {
        numGrandchildren = hole.holes.length;
      }

      for (j = 0; j < numGrandchildren; j++) {
        queue.enqueue(hole.holes[j]);
      }
    }

    polygons.push(outerRing);
  }

  return polygons;
};

const scratchRhumbIntersection = new Cartographic();
function computeEquatorIntersectionRhumb(start, end, ellipsoid) {
  const c0 = ellipsoid.cartesianToCartographic(start, scratchCartographic0);
  const c1 = ellipsoid.cartesianToCartographic(end, scratchCartographic1);

  if (Math.sign(c0.latitude) === Math.sign(c1.latitude)) {
    return;
  }

  scratchRhumbLine.setEndPoints(c0, c1);

  const intersection = scratchRhumbLine.findIntersectionWithLatitude(
    0,
    scratchRhumbIntersection,
  );

  if (!defined(intersection)) {
    return;
  }

  let minLongitude = Math.min(c0.longitude, c1.longitude);
  let maxLongitude = Math.max(c0.longitude, c1.longitude);

  if (Math.abs(maxLongitude - minLongitude) > CesiumMath.PI) {
    // Crosses IDL, flip min and max
    const swap = minLongitude;
    minLongitude = maxLongitude;
    maxLongitude = swap;
  }

  if (
    intersection.longitude < minLongitude ||
    intersection.longitude > maxLongitude
  ) {
    return;
  }

  return ellipsoid.cartographicToCartesian(intersection);
}

function computeEquatorIntersection(start, end, ellipsoid, arcType) {
  if (arcType === ArcType.RHUMB) {
    return computeEquatorIntersectionRhumb(start, end, ellipsoid);
  }

  const intersection = IntersectionTests.lineSegmentPlane(
    start,
    end,
    Plane.ORIGIN_XY_PLANE,
  );

  if (!defined(intersection)) {
    return;
  }

  return ellipsoid.scaleToGeodeticSurface(intersection, intersection);
}

const scratchCartographic = new Cartographic();
function computeEdgesOnPlane(positions, ellipsoid, arcType) {
  const edgesOnPlane = [];
  let startPoint,
    endPoint,
    type,
    next,
    intersection,
    i = 0;
  while (i < positions.length) {
    startPoint = positions[i];
    endPoint = positions[(i + 1) % positions.length];

    type = CesiumMath.sign(startPoint.z);
    next = CesiumMath.sign(endPoint.z);

    const getLongitude = (position) => {
      const cartographic = ellipsoid.cartesianToCartographic(
        position,
        scratchCartographic,
      );
      return cartographic.longitude;
    };

    if (type === 0) {
      // The start position is on the split
      edgesOnPlane.push({
        position: i,
        type: type,
        visited: false,
        next: next,
        theta: getLongitude(startPoint),
      });
    } else if (next !== 0) {
      intersection = computeEquatorIntersection(
        startPoint,
        endPoint,
        ellipsoid,
        arcType,
      );

      ++i;
      if (!defined(intersection)) {
        // The line segment is entirely above or below
        continue;
      }

      // The line segment passed through
      positions.splice(i, 0, intersection);
      edgesOnPlane.push({
        position: i,
        type: type,
        visited: false,
        next: next,
        theta: getLongitude(intersection),
      });
    }

    ++i;
  }

  return edgesOnPlane;
}

function wirePolygon(
  polygons,
  polygonIndex,
  positions,
  edgesOnPlane,
  toDelete,
  startIndex,
  abovePlane,
) {
  const polygon = [];
  let i = startIndex;
  const getMatchingEdge = (i) => (edge) => edge.position === i;
  const polygonsToWire = [];
  do {
    const position = positions[i];
    polygon.push(position);

    const edgeIndex = edgesOnPlane.findIndex(getMatchingEdge(i));
    const edge = edgesOnPlane[edgeIndex];
    if (!defined(edge)) {
      // The current segment does not intersect
      ++i;
      continue;
    }

    const { visited: hasBeenVisited, type, next } = edge;
    edge.visited = true;

    if (type === 0) {
      if (next === 0) {
        // Special case where we'll need to backtrack along the edge
        const previousEdge = edgesOnPlane[edgeIndex - (abovePlane ? 1 : -1)];
        if (previousEdge?.position === i + 1) {
          previousEdge.visited = true;
        } else {
          ++i;
          continue;
        }
      }

      // Special case where 3 polygons meet
      if (
        (!hasBeenVisited && abovePlane && next > 0) ||
        (startIndex === i && !abovePlane && next < 0)
      ) {
        ++i;
        continue;
      }
    }

    const followEdge = abovePlane ? type >= 0 : type <= 0;
    if (!followEdge) {
      ++i;
      continue;
    }

    if (!hasBeenVisited) {
      // Wire another polygon starting at this position on the other side of the edge
      polygonsToWire.push(i);
    }

    // Continue counter-clockwise to the next edge
    const nextEdgeIndex = edgeIndex + (abovePlane ? 1 : -1);
    const nextEdge = edgesOnPlane[nextEdgeIndex];
    if (!defined(nextEdge)) {
      ++i;
      continue;
    }

    i = nextEdge.position;
  } while (
    i < positions.length &&
    i >= 0 &&
    i !== startIndex &&
    polygon.length < positions.length
  );

  polygons.splice(polygonIndex, toDelete, polygon);

  for (const index of polygonsToWire) {
    polygonIndex = wirePolygon(
      polygons,
      ++polygonIndex,
      positions,
      edgesOnPlane,
      0,
      index,
      !abovePlane,
    );
  }

  return polygonIndex;
}

/**
 * Splits an array of polygons, defined as a list of Cartesian3 positions in counter-clockwise winding order, along the equator.
 *
 * @param {Array<Cartesian3[]>} outerRings An array of polygons, defined as a list of Cartesian3 positions in counter-clockwise winding order.
 * @param {Ellipsoid} ellipsoid The ellipsoid to be used as a reference.
 * @param {ArcType} arcType The type of line the polygon edges must follow. Valid options are {@link ArcType.GEODESIC} and {@link ArcType.RHUMB}.
 * @param {Array<Cartesian3[]>} [result] An array of split polygons.
 *
 * @returns {Array<Cartesian3[]>} An array of split polygons.
 */
PolygonGeometryLibrary.splitPolygonsOnEquator = function (
  outerRings,
  ellipsoid,
  arcType,
  result,
) {
  if (!defined(result)) {
    result = [];
  }

  result.splice(0, 0, ...outerRings);
  result.length = outerRings.length;

  let currentPolygon = 0;
  while (currentPolygon < result.length) {
    // Adapted from https://www.sciencedirect.com/science/article/abs/pii/B9780125434577500589#:~:text=If%20the%20plane%20intersects%20the,tree%20and%20polygon%20intersection%20libraries
    const outerRing = result[currentPolygon];
    const positions = outerRing.slice();

    if (outerRing.length < 3) {
      result[currentPolygon] = positions;
      ++currentPolygon;
      continue;
    }

    // Step 1: Get all edges which intersect the split line, splciing any found intersections points into the list of positions
    const edgesOnPlane = computeEdgesOnPlane(positions, ellipsoid, arcType);
    // If nothing intersected (no point were added), or there is only a single point on the plane, use the original polygon
    if (positions.length === outerRing.length || edgesOnPlane.length <= 1) {
      result[currentPolygon] = positions;
      ++currentPolygon;
      continue;
    }

    // Step 2: Sort the edges along the split line by the distance between their starting points and the starting point of the split line.
    edgesOnPlane.sort((a, b) => {
      return a.theta - b.theta;
    });

    // Step 3: Rewire polygons, splicing each polygon into the array of results
    const north = positions[0].z >= 0.0;
    currentPolygon = wirePolygon(
      result,
      currentPolygon,
      positions,
      edgesOnPlane,
      1,
      0,
      north,
    );
  }

  return result;
};

PolygonGeometryLibrary.polygonsFromHierarchy = function (
  polygonHierarchy,
  keepDuplicates,
  projectPointsTo2D,
  scaleToEllipsoidSurface,
  ellipsoid,
  splitPolygons,
) {
  // create from a polygon hierarchy
  // Algorithm adapted from http://www.geometrictools.com/Documentation/TriangulationByEarClipping.pdf
  const hierarchy = [];
  const polygons = [];

  const queue = new Queue();
  queue.enqueue(polygonHierarchy);

  let split = defined(splitPolygons);

  while (queue.length !== 0) {
    const outerNode = queue.dequeue();
    let outerRing = outerNode.positions;
    const holes = outerNode.holes;

    let i;
    let length;
    if (scaleToEllipsoidSurface) {
      length = outerRing.length;
      for (i = 0; i < length; i++) {
        ellipsoid.scaleToGeodeticSurface(outerRing[i], outerRing[i]);
      }
    }

    if (!keepDuplicates) {
      outerRing = arrayRemoveDuplicates(
        outerRing,
        Cartesian3.equalsEpsilon,
        true,
      );
    }
    if (outerRing.length < 3) {
      continue;
    }

    let positions2D = projectPointsTo2D(outerRing);
    if (!defined(positions2D)) {
      continue;
    }
    const holeIndices = [];

    let originalWindingOrder =
      PolygonPipeline.computeWindingOrder2D(positions2D);
    if (originalWindingOrder === WindingOrder.CLOCKWISE) {
      positions2D.reverse();
      outerRing = outerRing.slice().reverse();
    }

    if (split) {
      split = false;
      let polygons = [outerRing];
      polygons = splitPolygons(polygons, polygons);

      if (polygons.length > 1) {
        for (const positions of polygons) {
          queue.enqueue(new PolygonHierarchy(positions, holes));
        }

        continue;
      }
    }

    let positions = outerRing.slice();
    const numChildren = defined(holes) ? holes.length : 0;
    const polygonHoles = [];
    let j;

    for (i = 0; i < numChildren; i++) {
      const hole = holes[i];
      let holePositions = hole.positions;
      if (scaleToEllipsoidSurface) {
        length = holePositions.length;
        for (j = 0; j < length; ++j) {
          ellipsoid.scaleToGeodeticSurface(holePositions[j], holePositions[j]);
        }
      }

      if (!keepDuplicates) {
        holePositions = arrayRemoveDuplicates(
          holePositions,
          Cartesian3.equalsEpsilon,
          true,
        );
      }
      if (holePositions.length < 3) {
        continue;
      }

      const holePositions2D = projectPointsTo2D(holePositions);
      if (!defined(holePositions2D)) {
        continue;
      }

      originalWindingOrder =
        PolygonPipeline.computeWindingOrder2D(holePositions2D);
      if (originalWindingOrder === WindingOrder.CLOCKWISE) {
        holePositions2D.reverse();
        holePositions = holePositions.slice().reverse();
      }

      polygonHoles.push(holePositions);
      holeIndices.push(positions.length);
      positions = positions.concat(holePositions);
      positions2D = positions2D.concat(holePositions2D);

      let numGrandchildren = 0;
      if (defined(hole.holes)) {
        numGrandchildren = hole.holes.length;
      }

      for (j = 0; j < numGrandchildren; j++) {
        queue.enqueue(hole.holes[j]);
      }
    }

    hierarchy.push({
      outerRing: outerRing,
      holes: polygonHoles,
    });
    polygons.push({
      positions: positions,
      positions2D: positions2D,
      holes: holeIndices,
    });
  }

  return {
    hierarchy: hierarchy,
    polygons: polygons,
  };
};

const computeBoundingRectangleCartesian2 = new Cartesian2();
const computeBoundingRectangleCartesian3 = new Cartesian3();
const computeBoundingRectangleQuaternion = new Quaternion();
const computeBoundingRectangleMatrix3 = new Matrix3();
PolygonGeometryLibrary.computeBoundingRectangle = function (
  planeNormal,
  projectPointTo2D,
  positions,
  angle,
  result,
) {
  const rotation = Quaternion.fromAxisAngle(
    planeNormal,
    angle,
    computeBoundingRectangleQuaternion,
  );
  const textureMatrix = Matrix3.fromQuaternion(
    rotation,
    computeBoundingRectangleMatrix3,
  );

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  const length = positions.length;
  for (let i = 0; i < length; ++i) {
    const p = Cartesian3.clone(
      positions[i],
      computeBoundingRectangleCartesian3,
    );
    Matrix3.multiplyByVector(textureMatrix, p, p);
    const st = projectPointTo2D(p, computeBoundingRectangleCartesian2);

    if (defined(st)) {
      minX = Math.min(minX, st.x);
      maxX = Math.max(maxX, st.x);

      minY = Math.min(minY, st.y);
      maxY = Math.max(maxY, st.y);
    }
  }

  result.x = minX;
  result.y = minY;
  result.width = maxX - minX;
  result.height = maxY - minY;
  return result;
};

PolygonGeometryLibrary.createGeometryFromPositions = function (
  ellipsoid,
  polygon,
  textureCoordinates,
  granularity,
  perPositionHeight,
  vertexFormat,
  arcType,
) {
  let indices = PolygonPipeline.triangulate(polygon.positions2D, polygon.holes);

  /* If polygon is completely unrenderable, just use the first three vertices */
  if (indices.length < 3) {
    indices = [0, 1, 2];
  }

  const positions = polygon.positions;

  const hasTexcoords = defined(textureCoordinates);
  const texcoords = hasTexcoords ? textureCoordinates.positions : undefined;

  if (perPositionHeight) {
    const length = positions.length;
    const flattenedPositions = new Array(length * 3);
    let index = 0;
    for (let i = 0; i < length; i++) {
      const p = positions[i];
      flattenedPositions[index++] = p.x;
      flattenedPositions[index++] = p.y;
      flattenedPositions[index++] = p.z;
    }

    const geometryOptions = {
      attributes: {
        position: new GeometryAttribute({
          componentDatatype: ComponentDatatype.DOUBLE,
          componentsPerAttribute: 3,
          values: flattenedPositions,
        }),
      },
      indices: indices,
      primitiveType: PrimitiveType.TRIANGLES,
    };

    if (hasTexcoords) {
      geometryOptions.attributes.st = new GeometryAttribute({
        componentDatatype: ComponentDatatype.FLOAT,
        componentsPerAttribute: 2,
        values: Cartesian2.packArray(texcoords),
      });
    }

    const geometry = new Geometry(geometryOptions);

    if (vertexFormat.normal) {
      return GeometryPipeline.computeNormal(geometry);
    }

    return geometry;
  }

  if (arcType === ArcType.GEODESIC) {
    return PolygonPipeline.computeSubdivision(
      ellipsoid,
      positions,
      indices,
      texcoords,
      granularity,
    );
  } else if (arcType === ArcType.RHUMB) {
    return PolygonPipeline.computeRhumbLineSubdivision(
      ellipsoid,
      positions,
      indices,
      texcoords,
      granularity,
    );
  }
};

const computeWallTexcoordsSubdivided = [];
const computeWallIndicesSubdivided = [];
const p1Scratch = new Cartesian3();
const p2Scratch = new Cartesian3();

PolygonGeometryLibrary.computeWallGeometry = function (
  positions,
  textureCoordinates,
  ellipsoid,
  granularity,
  perPositionHeight,
  arcType,
) {
  let edgePositions;
  let topEdgeLength;
  let i;
  let p1;
  let p2;
  let t1;
  let t2;
  let edgeTexcoords;
  let topEdgeTexcoordLength;

  let length = positions.length;
  let index = 0;
  let textureIndex = 0;

  const hasTexcoords = defined(textureCoordinates);
  const texcoords = hasTexcoords ? textureCoordinates.positions : undefined;

  if (!perPositionHeight) {
    const minDistance = CesiumMath.chordLength(
      granularity,
      ellipsoid.maximumRadius,
    );

    let numVertices = 0;
    if (arcType === ArcType.GEODESIC) {
      for (i = 0; i < length; i++) {
        numVertices += PolygonGeometryLibrary.subdivideLineCount(
          positions[i],
          positions[(i + 1) % length],
          minDistance,
        );
      }
    } else if (arcType === ArcType.RHUMB) {
      for (i = 0; i < length; i++) {
        numVertices += PolygonGeometryLibrary.subdivideRhumbLineCount(
          ellipsoid,
          positions[i],
          positions[(i + 1) % length],
          minDistance,
        );
      }
    }

    topEdgeLength = (numVertices + length) * 3;
    edgePositions = new Array(topEdgeLength * 2);

    if (hasTexcoords) {
      topEdgeTexcoordLength = (numVertices + length) * 2;
      edgeTexcoords = new Array(topEdgeTexcoordLength * 2);
    }

    for (i = 0; i < length; i++) {
      p1 = positions[i];
      p2 = positions[(i + 1) % length];

      let tempPositions;
      let tempTexcoords;

      if (hasTexcoords) {
        t1 = texcoords[i];
        t2 = texcoords[(i + 1) % length];
      }

      if (arcType === ArcType.GEODESIC) {
        tempPositions = PolygonGeometryLibrary.subdivideLine(
          p1,
          p2,
          minDistance,
          computeWallIndicesSubdivided,
        );
        if (hasTexcoords) {
          tempTexcoords = PolygonGeometryLibrary.subdivideTexcoordLine(
            t1,
            t2,
            p1,
            p2,
            minDistance,
            computeWallTexcoordsSubdivided,
          );
        }
      } else if (arcType === ArcType.RHUMB) {
        tempPositions = PolygonGeometryLibrary.subdivideRhumbLine(
          ellipsoid,
          p1,
          p2,
          minDistance,
          computeWallIndicesSubdivided,
        );
        if (hasTexcoords) {
          tempTexcoords = PolygonGeometryLibrary.subdivideTexcoordRhumbLine(
            t1,
            t2,
            ellipsoid,
            p1,
            p2,
            minDistance,
            computeWallTexcoordsSubdivided,
          );
        }
      }
      const tempPositionsLength = tempPositions.length;
      for (let j = 0; j < tempPositionsLength; ++j, ++index) {
        edgePositions[index] = tempPositions[j];
        edgePositions[index + topEdgeLength] = tempPositions[j];
      }

      edgePositions[index] = p2.x;
      edgePositions[index + topEdgeLength] = p2.x;
      ++index;

      edgePositions[index] = p2.y;
      edgePositions[index + topEdgeLength] = p2.y;
      ++index;

      edgePositions[index] = p2.z;
      edgePositions[index + topEdgeLength] = p2.z;
      ++index;

      if (hasTexcoords) {
        const tempTexcoordsLength = tempTexcoords.length;
        for (let k = 0; k < tempTexcoordsLength; ++k, ++textureIndex) {
          edgeTexcoords[textureIndex] = tempTexcoords[k];
          edgeTexcoords[textureIndex + topEdgeTexcoordLength] =
            tempTexcoords[k];
        }

        edgeTexcoords[textureIndex] = t2.x;
        edgeTexcoords[textureIndex + topEdgeTexcoordLength] = t2.x;
        ++textureIndex;

        edgeTexcoords[textureIndex] = t2.y;
        edgeTexcoords[textureIndex + topEdgeTexcoordLength] = t2.y;
        ++textureIndex;
      }
    }
  } else {
    topEdgeLength = length * 3 * 2;
    edgePositions = new Array(topEdgeLength * 2);

    if (hasTexcoords) {
      topEdgeTexcoordLength = length * 2 * 2;
      edgeTexcoords = new Array(topEdgeTexcoordLength * 2);
    }

    for (i = 0; i < length; i++) {
      p1 = positions[i];
      p2 = positions[(i + 1) % length];
      edgePositions[index] = edgePositions[index + topEdgeLength] = p1.x;
      ++index;
      edgePositions[index] = edgePositions[index + topEdgeLength] = p1.y;
      ++index;
      edgePositions[index] = edgePositions[index + topEdgeLength] = p1.z;
      ++index;
      edgePositions[index] = edgePositions[index + topEdgeLength] = p2.x;
      ++index;
      edgePositions[index] = edgePositions[index + topEdgeLength] = p2.y;
      ++index;
      edgePositions[index] = edgePositions[index + topEdgeLength] = p2.z;
      ++index;

      if (hasTexcoords) {
        t1 = texcoords[i];
        t2 = texcoords[(i + 1) % length];
        edgeTexcoords[textureIndex] = edgeTexcoords[
          textureIndex + topEdgeTexcoordLength
        ] = t1.x;
        ++textureIndex;
        edgeTexcoords[textureIndex] = edgeTexcoords[
          textureIndex + topEdgeTexcoordLength
        ] = t1.y;
        ++textureIndex;
        edgeTexcoords[textureIndex] = edgeTexcoords[
          textureIndex + topEdgeTexcoordLength
        ] = t2.x;
        ++textureIndex;
        edgeTexcoords[textureIndex] = edgeTexcoords[
          textureIndex + topEdgeTexcoordLength
        ] = t2.y;
        ++textureIndex;
      }
    }
  }

  length = edgePositions.length;
  const indices = IndexDatatype.createTypedArray(
    length / 3,
    length - positions.length * 6,
  );
  let edgeIndex = 0;
  length /= 6;

  for (i = 0; i < length; i++) {
    const UL = i;
    const UR = UL + 1;
    const LL = UL + length;
    const LR = LL + 1;

    p1 = Cartesian3.fromArray(edgePositions, UL * 3, p1Scratch);
    p2 = Cartesian3.fromArray(edgePositions, UR * 3, p2Scratch);
    if (
      Cartesian3.equalsEpsilon(
        p1,
        p2,
        CesiumMath.EPSILON10,
        CesiumMath.EPSILON10,
      )
    ) {
      //skip corner
      continue;
    }

    indices[edgeIndex++] = UL;
    indices[edgeIndex++] = LL;
    indices[edgeIndex++] = UR;
    indices[edgeIndex++] = UR;
    indices[edgeIndex++] = LL;
    indices[edgeIndex++] = LR;
  }

  const geometryOptions = {
    attributes: new GeometryAttributes({
      position: new GeometryAttribute({
        componentDatatype: ComponentDatatype.DOUBLE,
        componentsPerAttribute: 3,
        values: edgePositions,
      }),
    }),
    indices: indices,
    primitiveType: PrimitiveType.TRIANGLES,
  };

  if (hasTexcoords) {
    geometryOptions.attributes.st = new GeometryAttribute({
      componentDatatype: ComponentDatatype.FLOAT,
      componentsPerAttribute: 2,
      values: edgeTexcoords,
    });
  }

  const geometry = new Geometry(geometryOptions);

  return geometry;
};
export default PolygonGeometryLibrary;
