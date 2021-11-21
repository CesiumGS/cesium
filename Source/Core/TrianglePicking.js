import Cartesian3 from "./Cartesian3.js";
import Check from "./Check.js";
import defined from "./defined.js";
import IntersectionTests from "./IntersectionTests.js";
import Matrix4 from "./Matrix4.js";
import OrientedBoundingBox from "./OrientedBoundingBox.js";
import Ray from "./Ray.js";

// For heightmap: https://ntrs.nasa.gov/archive/nasa/casi.ntrs.nasa.gov/20160007698.pdf
// TODO: each triangle has a "tested" flag so you can avoid testing it twice.
// TODO: don't allocate all children, just do the ones needed
// TODO: need to handle 2d picking somehow

var invalidIntersection = Number.MAX_VALUE;
var invalidTriangleIndex = -1;

/**
 * @param {Ray} ray
 * @param {Cartesian3} v0
 * @param {Cartesian3} v1
 * @param {Cartesian3} v2
 * @param {Boolean} cullBackFaces
 * @returns {Number} t
 */
function rayTriangleIntersect(ray, v0, v1, v2, cullBackFaces) {
  var t = IntersectionTests.rayTriangleParametric(
    ray,
    v0,
    v1,
    v2,
    cullBackFaces
  );
  var valid = defined(t) && t >= 0.0;
  return valid ? t : invalidIntersection;
}

/**
 * Ray - cube intersection for unit sized cube (-0.5 to +0.5)
 * Adapted from: https://www.shadertoy.com/view/ld23DV
 * @param {Ray} ray
 * @returns {Number} t
 */
function rayCubeIntersectFromOutside(ray) {
  var mX = ray.direction.x === 0 ? 0 : 1.0 / ray.direction.x;
  var mY = ray.direction.y === 0 ? 0 : 1.0 / ray.direction.y;
  var mZ = ray.direction.z === 0 ? 0 : 1.0 / ray.direction.z;

  var nX = -mX * ray.origin.x;
  var nY = -mY * ray.origin.y;
  var nZ = -mZ * ray.origin.z;

  var rad = 0.5;
  var kX = Math.abs(mX) * rad;
  var kY = Math.abs(mY) * rad;
  var kZ = Math.abs(mZ) * rad;

  var t1X = nX - kX;
  var t1Y = nY - kY;
  var t1Z = nZ - kZ;

  var t2X = nX + kX;
  var t2Y = nY + kY;
  var t2Z = nZ + kZ;

  var tN = Math.max(t1X, t1Y, t1Z);
  var tF = Math.min(t2X, t2Y, t2Z);

  if (tN > tF || tF < 0.0) {
    return invalidIntersection;
  }

  return tN;
}

/**
 * @param {Number} pX
 * @param {Number} pY
 * @param {Number} pZ
 * @param {Number} minX
 * @param {Number} maxX
 * @param {Number} minY
 * @param {Number} maxY
 * @param {Number} minZ
 * @param {Number} maxZ
 * @returns {Boolean}
 */
function positionInsideAabb(pX, pY, pZ, minX, maxX, minY, maxY, minZ, maxZ) {
  return (
    pX >= minX &&
    pX <= maxX &&
    pY >= minY &&
    pY <= maxY &&
    pZ >= minZ &&
    pZ <= maxZ
  );
}

/**
 * @param {Ray} ray
 * @returns {Number} t
 */
function rayCubeIntersect(ray) {
  var pX = ray.origin.x;
  var pY = ray.origin.y;
  var pZ = ray.origin.z;
  if (positionInsideAabb(pX, pY, pZ, -0.5, +0.5, -0.5, +0.5, -0.5, +0.5)) {
    return 0.0;
  }

  return rayCubeIntersectFromOutside(ray);
}

function onTheFlyNodeAABB(level, x, y, z) {
  var sizeAtLevel = 1.0 / Math.pow(2, level);
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
 * @constructor
 * @param {Number} level
 * @param {Number} x
 * @param {Number} y
 * @param {Number} z
 */
function Node(x, y, z, level) {
  this.level = level;
  this.x = x;
  this.y = y;
  this.z = z;
  //
  // var dimAtLevel = Math.pow(2, level);
  // var sizeAtLevel = 1.0 / dimAtLevel;
  //
  // this.aabbMinX = x * sizeAtLevel - 0.5;
  // this.aabbMaxX = (x + 1) * sizeAtLevel - 0.5;
  // this.aabbCenterX = (x + 0.5) * sizeAtLevel - 0.5;
  // this.aabbMinY = y * sizeAtLevel - 0.5;
  // this.aabbMaxY = (y + 1) * sizeAtLevel - 0.5;
  // this.aabbCenterY = (y + 0.5) * sizeAtLevel - 0.5;
  // this.aabbMinZ = z * sizeAtLevel - 0.5;
  // this.aabbMaxZ = (z + 1) * sizeAtLevel - 0.5;
  // this.aabbCenterZ = (z + 0.5) * sizeAtLevel - 0.5;

  this.firstChildNodeIdx = -1;
  // this.triSetIdx = -1;
  // the next seven indexes are the children, we've got a compleete octree

  /**
   * @type {Node[]}
   */
  // this.children = [];

  /**
   * @type {Number[]}
   */
  this.triangles = [];

  /**
   * @type {Triangle[]}
   */
  // this.tempTriangles = new Array();
}

/**
 * @constructor
 */
function TraversalResult() {
  this.triangleIndex = invalidTriangleIndex;
  this.t = invalidIntersection;
  this.level = -1;
  this.x = -1;
  this.y = -1;
  this.z = -1;
}

TraversalResult.prototype.reset = function () {
  this.triangleIndex = invalidTriangleIndex;
  this.t = invalidIntersection;
  this.level = -1;
  this.x = -1;
  this.y = -1;
  this.z = -1;
};

TraversalResult.prototype.print = function () {
  console.log("Traversal result:");
  console.log("tri index: " + this.triangleIndex);
  console.log("t: " + this.t);
  console.log("level: " + this.level);
  console.log("x: " + this.x);
  console.log("y: " + this.y);
  console.log("z: " + this.z);
};

function isRayIntersectAABB(ray, minX, minY, minZ, maxX, maxY, maxZ) {
  var tmp;
  /* X */
  var txMin = (minX - ray.origin.x) / ray.direction.x;
  var txMax = (maxX - ray.origin.x) / ray.direction.x;
  if (txMax < txMin) {
    tmp = txMax;
    txMax = txMin;
    txMin = tmp;
  }

  /* Y */
  var tyMin = (minY - ray.origin.y) / ray.direction.y;
  var tyMax = (maxY - ray.origin.y) / ray.direction.y;
  if (tyMax < tyMin) {
    tmp = tyMax;
    tyMax = tyMin;
    tyMin = tmp;
  }

  /* Z */
  var tzMin = (minZ - ray.origin.z) / ray.direction.z;
  var tzMax = (maxZ - ray.origin.z) / ray.direction.z;
  if (tzMax < tzMin) {
    tmp = tzMax;
    tzMax = tzMin;
    tzMin = tmp;
  }

  var tMin = txMin > tyMin ? txMin : tyMin; //Get Greatest Min
  var tMax = txMax < tyMax ? txMax : tyMax; //Get Smallest Max

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
  triangleVerticesCallback
) {
  var result = {
    t: Number.MAX_VALUE,
    triangleIndex: -1,
    triangleTestCount: 0,
  };
  for (var i = 0; i < (node.intersectingTriangles || []).length; i++) {
    var triIndex = node.intersectingTriangles[i];
    result.triangleTestCount++;
    var v0 = new Cartesian3();
    var v1 = new Cartesian3();
    var v2 = new Cartesian3();
    triangleVerticesCallback(triIndex, v0, v1, v2);
    var triT = rayTriangleIntersect(ray, v0, v1, v2, cullBackFaces);
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
  var hits = [];

  var queue = [node];
  var intersections = [];
  while (queue.length) {
    var n = queue.pop();
    var aabb = onTheFlyNodeAABB(n.level, n.x, n.y, n.z);
    var intersection = isRayIntersectAABB(
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
      var isLeaf = !n.children;
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
  var sortedTests = intersections.sort(function (a, b) {
    return a.tMin - b.tMin;
  });

  var triangleTestCount = 0;

  var minT = Number.MAX_VALUE;
  // for each intersected node - test every triangle which falls in that node
  for (var ii = 0; ii < sortedTests.length; ii++) {
    var test = sortedTests[ii];
    var intersectionResult = isNodeIntersection(
      ray,
      test.node,
      cullBackFaces,
      triangleVerticesCallback
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

var scratchV0 = new Cartesian3();
var scratchV1 = new Cartesian3();
/**
 * Find the closest intersection against the node's triangles, if there are any,
 * and recurse over children that might have a closer intersection.
 * Adapted from https://daeken.svbtle.com/a-stupidly-simple-fast-octree-traversal-for-ray-intersection
 *
 * @param packedNodeIdx
 * @param packedNodes
 * @param packedTriangleSets
 * @param level
 * @param x
 * @param y
 * @param z
 * @param {Ray} ray
 * @param {Ray} transformedRay
 * @param {Number} t
 * @param {Boolean} cullBackFaces
 * @param {TrianglePicking~TriangleVerticesCallback} triangleVerticesCallback
 * @param {TraversalResult} result
 * @returns {TraversalResult}
 */
function nodeRayIntersect(
  packedNodeIdx,
  packedNodes,
  packedTriangleSets,
  level,
  x,
  y,
  z,
  ray,
  transformedRay,
  t,
  cullBackFaces,
  triangleVerticesCallback,
  result,
  traceDetails
) {
  var nodeFirstChildIdx = packedNodes[packedNodeIdx];
  nodeIntersectTriangles(
    packedNodes[packedNodeIdx],
    packedNodes[packedNodeIdx + 1],
    packedNodes[packedNodeIdx + 2],
    packedTriangleSets,
    ray,
    cullBackFaces,
    triangleVerticesCallback,
    result,
    traceDetails,
    x,
    y,
    z,
    level
  );

  var noChildren = nodeFirstChildIdx === -1;
  if (noChildren) {
    return result;
  }
  var childXMin = x * 2;
  var childXMax = x * 2 + 1;
  var childYMin = y * 2;
  var childYMax = y * 2 + 1;
  var childZMin = z * 2;
  var childZMax = z * 2 + 1;
  for (var i = 0; i < 8; i++) {
    var childIdx = i;
    var _x, _y, _z;
    switch (childIdx) {
      case 0: {
        _x = childXMin;
        _y = childYMin;
        _z = childZMin;
        break;
      }
      case 1: {
        _x = childXMax;
        _y = childYMin;
        _z = childZMin;
        break;
      }
      case 2: {
        _x = childXMin;
        _y = childYMax;
        _z = childZMin;
        break;
      }
      case 3: {
        _x = childXMax;
        _y = childYMax;
        _z = childZMin;
        break;
      }
      case 4: {
        _x = childXMin;
        _y = childYMin;
        _z = childZMax;
        break;
      }
      case 5: {
        _x = childXMax;
        _y = childYMin;
        _z = childZMax;
        break;
      }
      case 6: {
        _x = childXMin;
        _y = childYMax;
        _z = childZMax;
        break;
      }
      case 7: {
        _x = childXMax;
        _y = childYMax;
        _z = childZMax;
        break;
      }
    }

    var firstChildIdx = packedNodes[packedNodeIdx];
    // multiply each idx by 3 because that's the packed space each node takes up,
    //  being: [firstChildNodeIdx, triangleCount, triangleSetIdx]
    var childNodeIdx = firstChildIdx * 3 + childIdx * 3;
    nodeRayIntersect(
      childNodeIdx,
      packedNodes,
      packedTriangleSets,
      level + 1,
      _x,
      _y,
      _z,
      ray,
      transformedRay,
      t,
      cullBackFaces,
      triangleVerticesCallback,
      result,
      traceDetails
    );
  }

  return result;
}

var scratchV2 = new Cartesian3();

/**
 * @param firstChildNodeIdx
 * @param triangleCount
 * @param triangleSetIdx
 * @param packedTriangleSets
 * @param {Ray} ray
 * @param {Boolean} cullBackFaces
 * @param {TrianglePicking~TriangleVerticesCallback} triangleVerticesCallback
 * @param {TraversalResult} result
 */
function nodeIntersectTriangles(
  firstChildNodeIdx,
  triangleCount,
  triangleSetIdx,
  packedTriangleSets,
  ray,
  cullBackFaces,
  triangleVerticesCallback,
  result,
  traceDetails,
  x,
  y,
  z,
  level
) {
  for (var i = 0; i < triangleCount; i++) {
    var triIndex = packedTriangleSets[triangleSetIdx + i];
    var v0 = scratchV0;
    var v1 = scratchV1;
    var v2 = scratchV2;
    // TODO what if we put the ray back into local-space straight away - rather than converting every triangle back into world-space
    //  then we wouldn't need the callback on the client side - only the space transform
    triangleVerticesCallback(
      triIndex,
      v0,
      v1,
      v2,
      traceDetails,
      x,
      y,
      z,
      level
    );
    var triT = rayTriangleIntersect(ray, v0, v1, v2, cullBackFaces);
    if (triT !== invalidIntersection && triT < result.t) {
      result.t = triT;
      // don't need this?
      result.triangleIndex = triIndex;
    }
  }
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
  return false;
}

/**
 * @param {Number} nodeAabbCenterX
 * @param {Number} nodeAabbCenterY
 * @param {Number} nodeAabbCenterZ
 * @param triangleIdx
 * @param triangles
 * @param {{bitCount: number, bitMask: number}} result
 * @returns {{bitCount: number, bitMask: number}}
 */
function getOverlap(
  nodeAabbCenterX,
  nodeAabbCenterY,
  nodeAabbCenterZ,
  triangleIdx,
  triangles,
  result
) {
  // 000 = child 0
  // 001 = child 1
  // 010 = child 2
  // 011 = child 3
  // 100 = child 4
  // 101 = child 5
  // 110 = child 6
  // 111 = child 7

  var bitMask = 255; // 11111111
  var bitCount = 8;

  if (triangles[triangleIdx * 6] > nodeAabbCenterX) {
    bitMask &= 170; // 10101010
    bitCount /= 2;
  } else if (triangles[triangleIdx * 6 + 1] < nodeAabbCenterX) {
    bitMask &= 85; // 01010101
    bitCount /= 2;
  }

  if (triangles[triangleIdx * 6 + 2] > nodeAabbCenterY) {
    bitMask &= 204; // 11001100
    bitCount /= 2;
  } else if (triangles[triangleIdx * 6 + 3] < nodeAabbCenterY) {
    bitMask &= 51; // 00110011
    bitCount /= 2;
  }

  if (triangles[triangleIdx * 6 + 4] > nodeAabbCenterZ) {
    bitMask &= 240; // 11110000
    bitCount /= 2;
  } else if (triangles[triangleIdx * 6 + 5] < nodeAabbCenterZ) {
    bitMask &= 15; // 00001111
    bitCount /= 2;
  }

  result.bitMask = bitMask;
  result.bitCount = bitCount;
  return result;
}

var scratchOverlap0 = {
  bitMask: 0,
  bitCount: 0,
};

var scratchOverlap1 = {
  bitMask: 0,
  bitCount: 0,
};

/**
 * @param {Node} node
 * @param {Triangle} triangle
 * @param {Number} overlapMask
 */
function nodeAddTriangleToChildren(
  maxTrianglesPerNode,
  maxLevels,
  node,
  level,
  x,
  y,
  z,
  triangleIdx,
  overlapMask,
  triangles,
  nodes
) {
  for (var childIdx = 0; childIdx < 8; childIdx++) {
    var overlapsChild = (overlapMask & (1 << childIdx)) > 0;
    if (overlapsChild) {
      var childNode = nodes[childIdx + node.firstChildNodeIdx];
      var _x, _y, _z;
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
      nodeAddTriangle(
        maxTrianglesPerNode,
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
    }
  }
}

/**
 * Adds triangle to tree.
 * If it's small enough, recursively add to child nodes.
 * There's potential for a triangle to belong to more than one child.
 *
 * @param {Node} node
 * @param {Triangle} triangle
 */

// how many axis of the current triangle are within the node's axis-aligned-bounding-box
var smallOverlapCount = 3;

// var childIdxLevelTraversalBitMasks = new Uint8Array([
//   0, // 0b000   x       y       z
//   1, // 0b001   x + 1   y       z
//   2, // 0b010   x       y + 1   z
//   3, // 0b011   x + 1   y + 1   z
//   4, // 0b100   x       y       z + 1
//   5, // 0b101   x + 1   y       z + 1
//   3, // 0b011   x       y + 1   z + 1
//   7, // 0b111   x + 1   y + 1   z + 1
// ]);
//
// var xMask = 1; // 0b001
// var yMask = 2; // 0b010
// var zMask = 4; // 0b100

function createOctree(triangles) {
  var rootNode = new Node(0, 0, 0, 0);
  var nodes = [rootNode];
  //>>includeStart('debug', pragmas.debug);
  console.time("creating actual octree");
  var triangleCount = triangles.length / 6;

  // we can build a more spread out octree
  //  for smaller tiles because it'll be quicker
  var maxLevels = 2;
  //  and just eat the CPU time on the main thread
  var maxTrianglesPerNode = 50;

  var quickMatchSuccess = 0;
  var quickMatchFailure = 0;

  var lastMatch;
  for (var x = 0; x < triangleCount; x++) {
    if (lastMatch) {
      var isTriangleContainedWithinLastMatchedNode = isNodeInteraction(
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
      maxTrianglesPerNode,
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

function isNodeInteraction(level, x, y, z, triangles, triangleIdx) {
  // todo(dan) inline all this
  var aabb = onTheFlyNodeAABB(level, x, y, z);
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
  maxTrianglesPerNode,
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
  var aabb = onTheFlyNodeAABB(level, x, y, z);
  var isIntersection = isAABBIntersectsAABB(
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

  var isMaxLevel = level === maxLevels;
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

  var lastMatch = null;
  for (var childIdx = 0; childIdx < node.children.length; childIdx++) {
    var childNode = node.children[childIdx];
    var _x;
    var _y;
    var _z;
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
    var lastCheck = nodeAddTriangle(
      maxTrianglesPerNode,
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
    if (lastCheck) {
      // of all 8 children nodes, take the one (or last one) that intersects
      //  with the triangle. That's our best bet for full containment of the next triangle to add
      //  providing they're in order
      lastMatch = lastCheck;
    }
  }
  return lastMatch;
}

/**
 * @constructor
 * @param {{packedNodes: Float32Array, packedTriangles: Float32Array, inverseTransform: Matrix4}} packedOctree
 * @param {Function} triangleVerticesCallback
 */
function TrianglePicking(packedOctree, triangleVerticesCallback) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object(
    "packedOctree.inverseTransform",
    packedOctree.inverseTransform
  );
  Check.typeOf.object("packedOctree.packedNodes", packedOctree.packedNodes);
  Check.typeOf.object(
    "packedOctree.packedTriangles",
    packedOctree.packedTriangles
  );
  Check.typeOf.func("triangleVerticesCallback", triangleVerticesCallback);
  //>>includeEnd('debug');

  this._inverseTransform = Matrix4.unpack(packedOctree.inverseTransform);
  this._packedNodes = packedOctree.packedNodes;
  this._packedTriangles = packedOctree.packedTriangles;
  this._triangles = packedOctree.triangles;
  this._unpackedOctree = packedOctree.unpackedOctree;
  this._transform = Matrix4.unpack(packedOctree.transform);
  this._obb = OrientedBoundingBox.unpack(packedOctree.obb);

  this._triangleVerticesCallback = triangleVerticesCallback;
}

var scratchTraversalResult = new TraversalResult();
var scratchTransformedRay = new Ray();

/**
 * @param {Ray} ray
 * @param {Boolean} cullBackFaces
 * @param {Cartesian3} result
 * @returns {Cartesian3} result
 */
TrianglePicking.prototype.rayIntersect = function (
  ray,
  cullBackFaces,
  result,
  trace
) {
  if (!defined(result)) {
    result = new Cartesian3();
  }
  var invTransform = this._inverseTransform;
  var packedTriangleSets = this._packedTriangles;
  var packedNodes = this._packedNodes;

  var transformedRay = scratchTransformedRay;
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

  // var t = rayCubeIntersect(transformedRay);
  // if (t === invalidIntersection) {
  //   return undefined;
  // }

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
 * @param { Float32Array} triangles
 * @param {Matrix4 }inverseTransform
 * @return {{packedNodes: Int32Array, inverseTransform: Array<number>, packedTriangles: Int32Array}}
 */
TrianglePicking.createPackedOctree = function (
  triangles,
  inverseTransform,
  transform,
  obb
) {
  var nodes = createOctree(triangles);
  console.time("creating packed");
  // var packedNodeSpace = 3;
  // var packedNodes = new Int32Array(nodes.length * packedNodeSpace);
  var packedNodes = new Int32Array();
  // var triangleSets = [];
  // var n;
  // for (var w = 0; w < nodes.length; w++) {
  //   n = nodes[w];
  //   // a reference to the packed node index (*3)
  //   packedNodes[w * packedNodeSpace] = n.firstChildNodeIdx;
  //   // the number of triangles this node contains
  //   packedNodes[w * packedNodeSpace + 1] = n.triangles.length;
  //   // the index of the first triangle in thee packed triangles
  //   packedNodes[w * packedNodeSpace + 2] = triangleSets.length;
  //   // TODO keep a counter of the total triangle count during octree creation - so we can go straight
  //   //  to the packedTriangles typed array here - instead of triangleSets
  //   for (var i = 0; i < n.triangles.length; i++) {
  //     // this for loop was actually 10% faster than .push(...items) and 120% faster than .concat(items)
  //     triangleSets.push(n.triangles[i]);
  //   }
  // }
  // var packedTriangles = new Int32Array(triangleSets);
  var packedTriangles = new Int32Array();
  console.timeEnd("creating packed");

  return {
    packedTriangles: packedTriangles,
    packedNodes: packedNodes,
    triangles: triangles,
    unpackedOctree: nodes,
    inverseTransform: Matrix4.pack(inverseTransform, [], 0),
    transform: transform,
    obb: obb,
  };
};

/**
 * A function that gets the three vertices from a triangle index
 *
 * @callback TrianglePicking~TriangleVerticesCallback
 * @param {Number} triangleIndex The triangle index
 * @param {Cartesian3} v0 The first vertex
 * @param {Cartesian3} v1 The second vertex
 * @param {Cartesian3} v2 The third vertex
 * @param traceDetails
 */
export default TrianglePicking;
