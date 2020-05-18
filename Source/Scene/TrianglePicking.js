import Cartesian3 from "../Core/Cartesian3.js";
import defined from "../Core/defined.js";
import IntersectionTests from "../Core/IntersectionTests.js";
import Matrix4 from "../Core/Matrix4.js";
import Ray from "../Core/Ray.js";
import OrientedBoundingBox from "../Core/OrientedBoundingBox.js";

// TODO: each triangle has a "tested" flag so you can avoid testing it twice.
// TODO: don't allocate all children, just do the ones needed
// TODO: Recurse downwards as long as the number of triangles inside is greater than some amount

var invalidIntersection = Number.MAX_VALUE;
var invalidTriangleIndex = -1;

/**
 * @param {Ray} ray
 * @param {Cartesian3} v0
 * @param {Cartesian3} v1
 * @param {Cartesian3} v2
 * @returns {Number} t
 */
function rayTriangleIntersect(ray, v0, v1, v2) {
  var cullBackfaces = false;
  var t = IntersectionTests.rayTriangleParametric(
    ray,
    v0,
    v1,
    v2,
    cullBackfaces
  );
  var valid = defined(t) && t >= 0.0;
  return valid ? t : invalidIntersection;
}

// https://www.shadertoy.com/view/ld23DV
/**
 * @param {Ray} ray
 * @param {Number} minX
 * @param {Number} maxX
 * @param {Number} minY
 * @param {Number} maxY
 * @param {Number} minZ
 * @param {Number} maxZ
 * @returns {Number} t
 */
function rayCubeIntersectFromOutside(ray) {
  var size = 0.5;

  var rddX = ray.direction.x;
  var rddY = ray.direction.y;
  var rddZ = ray.direction.z;

  var rooX = ray.origin.x;
  var rooY = ray.origin.y;
  var rooZ = ray.origin.z;

  var mX = 1.0 / rddX;
  var mY = 1.0 / rddY;
  var mZ = 1.0 / rddZ;

  var nX = mX * rooX;
  var nY = mY * rooY;
  var nZ = mZ * rooZ;

  var kX = Math.abs(mX) * size;
  var kY = Math.abs(mY) * size;
  var kZ = Math.abs(mZ) * size;

  var t1X = -nX - kX;
  var t1Y = -nY - kY;
  var t1Z = -nZ - kZ;

  var t2X = -nX + kX;
  var t2Y = -nY + kY;
  var t2Z = -nZ + kZ;

  var tN = Math.max(Math.max(t1X, t1Y), t1Z);
  var tF = Math.min(Math.min(t2X, t2Y), t2Z);

  if (tN > tF || tF < 0.0) {
    return invalidIntersection;
  }

  return tN;
}

/**
 * @param {Ray} ray
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

var scratchV0 = new Cartesian3();
var scratchV1 = new Cartesian3();
var scratchV2 = new Cartesian3();

/**
 * @constructor
 * @param {Number} index
 * @param {Number} aabbMinX
 * @param {Number} aabbMaxX
 * @param {Number} aabbMinY
 * @param {Number} aabbMaxY
 * @param {Number} aabbMinZ
 * @param {Number} aabbMaxZ
 */
function TempTriangle(
  index,
  aabbMinX,
  aabbMaxX,
  aabbMinY,
  aabbMaxY,
  aabbMinZ,
  aabbMaxZ
) {
  this.index = index;
  this.aabbMinX = aabbMinX;
  this.aabbMaxX = aabbMaxX;
  this.aabbMinY = aabbMinY;
  this.aabbMaxY = aabbMaxY;
  this.aabbMinZ = aabbMinZ;
  this.aabbMaxZ = aabbMaxZ;
  this.overlapMask = 0;
}

/**
 * @constructor
 * @param {Number} level
 * @param {Number} x
 * @param {Number} y
 * @param {Number} z
 */
function Node(level, x, y, z) {
  this.level = level;
  this.x = x;
  this.y = y;
  this.z = z;

  var dimAtLevel = Math.pow(2, level);
  var sizeAtLevel = 1.0 / dimAtLevel;

  this.aabbMinX = x * sizeAtLevel - 0.5;
  this.aabbMaxX = (x + 1) * sizeAtLevel - 0.5;
  this.aabbCenterX = (x + 0.5) * sizeAtLevel - 0.5;
  this.aabbMinY = y * sizeAtLevel - 0.5;
  this.aabbMaxY = (y + 1) * sizeAtLevel - 0.5;
  this.aabbCenterY = (y + 0.5) * sizeAtLevel - 0.5;
  this.aabbMinZ = z * sizeAtLevel - 0.5;
  this.aabbMaxZ = (z + 1) * sizeAtLevel - 0.5;
  this.aabbCenterZ = (z + 0.5) * sizeAtLevel - 0.5;

  /**
   * @type {Node[]}
   */
  this.children = undefined;

  /**
   * @type {Number[]}
   */
  this.triangles = new Array();

  /**
   * @type {TempTriangle[]}
   */
  this.tempTriangles = new Array();
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

Node.prototype._intersectTriangles = function (
  ray,
  triIndices,
  triVertices,
  triEncoding,
  result
) {
  var that = this;
  var triangleCount = that.triangles.length;
  for (var i = 0; i < triangleCount; i++) {
    var triIndex = that.triangles[i];
    var i0 = triIndices[triIndex * 3 + 0];
    var i1 = triIndices[triIndex * 3 + 1];
    var i2 = triIndices[triIndex * 3 + 2];

    var v0 = triEncoding.decodePosition(triVertices, i0, scratchV0);
    var v1 = triEncoding.decodePosition(triVertices, i1, scratchV1);
    var v2 = triEncoding.decodePosition(triVertices, i2, scratchV2);

    var triT = rayTriangleIntersect(ray, v0, v1, v2);

    if (triT !== invalidIntersection && triT < result.t) {
      result.t = triT;
      result.triangleIndex = triIndex;
      result.level = that.level;
      result.x = that.x;
      result.y = that.y;
      result.z = that.z;
    }
  }
};

/**
 * Intersect against root first
 * Check against all triangles in the root, and get the closest T
 * Intersect the ray against all the children boxes
 * Only test sub-boxes whose intersections are are closer than T
 * Recurse over sub-boxes
 * Adapted from https://daeken.svbtle.com/a-stupidly-simple-fast-octree-traversal-for-ray-intersection
 *
 * @param {Ray} ray
 * @param {Ray} transformedRay
 * @param {Number} t
 * @param {Uint8Array|Uint16Array|Uint32Array} triIndices
 * @param {Float32Array} triVertices
 * @param {TerrainEncoding} triEncoding
 * @param {TraversalResult} result
 * @returns {TraversalResult}
 */
Node.prototype.rayIntersect = function (
  ray,
  transformedRay,
  t,
  triIndices,
  triVertices,
  triEncoding,
  result
) {
  var that = this;

  that._intersectTriangles(ray, triIndices, triVertices, triEncoding, result);
  if (!defined(that.children)) {
    return result;
  }

  var dirX = transformedRay.direction.x;
  var dirY = transformedRay.direction.y;
  var dirZ = transformedRay.direction.z;
  var originX = transformedRay.origin.x + t * dirX;
  var originY = transformedRay.origin.y + t * dirY;
  var originZ = transformedRay.origin.z + t * dirZ;

  var sideX = originX >= that.aabbCenterX;
  var sideY = originY >= that.aabbCenterY;
  var sideZ = originZ >= that.aabbCenterZ;

  var canCrossX = sideX !== dirX >= 0.0;
  var canCrossY = sideY !== dirY >= 0.0;
  var canCrossZ = sideZ !== dirZ >= 0.0;

  var distX = canCrossX
    ? (that.aabbCenterX - originX) / dirX
    : invalidIntersection;
  var distY = canCrossY
    ? (that.aabbCenterY - originY) / dirY
    : invalidIntersection;
  var distZ = canCrossZ
    ? (that.aabbCenterZ - originZ) / dirZ
    : invalidIntersection;

  var minDist = 0;
  var childIdx = sideX | (sideY << 1) | (sideZ << 2);

  // There are a total of four possible cell overlaps, but usually it's less than that.
  for (var i = 0; i < 4; i++) {
    var child = that.children[childIdx];
    child.rayIntersect(
      ray,
      transformedRay,
      t + minDist,
      triIndices,
      triVertices,
      triEncoding,
      result
    );

    minDist = Math.min(distX, distY, distZ);

    if (
      minDist === invalidIntersection || // no more axes to check
      t + minDist >= result.t || // there is already a closer intersection
      !positionInsideAabb(
        originX + minDist * dirX,
        originY + minDist * dirY,
        originZ + minDist * dirZ,
        that.aabbMinX,
        that.aabbMaxX,
        that.aabbMinY,
        that.aabbMaxY,
        that.aabbMinZ,
        that.aabbMaxZ
      )
    ) {
      break;
    }

    if (minDist === distX) {
      distX = invalidIntersection;
      childIdx ^= 1; // toggle X bit
    } else if (minDist === distY) {
      distY = invalidIntersection;
      childIdx ^= 2; // toggle Y bit
    } else if (minDist === distZ) {
      distZ = invalidIntersection;
      childIdx ^= 4; // toggle Z bit
    }
  }

  return result;
};

function clearBit(val, bit) {
  return val & ~(1 << bit);
}
/**
 * @param {Number} nodeAabbCenterX
 * @param {Number} nodeAabbCenterY
 * @param {Number} nodeAabbCenterZ
 * @param {Number} triAabbMinX
 * @param {Number} triAabbMaxX
 * @param {Number} triAabbMinY
 * @param {Number} triAabbMaxY
 * @param {Number} triAabbMinZ
 * @param {Number} triAabbMaxZ
 */
function getAabbOverlapMask(
  nodeAabbCenterX,
  nodeAabbCenterY,
  nodeAabbCenterZ,
  triAabbMinX,
  triAabbMaxX,
  triAabbMinY,
  triAabbMaxY,
  triAabbMinZ,
  triAabbMaxZ
) {
  // 000 = 0
  // 100 = 1
  // 010 = 2
  // 110 = 3
  // 001 = 4
  // 101 = 5
  // 011 = 6
  // 111 = 7

  var result = 255;

  if (triAabbMinX > nodeAabbCenterX) {
    result = clearBit(result, 0);
    result = clearBit(result, 2);
    result = clearBit(result, 4);
    result = clearBit(result, 6);
  }
  if (triAabbMaxX < nodeAabbCenterX) {
    result = clearBit(result, 1);
    result = clearBit(result, 3);
    result = clearBit(result, 5);
    result = clearBit(result, 7);
  }
  if (triAabbMinY > nodeAabbCenterY) {
    result = clearBit(result, 0);
    result = clearBit(result, 1);
    result = clearBit(result, 4);
    result = clearBit(result, 5);
  }
  if (triAabbMaxY < nodeAabbCenterY) {
    result = clearBit(result, 2);
    result = clearBit(result, 3);
    result = clearBit(result, 6);
    result = clearBit(result, 7);
  }
  if (triAabbMinZ > nodeAabbCenterZ) {
    result = clearBit(result, 0);
    result = clearBit(result, 1);
    result = clearBit(result, 2);
    result = clearBit(result, 3);
  }
  if (triAabbMaxZ < nodeAabbCenterZ) {
    result = clearBit(result, 4);
    result = clearBit(result, 5);
    result = clearBit(result, 6);
    result = clearBit(result, 7);
  }

  return result;
}

/**
 * @param {TempTriangle} tempTriangle
 */
Node.prototype._addTempTriangle = function (tempTriangle) {
  var that = this;
  var tempMask = tempTriangle.overlapMask;
  for (var childIdx = 0; childIdx < 8; childIdx++) {
    var overlapsChild = (tempMask & (1 << childIdx)) > 0;
    if (overlapsChild) {
      var childNode = that.children[childIdx];
      var newTemp = new TempTriangle(
        tempTriangle.index,
        tempTriangle.aabbMinX,
        tempTriangle.aabbMaxX,
        tempTriangle.aabbMinY,
        tempTriangle.aabbMaxY,
        tempTriangle.aabbMinZ,
        tempTriangle.aabbMaxZ
      );
      childNode.addTriangle(newTemp);
    }
  }
};

/**
 * Adds triangle to tree.
 * If it's small enough, recursively add to child nodes.
 * There's potential for a triangle to belong to more than one child.
 * @param {TempTriangle} tempTriangle
 */

Node.prototype.addTriangle = function (tempTriangle) {
  var that = this;
  var level = that.level;
  var x = that.x;
  var y = that.y;
  var z = that.z;

  var overlapMask = getAabbOverlapMask(
    that.aabbCenterX,
    that.aabbCenterY,
    that.aabbCenterZ,
    tempTriangle.aabbMinX,
    tempTriangle.aabbMaxX,
    tempTriangle.aabbMinY,
    tempTriangle.aabbMaxY,
    tempTriangle.aabbMinZ,
    tempTriangle.aabbMaxZ
  );

  tempTriangle.overlapMask = overlapMask;

  var childIdx;
  var overlapCount = 0;
  for (childIdx = 0; childIdx < 8; childIdx++) {
    if ((overlapMask & (1 << childIdx)) > 0) {
      overlapCount++;
    }
  }

  // If the triangle is fairly small, recurse downwards to each of the child nodes it overlaps.
  var maxLevels = 100;
  var maxTriangles = 30;
  var smallOverlapCount = 2;

  var triangles = that.triangles;
  var tempTriangles = that.tempTriangles;
  var smallCount = tempTriangles.length;
  var largeCount = triangles.length;
  var count = smallCount + largeCount;
  var hasChildren = defined(that.children);
  var atMaxLevel = level === maxLevels - 1;

  var isSmall = overlapCount <= smallOverlapCount;
  var shouldSubdivide =
    isSmall && count >= maxTriangles && !hasChildren && !atMaxLevel;

  if (shouldSubdivide) {
    var childLevel = level + 1;
    var childXMin = x * 2 + 0;
    var childXMax = x * 2 + 1;
    var childYMin = y * 2 + 0;
    var childYMax = y * 2 + 1;
    var childZMin = z * 2 + 0;
    var childZMax = z * 2 + 1;

    that.children = new Array(
      new Node(childLevel, childXMin, childYMin, childZMin),
      new Node(childLevel, childXMax, childYMin, childZMin),
      new Node(childLevel, childXMin, childYMax, childZMin),
      new Node(childLevel, childXMax, childYMax, childZMin),
      new Node(childLevel, childXMin, childYMin, childZMax),
      new Node(childLevel, childXMax, childYMin, childZMax),
      new Node(childLevel, childXMin, childYMax, childZMax),
      new Node(childLevel, childXMax, childYMax, childZMax)
    );

    for (var t = 0; t < tempTriangles.length; t++) {
      that._addTempTriangle(tempTriangles[t]);
    }
    tempTriangles.length = 0;
  }

  hasChildren = defined(that.children);
  var shouldFilterDown = isSmall && hasChildren && !atMaxLevel;

  if (shouldFilterDown) {
    that._addTempTriangle(tempTriangle);
  } else if (isSmall) {
    tempTriangles.push(tempTriangle);
  } else {
    triangles.push(tempTriangle.index);
  }
};

var scratchV0Local = new Cartesian3();
var scratchV1Local = new Cartesian3();
var scratchV2Local = new Cartesian3();
var scratchTransform = new Matrix4();

/**
 * @constructor
 * @param {Uint8Array|Uint16Array|Uint32Array} triIndices
 * @param {Float32Array} triVertices
 * @param {TerrainEncoding} triEncoding
 * @param {Matrix4} tileTransform
 */
function TrianglePicking(
  triIndices,
  triVertices,
  triEncoding,
  tileOrientedBoundingBox
) {
  this.rootNode = new Node(0, 0, 0, 0);
  this.triIndices = triIndices;
  this.triVertices = triVertices;
  this.triEncoding = triEncoding;

  var transform = OrientedBoundingBox.toTransformation(
    tileOrientedBoundingBox,
    scratchTransform
  );
  this.invTransform = Matrix4.inverse(transform, new Matrix4());
  var invTransform = this.invTransform;

  // Build the octree by adding each triangle one at a time.
  var triCount = triIndices.length / 3;
  for (var triIndex = 0; triIndex < triCount; triIndex++) {
    var idx0 = triIndices[triIndex * 3 + 0];
    var idx1 = triIndices[triIndex * 3 + 1];
    var idx2 = triIndices[triIndex * 3 + 2];

    var v0 = triEncoding.decodePosition(triVertices, idx0, scratchV0);
    var v1 = triEncoding.decodePosition(triVertices, idx1, scratchV1);
    var v2 = triEncoding.decodePosition(triVertices, idx2, scratchV2);

    var v0Local = Matrix4.multiplyByPoint(invTransform, v0, scratchV0Local);
    var v1Local = Matrix4.multiplyByPoint(invTransform, v1, scratchV1Local);
    var v2Local = Matrix4.multiplyByPoint(invTransform, v2, scratchV2Local);

    var triAabbMinX = Math.min(v0Local.x, v1Local.x, v2Local.x);
    var triAabbMaxX = Math.max(v0Local.x, v1Local.x, v2Local.x);
    var triAabbMinY = Math.min(v0Local.y, v1Local.y, v2Local.y);
    var triAabbMaxY = Math.max(v0Local.y, v1Local.y, v2Local.y);
    var triAabbMinZ = Math.min(v0Local.z, v1Local.z, v2Local.z);
    var triAabbMaxZ = Math.max(v0Local.z, v1Local.z, v2Local.z);

    var tempTriangle = new TempTriangle(
      triIndex,
      triAabbMinX,
      triAabbMaxX,
      triAabbMinY,
      triAabbMaxY,
      triAabbMinZ,
      triAabbMaxZ
    );

    this.rootNode.addTriangle(tempTriangle);
  }

  function cleanTempTriangles(node) {
    var triangles = node.triangles;
    var tempTriangles = node.tempTriangles;
    for (var t = 0; t < tempTriangles.length; t++) {
      triangles.push(tempTriangles[t].index);
    }
    node.tempTriangles = undefined;
    var children = node.children;
    if (defined(children)) {
      for (var c = 0; c < 8; c++) {
        cleanTempTriangles(children[c]);
      }
    }
  }
  cleanTempTriangles(this.rootNode);
}

var scratchTraversalResult = new TraversalResult();
var scratchTransformedRay = new Ray();

/**
 * @param {Ray} ray
 * @param {Cartesian3} result
 * @returns {Cartesian3} result
 */
TrianglePicking.prototype.rayIntersect = function (ray, result) {
  if (!defined(result)) {
    result = new Cartesian3();
  }
  var that = this;
  var invTransform = that.invTransform;
  var rootNode = that.rootNode;
  var triIndices = that.triIndices;
  var triVertices = that.triVertices;
  var triEncoding = that.triEncoding;

  // var triCount = 0;
  // var nodeCount = 0;
  // function getTriCount(node) {
  //   var isLeaf = defined(node.children);
  //   // console.log(
  //   //   node.level +
  //   //     " " +
  //   //     node.x +
  //   //     " " +
  //   //     node.y +
  //   //     " " +
  //   //     node.z +
  //   //     "(" +
  //   //     isLeaf +
  //   //     ") : " +
  //   //     node.triangles.length
  //   // );
  //   triCount += node.triangles.length;
  //   nodeCount++;

  //   var children = node.children;
  //   if (defined(children)) {
  //     for (var i = 0; i < 8; i++) {
  //       getTriCount(children[i]);
  //     }
  //   }
  // }
  // getTriCount(rootNode, triCount, nodeCount);
  // console.log("ratio: " + triCount / nodeCount);

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

  var traversalResult = scratchTraversalResult;
  traversalResult.reset();

  var t = rayCubeIntersect(transformedRay);
  if (t === invalidIntersection) {
    return undefined;
  }

  traversalResult = rootNode.rayIntersect(
    ray,
    transformedRay,
    t,
    triIndices,
    triVertices,
    triEncoding,
    traversalResult
  );

  // var triangleIndex = traversalResult.triangleIndex;
  if (traversalResult.t === invalidIntersection) {
    return undefined;
  }

  result = Ray.getPoint(ray, traversalResult.t, result);
  return result;
};

export default TrianglePicking;
