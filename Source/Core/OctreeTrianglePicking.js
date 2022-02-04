import Cartesian3 from "./Cartesian3.js";
import Check from "./Check.js";
import defined from "./defined.js";
import IntersectionTests from "./IntersectionTests.js";
import Matrix4 from "./Matrix4.js";
import Ray from "./Ray.js";

// TODO: need to handle 2d picking somehow

const invalidIntersection = Number.MAX_VALUE;

/**
 * @param {Ray} ray
 * @param {Cartesian3} v0
 * @param {Cartesian3} v1
 * @param {Cartesian3} v2
 * @param {Boolean} cullBackFaces
 * @returns {Number} t
 */
function rayTriangleIntersect(ray, v0, v1, v2, cullBackFaces) {
  const t = IntersectionTests.rayTriangleParametric(
    ray,
    v0,
    v1,
    v2,
    cullBackFaces
  );
  const valid = defined(t) && t >= 0.0;
  return valid ? t : invalidIntersection;
}

function onTheFlyNodeAABB(level, x, y, z) {
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

function Node(x, y, z, level) {
  this.level = level;
  this.x = x;
  this.y = y;
  this.z = z;
  this.firstChildNodeIdx = -1;
  this.triangles = [];
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
  traceDetails
) {
  const result = {
    t: Number.MAX_VALUE,
    triangleIndex: -1,
    triangleTestCount: 0,
  };
  for (let i = 0; i < (node.intersectingTriangles || []).length; i++) {
    const triIndex = node.intersectingTriangles[i];
    result.triangleTestCount++;
    const v0 = new Cartesian3();
    const v1 = new Cartesian3();
    const v2 = new Cartesian3();
    triangleVerticesCallback(triIndex, v0, v1, v2, traceDetails);
    const triT = rayTriangleIntersect(ray, v0, v1, v2, cullBackFaces);
    if (triT !== invalidIntersection && triT < result.t) {
      result.t = triT;
      // don't need this?
      result.triangleIndex = triIndex;
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
  trace
) {
  // from here: http://publications.lib.chalmers.se/records/fulltext/250170/250170.pdf
  // find all the nodes which intersect the ray
  const hits = [];

  const queue = [node];
  const intersections = [];
  while (queue.length) {
    const n = queue.pop();
    const aabb = onTheFlyNodeAABB(n.level, n.x, n.y, n.z);
    const intersection = isRayIntersectAABB(
      transformedRay,
      aabb.aabbMinX,
      aabb.aabbMinY,
      aabb.aabbMinZ,
      aabb.aabbMaxX,
      aabb.aabbMaxY,
      aabb.aabbMaxZ
    );
    if (intersection.intersection) {
      if (trace) {
        n.isHit = true;
        hits.push({ level: n.level, x: n.x, y: n.y, z: n.z });
      }
      const isLeaf = !n.children;
      if (isLeaf) {
        intersections.push({
          node: n,
          tMin: intersection.tMin,
          tMax: intersection.tMax,
        });
      } else {
        queue.push(...n.children);
      }
    }
  }

  // sort each intersection node by tMin ascending
  const sortedTests = intersections.sort(function (a, b) {
    return a.tMin - b.tMin;
  });

  let triangleTestCount = 0;

  let minT = Number.MAX_VALUE;
  // for each intersected node - test every triangle which falls in that node
  for (let ii = 0; ii < sortedTests.length; ii++) {
    const test = sortedTests[ii];
    const intersectionResult = isNodeIntersection(
      ray,
      test.node,
      cullBackFaces,
      triangleVerticesCallback,
      trace
    );
    triangleTestCount += intersectionResult.triangleTestCount;
    minT = Math.min(intersectionResult.t, minT);
    if (minT !== invalidIntersection) {
      // found our first intersection - we can bail early!
      if (trace) {
        trace.triangleIndex = intersectionResult.triangleIndex;
      }
      break;
    }
  }

  if (trace) {
    trace.triangleTestCount = triangleTestCount;
    trace.hits = hits;
  }

  if (minT !== invalidIntersection) {
    return Ray.getPoint(ray, minT);
  }

  return undefined;
}

function isAABBIntersectsAABB(
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
  bMaxZ
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

function isAABBContainsAABB(
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
  bMaxZ
) {
  // TODO make this actually work
  //  the optimize the adding of triangles by first checking if the last used aabb
  //  contains the next triangle... if it does then we know that's the only octree node we need to check
  //  since it's a fully contained check... very good optimization for heightmap terrain where most triangles
  //  should hopefully be in the same node next to eachother.

  // todo(dan) --- urhg I just guessed this implementatipn, is it even correct??
  //  we need to check for full containment or just intersection here
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
  const rootNode = new Node(0, 0, 0, 0);
  const nodes = [rootNode];
  //>>includeStart('debug', pragmas.debug);
  console.time("creating actual octree");
  const triangleCount = triangles.length / 6;

  // we can build a more spread out octree
  //  for smaller tiles because it'll be quicker
  const maxLevels = 2;

  let quickMatchSuccess = 0;
  let quickMatchFailure = 0;

  let lastMatch;
  for (let x = 0; x < triangleCount; x++) {
    if (lastMatch) {
      const isTriangleContainedWithinLastMatchedNode = isNodeContainsTriangle(
        lastMatch.level,
        lastMatch.x,
        lastMatch.y,
        lastMatch.z,
        triangles,
        x
      );
      if (isTriangleContainedWithinLastMatchedNode) {
        quickMatchSuccess += 1;
        lastMatch.node.intersectingTriangles.push(x);
        continue;
      } else {
        quickMatchFailure += 1;
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
      nodes
    );
  }
  console.timeEnd("creating actual octree");
  console.log(`quick match ${quickMatchSuccess}; failure ${quickMatchFailure}`);
  return nodes;
}

function isNodeContainsTriangle(level, x, y, z, triangles, triangleIdx) {
  // todo(dan) inline all this
  const aabb = onTheFlyNodeAABB(level, x, y, z);
  return isAABBContainsAABB(
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
    aabb.aabbMaxZ
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
  nodes
) {
  const aabb = onTheFlyNodeAABB(level, x, y, z);
  const isIntersection = isAABBIntersectsAABB(
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
    aabb.aabbMaxZ
  );

  const isMaxLevel = level === maxLevels;
  if (isIntersection) {
    if (isMaxLevel) {
      node.intersectingTriangles = node.intersectingTriangles || [];
      node.intersectingTriangles.push(triangleIdx);
      return { level: level, x: x, y: y, z: z, node: node };
    }
  } else {
    return null;
  }

  if (isMaxLevel) {
    return null;
  }

  if (!node.children) {
    node.children = [
      // 000
      new Node(x * 2, y * 2, z * 2, level + 1),
      // 001
      new Node(x * 2 + 1, y * 2, z * 2, level + 1),
      // 010
      new Node(x * 2, y * 2 + 1, z * 2, level + 1),
      // 011
      new Node(x * 2 + 1, y * 2 + 1, z * 2, level + 1),
      // 100
      new Node(x * 2, y * 2, z * 2 + 1, level + 1),
      // 101
      new Node(x * 2 + 1, y * 2, z * 2 + 1, level + 1),
      // 011
      new Node(x * 2, y * 2 + 1, z * 2 + 1, level + 1),
      // 111
      new Node(x * 2 + 1, y * 2 + 1, z * 2 + 1, level + 1),
    ];
  }

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
      nodes
    );
    if (match) {
      childMatchCount += 1;
      // of all 8 children nodes, take the one (or last one) that intersects
      //  with the triangle. That's our best bet for full containment of the next triangle to add
      //  providing they're in order
      lastChildMatch = match;
    }
  }
  // if we have 2 matches, then we know there was an intersection, meaning our upcoming aabb containment check
  //  is going to fail (it's a triangle on a border of a aabb); so we can just return null and skip the check
  return childMatchCount === 1 ? lastChildMatch : null;
}

/**
 * @constructor
 */
function OctreeTrianglePicking(packedOctree, triangleVerticesCallback) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object(
    "packedOctree.inverseTransform",
    packedOctree.inverseTransform
  );
  Check.typeOf.func("triangleVerticesCallback", triangleVerticesCallback);
  //>>includeEnd('debug');

  this._inverseTransform = Matrix4.unpack(packedOctree.inverseTransform);
  this._triangles = packedOctree.triangles;
  this._unpackedOctree = packedOctree.unpackedOctree;
  this._transform = Matrix4.unpack(packedOctree.transform);

  this._triangleVerticesCallback = triangleVerticesCallback;
}

const scratchTransformedRay = new Ray();

/**
 * @param {Ray} ray
 * @param {Boolean} cullBackFaces
 * @param {Cartesian3} result
 * @param {object} trace
 * @returns {Cartesian3} result
 */
OctreeTrianglePicking.prototype.rayIntersect = function (
  ray,
  cullBackFaces,
  result,
  trace
) {
  const invTransform = this._inverseTransform;

  const transformedRay = scratchTransformedRay;
  transformedRay.origin = Matrix4.multiplyByPoint(
    invTransform,
    ray.origin,
    transformedRay.origin
  );
  transformedRay.direction = Matrix4.multiplyByPointAsVector(
    invTransform,
    ray.direction,
    transformedRay.direction
  );

  return rayIntersectOctree(
    this._unpackedOctree[0],
    ray,
    transformedRay,
    this._triangleVerticesCallback,
    cullBackFaces,
    trace
  );
};

/**
 *
 * @param {Float32Array} triangles
 * @param {Matrix4} inverseTransform
 * @param {Matrix4} transform
 * @param {OrientedBoundingBox} obb
 */
OctreeTrianglePicking.createPackedOctree = function (
  triangles,
  inverseTransform,
  transform,
  obb
) {
  const nodes = createOctree(triangles);
  return {
    triangles: triangles,
    unpackedOctree: nodes,
    inverseTransform: Matrix4.pack(inverseTransform, [], 0),
    transform: transform,
    obb: obb,
  };
};

export default OctreeTrianglePicking;
