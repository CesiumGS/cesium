import Cartesian3 from "../Core/Cartesian3.js";
import defined from "../Core/defined.js";
import IntersectionTests from "../Core/IntersectionTests.js";
import Matrix4 from "../Core/Matrix4.js";
import Ray from "../Core/Ray.js";
import OrientedBoundingBox from "../Core/OrientedBoundingBox.js";

var invalidIntersection = -1.0;
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
function rayAabbIntersectFromOutside(ray, minX, maxX, minY, maxY, minZ, maxZ) {
  var radX = maxX - minX;
  var radY = maxY - minY;
  var radZ = maxZ - minZ;

  var centerX = 0.5 * (maxX + minX);
  var centerY = 0.5 * (maxY + minY);
  var centerZ = 0.5 * (maxZ + minZ);

  var rddX = ray.direction.x;
  var rddY = ray.direction.y;
  var rddZ = ray.direction.z;

  var rooX = ray.origin.x - centerX;
  var rooY = ray.origin.y - centerY;
  var rooZ = ray.origin.z - centerZ;

  var mX = 1.0 / rddX;
  var mY = 1.0 / rddY;
  var mZ = 1.0 / rddZ;

  var nX = mX * rooX;
  var nY = mY * rooY;
  var nZ = mZ * rooZ;

  var kX = Math.abs(mX) * radX;
  var kY = Math.abs(mY) * radY;
  var kZ = Math.abs(mZ) * radZ;

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
function rayInsideAabb(ray, minX, maxX, minY, maxY, minZ, maxZ) {
  var rayPos = ray.origin;

  return (
    rayPos.x >= minX &&
    rayPos.x <= maxX &&
    rayPos.y >= minY &&
    rayPos.y <= maxY &&
    rayPos.z >= minZ &&
    rayPos.z <= maxZ
  );
}

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
function rayAabbIntersect(ray, minX, maxX, minY, maxY, minZ, maxZ) {
  if (rayInsideAabb(ray, minX, maxX, minY, maxY, minZ, maxZ)) {
    return 0.0;
  }

  return rayAabbIntersectFromOutside(ray, minX, maxX, minY, maxY, minZ, maxZ);
}

var scratchV0 = new Cartesian3();
var scratchV1 = new Cartesian3();
var scratchV2 = new Cartesian3();

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
}

/**
 * @constructor
 */
function TraversalResult() {
  this.triangleIndex = invalidTriangleIndex;
  this.t = Number.MAX_VALUE;
}

/**
 * Intersect against root first
 * Check against all triangles in the root, and get the closest T
 * Intersect the ray against all the children boxes
 * Only test sub-boxes whose intersections are are closer than T
 * Recurse over sub-boxes
 * TODO: each triangle has a "tested" flag so you can avoid testing it twice.
 * TODO: bresenham or DDS for faster sub-node intersection
 *
 * @param {Ray} ray
 * @param {Ray} transformedRay
 * @param {Uint8Array|Uint16Array|Uint32Array} triIndices
 * @param {Float32Array} triVertices
 * @param {TerrainEncoding} triEncoding
 * @param {TraversalResult} result
 * @returns {TraversalResult}
 */
Node.prototype.rayIntersect = function (
  ray,
  transformedRay,
  triIndices,
  triVertices,
  triEncoding,
  result
) {
  var that = this;

  var rayAabbT = rayAabbIntersect(
    transformedRay,
    that.aabbMinX,
    that.aabbMaxX,
    that.aabbMinY,
    that.aabbMaxY,
    that.aabbMinZ,
    that.aabbMaxZ
  );
  if (rayAabbT === invalidIntersection || rayAabbT > result.t) {
    // Ray missed entirely or intersection point is beyond minimum
    return result;
  }

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
    }
  }

  // Recurse over children nodes if there are any
  var children = that.children;
  if (defined(children)) {
    for (var childIndex = 0; childIndex < 8; childIndex++) {
      var child = children[childIndex];
      child.rayIntersect(
        ray,
        transformedRay,
        triIndices,
        triVertices,
        triEncoding,
        result
      );
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
  // 001 = 1
  // 010 = 2
  // 011 = 3
  // 100 = 4
  // 101 = 5
  // 110 = 6
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
 * Adds triangle to tree.
 * If it's small enough, recursively add to child nodes.
 * There's potential for a triangle to belong to more than one child.
 * TODO: Recurse downwards as long as the number of triangles inside is greater than some amount
 * @param {Number} triIndex
 * @param {Number} triAabbMinX
 * @param {Number} triAabbMaxX
 * @param {Number} triAabbMinY
 * @param {Number} triAabbMaxY
 * @param {Number} triAabbMinZ
 * @param {Number} triAabbMaxZ
 */
Node.prototype.addTriangle = function (
  triIndex,
  triAabbMinX,
  triAabbMaxX,
  triAabbMinY,
  triAabbMaxY,
  triAabbMinZ,
  triAabbMaxZ
) {
  var that = this;
  var level = that.level;
  var x = that.x;
  var y = that.y;
  var z = that.z;

  var overlapMask = getAabbOverlapMask(
    that.aabbCenterX,
    that.aabbCenterY,
    that.aabbCenterY,
    triAabbMinX,
    triAabbMaxX,
    triAabbMinY,
    triAabbMaxY,
    triAabbMinZ,
    triAabbMaxZ
  );

  var overlapCount = false;
  var childIdx;
  for (childIdx = 0; childIdx < 8; childIdx++) {
    if ((overlapMask & (1 << childIdx)) > 0) {
      overlapCount++;
    }
  }

  // If the triangle is fairly small, recurse downwards to each of the child nodes it overlaps.
  var maxLevels = 4;
  var shouldSubdivide = overlapCount <= 2 && level < maxLevels;

  if (!shouldSubdivide) {
    // Add triangle to list and end recursion
    that.triangles.push(triIndex);
  } else {
    if (!defined(that.children)) {
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
    }

    for (childIdx = 0; childIdx < 8; childIdx++) {
      var overlapsChild = (overlapMask & (1 << childIdx)) > 0;
      if (overlapsChild) {
        var childNode = that.children[childIdx];
        childNode.addTriangle(
          triIndex,
          triAabbMinX,
          triAabbMaxX,
          triAabbMinY,
          triAabbMaxY,
          triAabbMinZ,
          triAabbMaxZ
        );
      }
    }
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

    this.rootNode.addTriangle(
      triIndex,
      triAabbMinX,
      triAabbMaxX,
      triAabbMinY,
      triAabbMaxY,
      triAabbMinZ,
      triAabbMaxZ
    );
  }
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
  traversalResult.t = Number.MAX_VALUE;
  traversalResult.triangleIndex = invalidTriangleIndex;

  traversalResult = rootNode.rayIntersect(
    ray,
    transformedRay,
    triIndices,
    triVertices,
    triEncoding,
    traversalResult
  );

  // var triangleIndex = traversalResult.triangleIndex;
  var t = traversalResult.t;
  if (t === Number.MAX_VALUE) {
    return undefined;
  }

  result = Ray.getPoint(ray, t, result);
  return result;
};

export default TrianglePicking;
