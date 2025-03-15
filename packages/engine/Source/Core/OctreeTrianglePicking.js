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
 * Create an in-memory octree from a list of packed triangles. Designed to be sent across a web worker thread
 * without a huge amount of serialization.
 * @param {Float32Array} triangles The packed array of triangles to add to the octree
 * @param {Matrix4} inverseTransform
 * @param {Matrix4} transform
 * @param {OrientedBoundingBox} obb
 */
OctreeTrianglePicking.createOctree = function (
  triangles,
  inverseTransform,
  transform,
  obb,
) {
  // the nodes tree is not packed into a buffer, but it could be
  // it doesn't seem to be too bad transferring it using post message, but surely there a serialization cost
  // would need to test whether it's faster to pack and unpack the nodes into a flat buffer or just serialize and deserialize as JSON
  const nodes = createOctree(triangles);
  return {
    triangles: triangles,
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

/**
 *
 * @param level the layer of the octree we want (0=root node, 1=first layer, etc.)
 * @param x coordinate within the layer
 * @param y coordinate within the layer
 * @param z coordinate within the layer
 * @returns {{aabbMinX: number, aabbMaxX: number, aabbCenterX: number, aabbMinY: number, aabbMaxY: number, aabbCenterY: number, aabbMinZ: number, aabbMaxZ: number, aabbCenterZ: number}}
 */
function createAABBFromOctreeLocation(level, x, y, z) {
  const sizeAtLevel = 1.0 / Math.pow(2, level);
  return {
    aabbMinX: x * sizeAtLevel - 0.5,
    aabbMaxX: (x + 1) * sizeAtLevel - 0.5,
    aabbCenterX: (x + 0.5) * sizeAtLevel - 0.5,
    aabbMinY: y * sizeAtLevel - 0.5,
    aabbMaxY: (y + 1) * sizeAtLevel - 0.5,
    aabbCenterY: (y + 0.5) * sizeAtLevel - 0.5,
    aabbMinZ: z * sizeAtLevel - 0.5,
    aabbMaxZ: (z + 1) * sizeAtLevel - 0.5,
    aabbCenterZ: (z + 0.5) * sizeAtLevel - 0.5,
  };
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
  };
}

function isRayIntersectAABB(ray, minX, minY, minZ, maxX, maxY, maxZ) {
  let tmp;
  /* X */
  let txMin = (minX - ray.origin.x) / ray.direction.x;
  let txMax = (maxX - ray.origin.x) / ray.direction.x;
  if (txMax < txMin) {
    tmp = txMax;
    txMax = txMin;
    txMin = tmp;
  }

  /* Y */
  let tyMin = (minY - ray.origin.y) / ray.direction.y;
  let tyMax = (maxY - ray.origin.y) / ray.direction.y;
  if (tyMax < tyMin) {
    tmp = tyMax;
    tyMax = tyMin;
    tyMin = tmp;
  }

  /* Z */
  let tzMin = (minZ - ray.origin.z) / ray.direction.z;
  let tzMax = (maxZ - ray.origin.z) / ray.direction.z;
  if (tzMax < tzMin) {
    tmp = tzMax;
    tzMax = tzMin;
    tzMin = tmp;
  }

  let tMin = txMin > tyMin ? txMin : tyMin; //Get Greatest Min
  let tMax = txMax < tyMax ? txMax : tyMax; //Get Smallest Max

  if (txMin > tyMax || tyMin > txMax) {
    return { intersection: false, tMin: tMin, tMax: tMax };
  }
  if (tMin > tzMax || tzMin > tMax) {
    return { intersection: false, tMin: tMin, tMax: tMax };
  }
  if (tzMin > tMin) {
    tMin = tzMin;
  }
  if (tzMax < tMax) {
    tMax = tzMax;
  }

  return { intersection: true, tMin: tMin, tMax: tMax };
}

function isNodeIntersection(
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
    const intersection = isRayIntersectAABB(
      transformedRay,
      aabb.aabbMinX,
      aabb.aabbMinY,
      aabb.aabbMinZ,
      aabb.aabbMaxX,
      aabb.aabbMaxY,
      aabb.aabbMaxZ,
    );
    if (intersection.intersection) {
      const isLeaf = !n.children;
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
  for (let ii = 0; ii < sortedTests.length; ii++) {
    const test = sortedTests[ii];
    const intersectionResult = isNodeIntersection(
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
function isAABBIntersects(
  aMinX,
  aMaxX,
  aMinY,
  aMaxY,
  aMinZ,
  aMaxZ,
  bMinX,
  bMaxX,
  bMinY,
  bMaxY,
  bMinZ,
  bMaxZ,
) {
  return (
    aMinX <= bMaxX &&
    aMaxX >= bMinX &&
    aMinY <= bMaxY &&
    aMaxY >= bMinY &&
    aMinZ <= bMaxZ &&
    aMaxZ >= bMinZ
  );
}

/**
 * Checks if A is contained with B
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
function isAABBContained(
  aMinX,
  aMaxX,
  aMinY,
  aMaxY,
  aMinZ,
  aMaxZ,
  bMinX,
  bMaxX,
  bMinY,
  bMaxY,
  bMinZ,
  bMaxZ,
) {
  return (
    aMinX >= bMinX &&
    aMaxX <= bMaxX &&
    aMinY >= bMinY &&
    aMaxY <= bMaxY &&
    aMinZ >= bMinZ &&
    aMaxZ <= bMaxZ
  );
}

function createOctree(triangles) {
  const rootNode = createNode(0, 0, 0, 0);
  const nodes = [rootNode];
  const triangleCount = triangles.length / 6;

  // we can build a more spread out octree
  //  for smaller tiles because it'll be quicker
  const maxLevels = 2;

  // we can optimize adding triangles into the octree by first checking if the previously used AABB fully
  // contains the next triangle, rather than searching from the root node again. This will be a good optimization for heightmap
  // terrain where each triangle is usually very small (relative to octree size) and the triangles are in-order.
  // for example:
  //   * we insert triangle A into the octree.
  //     it may be inserted into 1 or more nodes if it crosses a boundary,
  //     but we'll keep track of the last node we inserted it into
  //   * when we insert triangle B
  //     we first check if it's fully contained within the last node that triangle A was also added to,
  //     if it is, we insert it straight there and bail from searching the whole octree again
  let lastMatch;
  for (let x = 0; x < triangleCount; x++) {
    if (lastMatch) {
      const isTriangleContainedWithinLastMatchedNode = isNodeContainsTriangle(
        lastMatch.level,
        lastMatch.x,
        lastMatch.y,
        lastMatch.z,
        triangles,
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
      triangles,
      nodes,
    );
  }
  return nodes;
}

function isNodeContainsTriangle(level, x, y, z, triangles, triangleIdx) {
  const aabb = createAABBFromOctreeLocation(level, x, y, z);
  return isAABBContained(
    triangles[triangleIdx * 6], // triangle aabb min x
    triangles[triangleIdx * 6 + 1], // triangle aabb max x
    triangles[triangleIdx * 6 + 2], // triangle aabb min y
    triangles[triangleIdx * 6 + 3], // triangle aabb max y
    triangles[triangleIdx * 6 + 4], // triangle aabb min z
    triangles[triangleIdx * 6 + 5], // triangle aabb max z
    aabb.aabbMinX,
    aabb.aabbMaxX,
    aabb.aabbMinY,
    aabb.aabbMaxY,
    aabb.aabbMinZ,
    aabb.aabbMaxZ,
  );
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
  nodes,
) {
  const aabb = createAABBFromOctreeLocation(level, x, y, z);
  const isIntersection = isAABBIntersects(
    triangles[triangleIdx * 6], // triangle aabb min x
    triangles[triangleIdx * 6 + 1], // triangle aabb max x
    triangles[triangleIdx * 6 + 2], // triangle aabb min y
    triangles[triangleIdx * 6 + 3], // triangle aabb max y
    triangles[triangleIdx * 6 + 4], // triangle aabb min z
    triangles[triangleIdx * 6 + 5], // triangle aabb max z
    aabb.aabbMinX,
    aabb.aabbMaxX,
    aabb.aabbMinY,
    aabb.aabbMaxY,
    aabb.aabbMinZ,
    aabb.aabbMaxZ,
  );

  const isMaxLevel = level === maxLevels;

  if (isIntersection && isMaxLevel) {
    // we've fond a match and the deepest layer of the octree, insert our triangle and return information about the match
    node.intersectingTriangles = node.intersectingTriangles || [];
    node.intersectingTriangles.push(triangleIdx);
    return { level: level, x: x, y: y, z: z, node: node };
  }

  if (!isIntersection) {
    // no match, no need to search any deeper
    return null;
  }

  if (isMaxLevel) {
    // deepest layer with no match
    return null;
  }

  // lazily allocate the next layer of child nodes
  if (!node.children) {
    node.children = [
      // 000
      createNode(x * 2, y * 2, z * 2, level + 1),
      // 001
      createNode(x * 2 + 1, y * 2, z * 2, level + 1),
      // 010
      createNode(x * 2, y * 2 + 1, z * 2, level + 1),
      // 011
      createNode(x * 2 + 1, y * 2 + 1, z * 2, level + 1),
      // 100
      createNode(x * 2, y * 2, z * 2 + 1, level + 1),
      // 101
      createNode(x * 2 + 1, y * 2, z * 2 + 1, level + 1),
      // 011
      createNode(x * 2, y * 2 + 1, z * 2 + 1, level + 1),
      // 111
      createNode(x * 2 + 1, y * 2 + 1, z * 2 + 1, level + 1),
    ];
  }

  // recurse into each child trying to insert the triangle
  let childMatchCount = 0;
  let lastChildMatch = null;
  for (let childIdx = 0; childIdx < node.children.length; childIdx++) {
    const childNode = node.children[childIdx];
    let _x;
    let _y;
    let _z;
    if (childIdx === 0) {
      {
        // 000
        _x = x * 2;
        _y = y * 2;
        _z = z * 2;
      }
    } else if (childIdx === 1) {
      {
        // 001
        _x = x * 2 + 1;
        _y = y * 2;
        _z = z * 2;
      }
    } else if (childIdx === 2) {
      {
        // 010
        _x = x * 2;
        _y = y * 2 + 1;
        _z = z * 2;
      }
    } else if (childIdx === 3) {
      {
        // 011
        _x = x * 2 + 1;
        _y = y * 2 + 1;
        _z = z * 2;
      }
    } else if (childIdx === 4) {
      {
        // 100
        _x = x * 2;
        _y = y * 2;
        _z = z * 2 + 1;
      }
    } else if (childIdx === 5) {
      {
        // 101
        _x = x * 2 + 1;
        _y = y * 2;
        _z = z * 2 + 1;
      }
    } else if (childIdx === 6) {
      {
        // 011
        _x = x * 2;
        _y = y * 2 + 1;
        _z = z * 2 + 1;
      }
    } else if (childIdx === 7) {
      {
        // 111
        _x = x * 2 + 1;
        _y = y * 2 + 1;
        _z = z * 2 + 1;
      }
    }
    const match = nodeAddTriangle(
      maxLevels,
      childNode,
      level + 1,
      _x,
      _y,
      _z,
      triangleIdx,
      triangles,
      nodes,
    );
    if (match) {
      childMatchCount += 1;
      // of all 8 children nodes, take the one (or last one) that intersects
      //  with the triangle. That's our best bet for full containment of the next triangle to add
      //  assuming the triangles are in some kind of order
      lastChildMatch = match;
    }
  }
  // if we have 2 matches, then we know there was an intersection, meaning our upcoming containment check
  //  is more likely going to fail (if this triangle was on a boarder of 2 nodes, then it's more likely the next triangle will also be on the same border),
  //  so we can just return null and skip the optimization for the next triangle
  // todo(dan) I'm not sure about the above statement, would need testing - I reckon it'll still be better to test the optimization anyway, even if we're on a border this time
  return childMatchCount === 1 ? lastChildMatch : null;
}

export default OctreeTrianglePicking;
