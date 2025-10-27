import AxisAlignedBoundingBox from "./AxisAlignedBoundingBox.js";
import Cartesian3 from "./Cartesian3.js";
import defined from "./defined.js";
import IntersectionTests from "./IntersectionTests.js";
import Matrix4 from "./Matrix4.js";
import Ray from "./Ray.js";
import OrientedBoundingBox from "./OrientedBoundingBox.js";

/**
 * Create an octree object for the main thread for testing intersection
 * @alias OctreeTrianglePicking
 * @constructor
 * @private
 */
function OctreeTrianglePicking(
  vertices,
  indices,
  encoding,
  orientedBoundingBox,
) {
  this._vertices = vertices;
  this._indices = indices;
  this._encoding = encoding;
  this._transform =
    OrientedBoundingBox.computeTransformation(orientedBoundingBox);
  this._inverseTransform = Matrix4.inverse(this._transform, new Matrix4());
  this._nodes = undefined;
}

const scratchTransformedRay = new Ray();
const scratchTrianglePoints = [
  new Cartesian3(),
  new Cartesian3(),
  new Cartesian3(),
];

/**
 * Ray intersection test
 * @param {Ray} ray
 * @param {Boolean} cullBackFaces
 * @returns {Cartesian3} result
 */
OctreeTrianglePicking.prototype.rayIntersect = function (ray, cullBackFaces) {
  // Lazily create the octree on first use
  if (!defined(this._nodes)) {
    this._nodes = createOctree(this);
  }

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

  return rayIntersectOctree(this, ray, transformedRay, cullBackFaces);
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
 * @param {} node
 * @returns {@link AxisAlignedBoundingBox}
 */
function createAABBFromOctreeNode(node) {
  const sizeAtLevel = 1.0 / Math.pow(2, node.level);

  const aabbMin = Cartesian3.fromElements(
    node.x * sizeAtLevel - 0.5,
    node.y * sizeAtLevel - 0.5,
    node.z * sizeAtLevel - 0.5,
    scratchAABBMin,
  );

  const aabbMax = Cartesian3.fromElements(
    (node.x + 1) * sizeAtLevel - 0.5,
    (node.y + 1) * sizeAtLevel - 0.5,
    (node.z + 1) * sizeAtLevel - 0.5,
    scratchAABBMax,
  );

  return AxisAlignedBoundingBox.fromCorners(aabbMin, aabbMax, scratchNodeAABB);
}

/**
 * @param {Number} triangleIdx starting index of the triangle corners in the array
 * @returns {AxisAlignedBoundingBox}
 */
function createAABBFromTriangle(octreeTrianglePicking, triangleIdx) {
  const encoding = octreeTrianglePicking._encoding;
  const vertices = octreeTrianglePicking._vertices;
  const indices = octreeTrianglePicking._indices;
  const inverseTransform = octreeTrianglePicking._inverseTransform;

  const v0 = encoding.getExaggeratedPosition(
    vertices,
    indices[3 * triangleIdx],
    scratchTrianglePoints[0],
  );
  const v1 = encoding.getExaggeratedPosition(
    vertices,
    indices[3 * triangleIdx + 1],
    scratchTrianglePoints[1],
  );
  const v2 = encoding.getExaggeratedPosition(
    vertices,
    indices[3 * triangleIdx + 2],
    scratchTrianglePoints[2],
  );

  Matrix4.multiplyByPoint(inverseTransform, v0, v0);
  Matrix4.multiplyByPoint(inverseTransform, v1, v1);
  Matrix4.multiplyByPoint(inverseTransform, v2, v2);

  scratchTrianglePoints[0] = v0;
  scratchTrianglePoints[1] = v1;
  scratchTrianglePoints[2] = v2;
  return AxisAlignedBoundingBox.fromPoints(
    scratchTrianglePoints,
    scratchTriangleAABB,
  );
}

/**
 * Represents a node in the octree
 */
function getOrCreateNode(childIdx = 0, parentNode) {
  if (defined(parentNode) && defined(parentNode.children[childIdx])) {
    return parentNode.children[childIdx];
  }

  // Use bitwise operations to get child x,y,z from child index
  const x = parentNode ? parentNode.x : 0;
  const y = parentNode ? parentNode.y : 0;
  const z = parentNode ? parentNode.z : 0;
  const childX = x * 2 + (childIdx & 1);
  const childY = y * 2 + ((childIdx >> 1) & 1);
  const childZ = z * 2 + ((childIdx >> 2) & 1);

  const node = {
    level: defined(parentNode) ? parentNode.level + 1 : 0,
    x: childX,
    y: childY,
    z: childZ,
    intersectingTriangles: [],
    children: [],
  };

  if (defined(parentNode)) {
    parentNode.children.push(node);
  }

  return node;
}

const scratchIntersectionResult = { intersection: false, tMin: 0, tMax: 0 };

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

  const result = scratchIntersectionResult;
  result.tMin = tx.min > ty.min ? tx.min : ty.min; //Get Greatest Min
  result.tMax = tx.max < ty.max ? tx.max : ty.max; //Get Smallest Max
  result.intersection = false;

  if (tx.min > ty.max || ty.min > tx.max) {
    return result;
  }

  if (result.tMin > tz.max || tz.min > result.tMax) {
    return result;
  }

  if (tz.min > result.tMin) {
    result.tMin = tz.min;
  }
  if (tz.max < result.tMax) {
    result.tMax = tz.max;
  }

  result.intersection = true;
  return result;
}

const scratchRayInterval = { min: 0, max: 0 };
function getRayIntervalForAABB(rayOrigin, rayDirection, min, max) {
  const rayInterval = scratchRayInterval;
  rayInterval.min = (min - rayOrigin) / rayDirection;
  rayInterval.max = (max - rayOrigin) / rayDirection;
  if (rayInterval.max < rayInterval.min) {
    const tmp = rayInterval.max;
    rayInterval.max = rayInterval.min;
    rayInterval.min = tmp;
  }

  return rayInterval;
}

function getClosestTriangleInNode(
  octreeTrianglePicking,
  ray,
  node,
  cullBackFaces,
) {
  let result = Number.MAX_VALUE;
  const encoding = octreeTrianglePicking._encoding;
  const indices = octreeTrianglePicking._indices;
  const vertices = octreeTrianglePicking._vertices;

  for (let i = 0; i < (node.intersectingTriangles || []).length; i++) {
    const triIndex = node.intersectingTriangles[i];
    const v0 = encoding.getExaggeratedPosition(
      vertices,
      indices[3 * triIndex],
      scratchTrianglePoints[0],
    );
    const v1 = encoding.getExaggeratedPosition(
      vertices,
      indices[3 * triIndex + 1],
      scratchTrianglePoints[1],
    );
    const v2 = encoding.getExaggeratedPosition(
      vertices,
      indices[3 * triIndex + 2],
      scratchTrianglePoints[2],
    );

    const triT = rayTriangleIntersect(ray, v0, v1, v2, cullBackFaces);

    if (triT !== invalidIntersection && triT < result) {
      result = triT;
    }
  }
  return result;
}

function rayIntersectOctree(
  octreeTrianglePicking,
  ray,
  transformedRay,
  cullBackFaces,
) {
  // from here: http://publications.lib.chalmers.se/records/fulltext/250170/250170.pdf
  // find all the nodes which intersect the ray

  let queue = [octreeTrianglePicking._nodes[0]];
  const intersections = [];
  while (queue.length) {
    const n = queue.pop();
    const aabb = createAABBFromOctreeNode(n);
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
      octreeTrianglePicking,
      ray,
      test.node,
      cullBackFaces,
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

function createOctree(octreeTrianglePicking) {
  const rootNode = getOrCreateNode();
  const nodes = [rootNode];
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
  let lastMatchNode;
  const triangleCount = octreeTrianglePicking._indices.length / 3;
  for (let triIdx = 0; triIdx < triangleCount; triIdx++) {
    if (lastMatchNode) {
      const isTriangleContainedWithinLastMatchedNode = doesNodeContainTriangle(
        octreeTrianglePicking,
        lastMatchNode,
        triIdx,
      );
      if (isTriangleContainedWithinLastMatchedNode) {
        lastMatchNode.intersectingTriangles.push(triIdx);
        continue;
      } else {
        lastMatchNode = null;
      }
    }
    lastMatchNode = nodeAddTriangle(
      octreeTrianglePicking,
      maxLevels,
      rootNode,
      triIdx,
    );
  }
  return nodes;
}

function doesNodeContainTriangle(octreeTrianglePicking, node, triangleIdx) {
  const nodeAABB = createAABBFromOctreeNode(node);
  const triangleAABB = createAABBFromTriangle(
    octreeTrianglePicking,
    triangleIdx,
  );
  return nodeAABB.containsAxisAlignedBoundingBox(triangleAABB);
}

function nodeAddTriangle(octreeTrianglePicking, maxLevels, node, triangleIdx) {
  const nodeAABB = createAABBFromOctreeNode(node);
  const triangleAABB = createAABBFromTriangle(
    octreeTrianglePicking,
    triangleIdx,
  );
  const aabbsIntersect = nodeAABB.intersectAxisAlignedBoundingBox(triangleAABB);
  const isMaxLevel = node.level === maxLevels;

  if (aabbsIntersect && isMaxLevel) {
    // We've found a match and the deepest layer of the octree, insert our triangle and return information about the match
    node.intersectingTriangles = node.intersectingTriangles || [];
    node.intersectingTriangles.push(triangleIdx);
    return node;
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
    const childNode = getOrCreateNode(childIdx, node);

    const match = nodeAddTriangle(
      octreeTrianglePicking,
      maxLevels,
      childNode,
      triangleIdx,
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
