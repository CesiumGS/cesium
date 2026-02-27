import Cartesian2 from "./Cartesian2.js";
import Cartesian3 from "./Cartesian3.js";
import Cartographic from "./Cartographic.js";
import Check from "./Check.js";
import ConvexHull2D from "./ConvexHull2D.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import Ellipsoid from "./Ellipsoid.js";
import PolygonHierarchy from "./PolygonHierarchy.js";

/**
 * Extracts 2D polygon boundaries from 3D triangle meshes by projecting
 * triangles onto the ellipsoid surface and computing outer boundaries
 * and convex hulls.
 *
 * @namespace PolygonBoundaryExtractor
 *
 * @private
 */
const PolygonBoundaryExtractor = {};

/**
 * Minimum projected triangle area in radians squared below which
 * a triangle is considered degenerate (e.g. a vertical wall) and is skipped.
 *
 * @type {number}
 * @constant
 * @default 1e-15
 * @private
 */
const DEFAULT_MIN_TRIANGLE_AREA = 1e-15;

/**
 * Creates a canonical edge key from two vertex indices, ensuring the
 * smaller index comes first for consistent hashing.
 *
 * @param {number} i0 First vertex index.
 * @param {number} i1 Second vertex index.
 * @returns {string} A string key "min,max".
 * @private
 */
function makeEdgeKey(i0, i1) {
  return i0 < i1 ? `${i0},${i1}` : `${i1},${i0}`;
}

/**
 * Computes the signed area of a 2D triangle given by three Cartographic
 * positions (using longitude and latitude as 2D coordinates).
 *
 * @param {Cartographic} a First vertex.
 * @param {Cartographic} b Second vertex.
 * @param {Cartographic} c Third vertex.
 * @returns {number} The signed area (positive = CCW).
 * @private
 */
function triangleArea2D(a, b, c) {
  return (
    0.5 *
    ((b.longitude - a.longitude) * (c.latitude - a.latitude) -
      (c.longitude - a.longitude) * (b.latitude - a.latitude))
  );
}

/**
 * Extracts boundary edges from a set of triangles by finding edges
 * that appear an odd number of times (boundary edges appear once,
 * interior edges appear twice and cancel out).
 *
 * @param {number[]} indices Index array for the triangle mesh (length must be a multiple of 3).
 * @param {Cartographic[]} cartographics Cartographic position for each vertex.
 * @param {number} minTriangleArea Minimum projected 2D triangle area to consider.
 * @returns {Map<string, number[]>} Map from edge key to [i0, i1] vertex index pair for boundary edges.
 * @private
 */
function extractBoundaryEdges(indices, cartographics, minTriangleArea) {
  const edgeCounts = new Map();

  for (let t = 0; t < indices.length; t += 3) {
    const i0 = indices[t];
    const i1 = indices[t + 1];
    const i2 = indices[t + 2];

    // Skip degenerate triangles (near-vertical surfaces project to zero area)
    const area = Math.abs(
      triangleArea2D(cartographics[i0], cartographics[i1], cartographics[i2]),
    );
    if (area < minTriangleArea) {
      continue;
    }

    // Toggle each edge: if it exists, remove it; if not, add it.
    const edges = [
      makeEdgeKey(i0, i1),
      makeEdgeKey(i1, i2),
      makeEdgeKey(i2, i0),
    ];
    const edgeVertices = [
      [i0, i1],
      [i1, i2],
      [i2, i0],
    ];

    for (let e = 0; e < 3; e++) {
      const key = edges[e];
      if (edgeCounts.has(key)) {
        edgeCounts.delete(key);
      } else {
        edgeCounts.set(key, edgeVertices[e]);
      }
    }
  }

  return edgeCounts;
}

/**
 * Chains boundary edges into ordered rings. Multiple disconnected rings
 * can be produced (e.g. for features with holes or separate parts).
 *
 * @param {Map<string, number[]>} boundaryEdges Map from edge key to [i0, i1].
 * @returns {number[][]} An array of rings, where each ring is an ordered array of vertex indices.
 * @private
 */
function chainEdgesIntoRings(boundaryEdges) {
  // Build adjacency: vertex -> list of connected vertices
  const adjacency = new Map();
  for (const [, edge] of boundaryEdges) {
    const [a, b] = edge;
    if (!adjacency.has(a)) {
      adjacency.set(a, []);
    }
    if (!adjacency.has(b)) {
      adjacency.set(b, []);
    }
    adjacency.get(a).push(b);
    adjacency.get(b).push(a);
  }

  const visited = new Set();
  const rings = [];

  for (const [startVertex] of adjacency) {
    if (visited.has(startVertex)) {
      continue;
    }

    const ring = [];
    let current = startVertex;
    let prev = -1;

    // Walk the chain until we return to the start vertex or run out of neighbors
    while (!visited.has(current)) {
      visited.add(current);
      ring.push(current);

      const neighbors = adjacency.get(current);
      if (!defined(neighbors) || neighbors.length === 0) {
        break;
      }

      // Pick a neighbor that isn't where we came from
      let next = -1;
      for (let i = 0; i < neighbors.length; i++) {
        if (neighbors[i] !== prev) {
          next = neighbors[i];
          break;
        }
      }

      if (next === -1 || next === startVertex) {
        break;
      }

      prev = current;
      current = next;
    }

    if (ring.length >= 3) {
      rings.push(ring);
    }
  }

  return rings;
}

/**
 * Determines which rings are outer boundaries and which are holes based
 * on their winding order (signed area). CCW rings are outer, CW rings are holes.
 *
 * @param {number[][]} rings Array of rings (vertex index arrays).
 * @param {Cartographic[]} cartographics Position for each vertex.
 * @returns {{ outer: number[][], holes: number[][] }} Categorized rings.
 * @private
 */
function categorizeRings(rings, cartographics) {
  const outer = [];
  const holes = [];

  for (let r = 0; r < rings.length; r++) {
    const ring = rings[r];
    // Compute signed area using the shoelace formula
    let signedArea = 0.0;
    const n = ring.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const ci = cartographics[ring[i]];
      const cj = cartographics[ring[j]];
      signedArea += ci.longitude * cj.latitude - cj.longitude * ci.latitude;
    }
    signedArea *= 0.5;

    if (signedArea >= 0) {
      outer.push(ring);
    } else {
      holes.push(ring);
    }
  }

  return { outer, holes };
}

/**
 * Converts a ring (array of vertex indices) to an array of Cartesian3 positions
 * on the ellipsoid surface (height = 0).
 *
 * @param {number[]} ring Array of vertex indices.
 * @param {Cartographic[]} cartographics Cartographic position for each vertex.
 * @param {Ellipsoid} ellipsoid The ellipsoid.
 * @returns {Cartesian3[]} Array of surface Cartesian3 positions.
 * @private
 */
function ringToCartesian3Array(ring, cartographics, ellipsoid) {
  const positions = new Array(ring.length);
  for (let i = 0; i < ring.length; i++) {
    const carto = cartographics[ring[i]];
    positions[i] = Cartesian3.fromRadians(
      carto.longitude,
      carto.latitude,
      0.0,
      ellipsoid,
    );
  }
  return positions;
}

const cartographicScratch = new Cartographic();

/**
 * Extracts 2D polygon boundaries from a triangle mesh by projecting the
 * triangles onto the ellipsoid surface and finding boundary edges (edges
 * that appear in only one triangle). The boundary edges are then chained
 * into ordered polygon rings.
 *
 * This method produces accurate footprints that respect the actual geometry
 * shape, including concave shapes and holes.
 *
 * @param {Cartesian3[]} positions An array of vertex positions in ECEF (world) coordinates.
 * @param {number[]} indices Triangle index array. Length must be a multiple of 3.
 * @param {object} [options] Options object.
 * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.default] The ellipsoid for geographic projection.
 * @param {number} [options.minTriangleArea=1e-15] Minimum projected 2D triangle area (in radians squared)
 *   below which a triangle is considered degenerate and skipped.
 * @returns {PolygonHierarchy|undefined} A {@link PolygonHierarchy} with the outer boundary and holes,
 *   or `undefined` if no valid boundary could be extracted.
 *
 * @exception {DeveloperError} positions is required.
 * @exception {DeveloperError} indices is required.
 * @exception {DeveloperError} indices length must be a multiple of 3.
 *
 * @example
 * // Extract footprint from a triangle mesh
 * const hierarchy = Cesium.PolygonBoundaryExtractor.fromTriangleMesh(
 *   positions, indices
 * );
 * if (Cesium.defined(hierarchy)) {
 *   viewer.entities.add({
 *     polygon: {
 *       hierarchy: hierarchy,
 *       heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
 *       material: Cesium.Color.BLUE.withAlpha(0.5),
 *     },
 *   });
 * }
 */
PolygonBoundaryExtractor.fromTriangleMesh = function (
  positions,
  indices,
  options,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("positions", positions);
  Check.defined("indices", indices);
  if (indices.length % 3 !== 0) {
    throw new DeveloperError("indices length must be a multiple of 3.");
  }
  //>>includeEnd('debug');

  options = defined(options) ? options : {};
  const ellipsoid = defined(options.ellipsoid)
    ? options.ellipsoid
    : Ellipsoid.default;
  const minTriangleArea = defined(options.minTriangleArea)
    ? options.minTriangleArea
    : DEFAULT_MIN_TRIANGLE_AREA;

  if (positions.length === 0 || indices.length === 0) {
    return undefined;
  }

  // Project all positions to cartographic (lon/lat)
  const cartographics = new Array(positions.length);
  for (let i = 0; i < positions.length; i++) {
    const carto = Cartographic.fromCartesian(
      positions[i],
      ellipsoid,
      cartographicScratch,
    );
    if (!defined(carto)) {
      // Position at the center of the ellipsoid — skip
      cartographics[i] = new Cartographic(0, 0, 0);
    } else {
      cartographics[i] = Cartographic.clone(carto);
    }
  }

  // Extract boundary edges
  const boundaryEdges = extractBoundaryEdges(
    indices,
    cartographics,
    minTriangleArea,
  );

  if (boundaryEdges.size === 0) {
    return undefined;
  }

  // Chain edges into rings
  const rings = chainEdgesIntoRings(boundaryEdges);

  if (rings.length === 0) {
    return undefined;
  }

  // Categorize rings into outer boundaries and holes
  const { outer, holes } = categorizeRings(rings, cartographics);

  if (outer.length === 0) {
    // All rings are holes — pick the largest as outer
    if (holes.length === 0) {
      return undefined;
    }
    // Reverse the winding of the largest ring to make it outer
    holes[0].reverse();
    outer.push(holes.shift());
  }

  // Use the largest outer ring as the main boundary
  let largestOuter = outer[0];
  let largestArea = 0;
  for (let i = 0; i < outer.length; i++) {
    let area = 0;
    const ring = outer[i];
    const n = ring.length;
    for (let j = 0; j < n; j++) {
      const k = (j + 1) % n;
      const cj = cartographics[ring[j]];
      const ck = cartographics[ring[k]];
      area += cj.longitude * ck.latitude - ck.longitude * cj.latitude;
    }
    area = Math.abs(area) * 0.5;
    if (area > largestArea) {
      largestArea = area;
      largestOuter = ring;
    }
  }

  // Convert outer ring to Cartesian3
  const outerPositions = ringToCartesian3Array(
    largestOuter,
    cartographics,
    ellipsoid,
  );

  // Convert hole rings to PolygonHierarchy
  const holeHierarchies = [];
  for (let i = 0; i < holes.length; i++) {
    const holePositions = ringToCartesian3Array(
      holes[i],
      cartographics,
      ellipsoid,
    );
    holeHierarchies.push(new PolygonHierarchy(holePositions));
  }

  return new PolygonHierarchy(outerPositions, holeHierarchies);
};

/**
 * Extracts a 2D convex hull polygon from an array of 3D positions
 * by projecting them onto the ellipsoid surface and computing the
 * convex hull in geographic (longitude/latitude) space.
 *
 * This is faster and simpler than {@link PolygonBoundaryExtractor.fromTriangleMesh}
 * but produces only a convex approximation, which may not accurately
 * represent L-shaped or concave features.
 *
 * @param {Cartesian3[]} positions An array of vertex positions in ECEF (world) coordinates.
 * @param {object} [options] Options object.
 * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.default] The ellipsoid for geographic projection.
 * @returns {PolygonHierarchy|undefined} A {@link PolygonHierarchy} with the convex hull boundary,
 *   or `undefined` if fewer than 3 unique positions are provided.
 *
 * @exception {DeveloperError} positions is required.
 * @exception {DeveloperError} positions must contain at least 3 points.
 *
 * @example
 * const hierarchy = Cesium.PolygonBoundaryExtractor.convexHullFromPositions(positions);
 */
PolygonBoundaryExtractor.convexHullFromPositions = function (
  positions,
  options,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("positions", positions);
  Check.typeOf.number.greaterThanOrEquals("positions.length", positions.length, 3);
  //>>includeEnd('debug');

  options = defined(options) ? options : {};
  const ellipsoid = defined(options.ellipsoid)
    ? options.ellipsoid
    : Ellipsoid.default;

  // Project to 2D (lon, lat)
  const points2D = new Array(positions.length);
  for (let i = 0; i < positions.length; i++) {
    const carto = Cartographic.fromCartesian(
      positions[i],
      ellipsoid,
      cartographicScratch,
    );
    if (!defined(carto)) {
      points2D[i] = new Cartesian2(0, 0);
    } else {
      points2D[i] = new Cartesian2(carto.longitude, carto.latitude);
    }
  }

  // Compute convex hull in 2D
  const hull2D = ConvexHull2D.compute(points2D);

  if (hull2D.length < 3) {
    return undefined;
  }

  // Convert back to Cartesian3 on the ellipsoid surface (height = 0)
  const hullPositions = new Array(hull2D.length);
  for (let i = 0; i < hull2D.length; i++) {
    hullPositions[i] = Cartesian3.fromRadians(
      hull2D[i].x,
      hull2D[i].y,
      0.0,
      ellipsoid,
    );
  }

  return new PolygonHierarchy(hullPositions);
};

/**
 * Extracts footprint boundaries from a triangle mesh that is grouped by
 * feature IDs. Returns a map from feature ID to {@link PolygonHierarchy}.
 *
 * @param {Cartesian3[]} positions An array of vertex positions in ECEF coordinates.
 * @param {number[]} indices Triangle index array. Length must be a multiple of 3.
 * @param {number[]} featureIds An array of feature IDs, one per vertex.
 * @param {object} [options] Options passed through to {@link PolygonBoundaryExtractor.fromTriangleMesh}.
 * @returns {Map<number, PolygonHierarchy>} A map from feature ID to polygon hierarchy.
 *
 * @exception {DeveloperError} positions is required.
 * @exception {DeveloperError} indices is required.
 * @exception {DeveloperError} featureIds is required.
 */
PolygonBoundaryExtractor.fromTriangleMeshByFeature = function (
  positions,
  indices,
  featureIds,
  options,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("positions", positions);
  Check.defined("indices", indices);
  Check.defined("featureIds", featureIds);
  //>>includeEnd('debug');

  // Group triangle indices by feature ID
  // For each triangle, use the feature ID of the first vertex
  const featureTriangles = new Map();

  for (let t = 0; t < indices.length; t += 3) {
    const i0 = indices[t];
    const fid = featureIds[i0];

    if (!featureTriangles.has(fid)) {
      featureTriangles.set(fid, []);
    }
    featureTriangles.get(fid).push(t);
  }

  const result = new Map();

  for (const [fid, triangleOffsets] of featureTriangles) {
    // Collect unique vertex indices for this feature
    const vertexSet = new Set();
    const featureIndices = [];

    for (let t = 0; t < triangleOffsets.length; t++) {
      const offset = triangleOffsets[t];
      vertexSet.add(indices[offset]);
      vertexSet.add(indices[offset + 1]);
      vertexSet.add(indices[offset + 2]);
    }

    // Create a remapping: old vertex index -> new compact index
    const oldToNew = new Map();
    const featurePositions = [];
    let newIndex = 0;
    for (const oldIndex of vertexSet) {
      oldToNew.set(oldIndex, newIndex);
      featurePositions.push(positions[oldIndex]);
      newIndex++;
    }

    // Remap indices
    for (let t = 0; t < triangleOffsets.length; t++) {
      const offset = triangleOffsets[t];
      featureIndices.push(oldToNew.get(indices[offset]));
      featureIndices.push(oldToNew.get(indices[offset + 1]));
      featureIndices.push(oldToNew.get(indices[offset + 2]));
    }

    const hierarchy = PolygonBoundaryExtractor.fromTriangleMesh(
      featurePositions,
      featureIndices,
      options,
    );

    if (defined(hierarchy)) {
      result.set(fid, hierarchy);
    }
  }

  return result;
};

export default PolygonBoundaryExtractor;
