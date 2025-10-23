import AxisAlignedBoundingBox from "./AxisAlignedBoundingBox.js";
import Cartesian3 from "./Cartesian3.js";
import Check from "./Check.js";
import defined from "./defined.js";
import IntersectionTests from "./IntersectionTests.js";
import Matrix4 from "./Matrix4.js";
import Ray from "./Ray.js";

/**
 * Create an octree object for the main thread for testing intersection
 * @param octree The octree created used {@link OctreeTrianglePicking.createOctree}
 * @param triangleVerticesCallback A function which calculates the Cartesian3 positions of a given triangle index
 * @alias OctreeTrianglePicking
 * @constructor
 * @private
 */
function OctreeTrianglePicking(octree, triangleVerticesCallback) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("octree.inverseTransform", octree.inverseTransform);
  Check.typeOf.func("triangleVerticesCallback", triangleVerticesCallback);
  //>>includeEnd('debug');

  this._inverseTransform = Matrix4.unpack(octree.inverseTransform);
  this._nodes = octree.nodes;
  this._transform = Matrix4.unpack(octree.transform);
  this._triangleVerticesCallback = triangleVerticesCallback;
}

const scratchTransformedRay = new Ray();

const scratchV0 = new Cartesian3();
const scratchV1 = new Cartesian3();
const scratchV2 = new Cartesian3();

/**
 * Ray intersection test
 * @param {Ray} ray
 * @param {Boolean} cullBackFaces
 * @returns {Cartesian3} result
 */
OctreeTrianglePicking.prototype.rayIntersect = function (ray, cullBackFaces) {
  const invTransform = this._inverseTransform;

  const transformedRay = scratchTransformedRay;
  transformedRay.origin = Matrix4.multiplyByPoint(
    invTransform,
    ray.origin,
    transformedRay.origin,
  );
  transformedRay.direction = Matrix4.multiplyByPointAsVector(
    invTransform,
    ray.direction,
    transformedRay.direction,
  );

  return rayIntersectOctree(
    this._nodes[0],
    ray,
    transformedRay,
    this._triangleVerticesCallback,
    cullBackFaces,
  );
};

/**
 * Create an in-memory octree from a list of packed triangle AABBs. Designed to be sent across a web worker thread
 * without a huge amount of serialization.
 * @param {Float32Array} triangleAABBs The packed array of triangles AABBs to add to the octree
 * @param {Matrix4} inverseTransform
 * @param {Matrix4} transform
 * @param {OrientedBoundingBox} obb
 */
OctreeTrianglePicking.createOctree = function (
  triangleAABBs,
  inverseTransform,
  transform,
  obb,
) {
  // the nodes tree is not packed into a buffer, but it could be
  // it doesn't seem to be too bad transferring it using post message, but surely there a serialization cost
  // would need to test whether it's faster to pack and unpack the nodes into a flat buffer or just serialize and deserialize as JSON
  const nodes = createOctree(triangleAABBs);
  return {
    triangleAABBs: triangleAABBs,
    nodes: nodes,
    inverseTransform: Matrix4.pack(inverseTransform, [], 0),
    transform: transform,
    obb: obb,
  };
};

const invalidIntersection = Number.MAX_VALUE;

/**
 * @param {Ray} ray
 * @param {Cartesian3} v0
 * @param {Cartesian3} v1
 * @param {Cartesian3} v2
 * @param {Boolean} cullBackFaces
 * @returns {Number} t
 * @private
 */
function rayTriangleIntersect(ray, v0, v1, v2, cullBackFaces) {
  const t = IntersectionTests.rayTriangleParametric(
    ray,
    v0,
    v1,
    v2,
    cullBackFaces,
  );
  const valid = defined(t) && t >= 0.0;
  return valid ? t : invalidIntersection;
}

const scratchAABBMin = new Cartesian3();
const scratchAABBMax = new Cartesian3();
const scratchNodeAABB = new AxisAlignedBoundingBox();
const scratchTriangleAABB = new AxisAlignedBoundingBox();

/**
 *
 * @param level the layer of the octree we want (0=root node, 1=first layer, etc.)
 * @param x coordinate within the layer
 * @param y coordinate within the layer
 * @param z coordinate within the layer
 * @returns {@link AxisAlignedBoundingBox}
 */
function createAABBFromOctreeLocation(level, x, y, z) {
  const sizeAtLevel = 1.0 / Math.pow(2, level);

  const aabbMin = Cartesian3.fromElements(
    x * sizeAtLevel - 0.5,
    y * sizeAtLevel - 0.5,
    z * sizeAtLevel - 0.5,
    scratchAABBMin,
  );

  const aabbMax = Cartesian3.fromElements(
    (x + 1) * sizeAtLevel - 0.5,
    (y + 1) * sizeAtLevel - 0.5,
    (z + 1) * sizeAtLevel - 0.5,
    scratchAABBMax,
  );

  return AxisAlignedBoundingBox.fromCorners(aabbMin, aabbMax, scratchNodeAABB);
}

/**
 * @param {Float32Array} triangleAABBs packed array of triangle AABBs
 * @param {Number} triangleIdx starting index of the triangle corners in the array
 * @returns {AxisAlignedBoundingBox}
 */
function createAABBFromTriangle(triangleAABBs, triangleIdx) {
  return AxisAlignedBoundingBox.fromCorners(
    Cartesian3.fromElements(
      triangleAABBs[triangleIdx * 6],
      triangleAABBs[triangleIdx * 6 + 2],
      triangleAABBs[triangleIdx * 6 + 4],
      scratchAABBMin,
    ),
    Cartesian3.fromElements(
      triangleAABBs[triangleIdx * 6 + 1],
      triangleAABBs[triangleIdx * 6 + 3],
      triangleAABBs[triangleIdx * 6 + 5],
      scratchAABBMax,
    ),
    scratchTriangleAABB,
  );
}

/**
 * Represents a node in the octree
 */
function createNode(x, y, z, level) {
  return {
    level: level,
    x: x,
    y: y,
    z: z,
    triangles: [],
    children: [],
  };
}

function doesRayIntersectAABB(ray, aabb) {
  const tx = getRayIntervalForAABB(
    ray.origin.x,
    ray.direction.x,
    aabb.minimum.x,
    aabb.maximum.x,
  );
  const ty = getRayIntervalForAABB(
    ray.origin.y,
    ray.direction.y,
    aabb.minimum.y,
    aabb.maximum.y,
  );
  const tz = getRayIntervalForAABB(
    ray.origin.z,
    ray.direction.z,
    aabb.minimum.z,
    aabb.maximum.z,
  );

  let tMin = tx.min > ty.min ? tx.min : ty.min; //Get Greatest Min
  let tMax = tx.max < ty.max ? tx.max : ty.max; //Get Smallest Max

  if (tx.min > ty.max || ty.min > tx.max) {
    return { intersection: false, tMin: tMin, tMax: tMax };
  }
  if (tMin > tz.max || tz.min > tMax) {
    return { intersection: false, tMin: tMin, tMax: tMax };
  }
  if (tz.min > tMin) {
    tMin = tz.min;
  }
  if (tz.max < tMax) {
    tMax = tz.max;
  }

  return { intersection: true, tMin: tMin, tMax: tMax };
}

function getRayIntervalForAABB(rayOrigin, rayDirection, min, max) {
  let tMin = (min - rayOrigin) / rayDirection;
  let tMax = (max - rayOrigin) / rayDirection;
  if (tMax < tMin) {
    const tmp = tMax;
    tMax = tMin;
    tMin = tmp;
  }
  return { min: tMin, max: tMax };
}

function getClosestTriangleInNode(
  ray,
  node,
  cullBackFaces,
  triangleVerticesCallback,
) {
  let result = Number.MAX_VALUE;
  for (let i = 0; i < (node.intersectingTriangles || []).length; i++) {
    const triIndex = node.intersectingTriangles[i];
    triangleVerticesCallback(triIndex, scratchV0, scratchV1, scratchV2);
    const triT = rayTriangleIntersect(
      ray,
      scratchV0,
      scratchV1,
      scratchV2,
      cullBackFaces,
    );

    if (triT !== invalidIntersection && triT < result) {
      result = triT;
    }
  }
  return result;
}

function rayIntersectOctree(
  node,
  ray,
  transformedRay,
  triangleVerticesCallback,
  cullBackFaces,
) {
  // from here: http://publications.lib.chalmers.se/records/fulltext/250170/250170.pdf
  // find all the nodes which intersect the ray

  let queue = [node];
  const intersections = [];
  while (queue.length) {
    const n = queue.pop();
    const aabb = createAABBFromOctreeLocation(n.level, n.x, n.y, n.z);
    const intersection = doesRayIntersectAABB(transformedRay, aabb);
    if (intersection.intersection) {
      const isLeaf = !n.children.length;
      if (isLeaf) {
        intersections.push({
          node: n,
          tMin: intersection.tMin,
          tMax: intersection.tMax,
        });
      } else {
        queue = queue.concat(n.children);
      }
    }
  }

  // sort each intersection node by tMin ascending
  const sortedTests = intersections.sort(function (a, b) {
    return a.tMin - b.tMin;
  });

  let minT = Number.MAX_VALUE;
  // for each intersected node - test every triangle which falls in that node
  for (let i = 0; i < sortedTests.length; i++) {
    const test = sortedTests[i];
    const intersectionResult = getClosestTriangleInNode(
      ray,
      test.node,
      cullBackFaces,
      triangleVerticesCallback,
    );
    minT = Math.min(intersectionResult, minT);
    if (minT !== invalidIntersection) {
      break;
    }
  }

  if (minT !== invalidIntersection) {
    return Ray.getPoint(ray, minT);
  }

  return undefined;
}

/**
 * Checks if A and B intersect
 * @param aMinX
 * @param aMaxX
 * @param aMinY
 * @param aMaxY
 * @param aMinZ
 * @param aMaxZ
 * @param bMinX
 * @param bMaxX
 * @param bMinY
 * @param bMaxY
 * @param bMinZ
 * @param bMaxZ
 * @returns {boolean}
 */

function createOctree(triangleAABBs) {
  const rootNode = createNode(0, 0, 0, 0);
  const nodes = [rootNode];
  const triangleCount = triangleAABBs.length / 6;
  // We build a more spread out octree for smaller tiles because it'll be quicker
  const maxLevels = 2;

  // We optimize adding triangles into the octree by first checking if the previously used AABB fully
  // contains the next triangle, rather than searching from the root node again. This is a good optimization for heightmap
  // terrain where each triangle is usually very small (relative to octree size) and the triangles are in-order.
  // For example:
  //   * We insert triangle A into the octree.
  //     it may be inserted into 1 or more nodes if it crosses a boundary,
  //     but we'll keep track of the last node we inserted it into
  //   * When we insert triangle B
  //     we first check if it's fully contained within the last node that triangle A was also added to,
  //     if it is, we insert it straight there and bail from searching the whole octree again
  let lastMatch;
  for (let x = 0; x < triangleCount; x++) {
    if (lastMatch) {
      const isTriangleContainedWithinLastMatchedNode = doesNodeContainTriangle(
        lastMatch.level,
        lastMatch.x,
        lastMatch.y,
        lastMatch.z,
        triangleAABBs,
        x,
      );
      if (isTriangleContainedWithinLastMatchedNode) {
        lastMatch.node.intersectingTriangles.push(x);
        continue;
      } else {
        lastMatch = null;
      }
    }
    lastMatch = nodeAddTriangle(
      maxLevels,
      rootNode,
      0,
      0,
      0,
      0,
      x,
      triangleAABBs,
    );
  }
  return nodes;
}

function doesNodeContainTriangle(level, x, y, z, triangleAABBs, triangleIdx) {
  const nodeAABB = createAABBFromOctreeLocation(level, x, y, z);
  const triangleAABB = createAABBFromTriangle(triangleAABBs, triangleIdx);
  return nodeAABB.containsAxisAlignedBoundingBox(triangleAABB);
}

function nodeAddTriangle(
  maxLevels,
  node,
  level,
  x,
  y,
  z,
  triangleIdx,
  triangles,
) {
  const nodeAABB = createAABBFromOctreeLocation(level, x, y, z);
  const triangleAABB = createAABBFromTriangle(triangles, triangleIdx);
  const aabbsIntersect = nodeAABB.intersectAxisAlignedBoundingBox(triangleAABB);

  const isMaxLevel = level === maxLevels;

  if (aabbsIntersect && isMaxLevel) {
    // We've found a match and the deepest layer of the octree, insert our triangle and return information about the match
    node.intersectingTriangles = node.intersectingTriangles || [];
    node.intersectingTriangles.push(triangleIdx);
    return { level: level, x: x, y: y, z: z, node: node };
  }

  if (!aabbsIntersect) {
    // No match, no need to search any deeper
    return null;
  }

  if (isMaxLevel) {
    // Deepest layer with no match
    return null;
  }

  // recurse into each child trying to insert the triangle
  let childMatchCount = 0;
  let lastChildMatch = null;
  for (let childIdx = 0; childIdx < 8; childIdx++) {
    // Use bitwise operations to get child x,y,z from child index
    const childX = x * 2 + (childIdx & 1);
    const childY = y * 2 + ((childIdx >> 1) & 1);
    const childZ = z * 2 + ((childIdx >> 2) & 1);

    const childNode = createNode(childX, childY, childZ, level + 1);
    node.children.push(childNode);

    const match = nodeAddTriangle(
      maxLevels,
      childNode,
      level + 1,
      childX,
      childY,
      childZ,
      triangleIdx,
      triangles,
    );

    if (match) {
      childMatchCount += 1;
      // Of all 8 children nodes, take the one (or last one) that intersects
      // with the triangle. That's our best bet for full containment of the *next* triangle to add,
      // assuming the triangles are in some kind of order (as they are for heightmap terrain).
      lastChildMatch = match;
    }
  }

  return childMatchCount > 0 ? lastChildMatch : null;
}

export default OctreeTrianglePicking;
