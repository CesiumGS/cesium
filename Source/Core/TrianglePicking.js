import Cartesian3 from "./Cartesian3.js";
import Check from "./Check.js";
import defined from "./defined.js";
import getTimestamp from "./getTimestamp.js";
import IntersectionTests from "./IntersectionTests.js";
import Matrix4 from "./Matrix4.js";
import OrientedBoundingBox from "./OrientedBoundingBox.js";
import Ray from "./Ray.js";

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
  var mX = 1.0 / ray.direction.x;
  var mY = 1.0 / ray.direction.y;
  var mZ = 1.0 / ray.direction.z;

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
function Triangle(
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
   * @type {Triangle[]}
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

/**
 * @param {Ray} ray
 * @param {Boolean} cullBackFaces
 * @param {TrianglePicking~VerticesFromTriangleIndex} verticesFromTriangleIndexCallback
 * @param {TraversalResult} result
 */
Node.prototype._intersectTriangles = function (
  ray,
  cullBackFaces,
  verticesFromTriangleIndexCallback,
  result
) {
  var triangleCount = this.triangles.length;
  for (var i = 0; i < triangleCount; i++) {
    var triIndex = this.triangles[i];

    var v0 = scratchV0;
    var v1 = scratchV1;
    var v2 = scratchV2;
    verticesFromTriangleIndexCallback(triIndex, v0, v1, v2);
    var triT = rayTriangleIntersect(ray, v0, v1, v2, cullBackFaces);

    if (triT !== invalidIntersection && triT < result.t) {
      result.t = triT;
      result.triangleIndex = triIndex;
      result.level = this.level;
      result.x = this.x;
      result.y = this.y;
      result.z = this.z;
    }
  }
};

/**
 * Find the closest intersection against the node's triangles, if there are any,
 * and recurse over children that might have a closer intersection.
 * Adapted from https://daeken.svbtle.com/a-stupidly-simple-fast-octree-traversal-for-ray-intersection
 *
 * @param {Ray} ray
 * @param {Ray} transformedRay
 * @param {Number} t
 * @param {Boolean} cullBackFaces
 * @param {TrianglePicking~VerticesFromTriangleIndex} verticesFromTriangleIndexCallback
 * @param {TraversalResult} result
 * @returns {TraversalResult}
 */
Node.prototype.rayIntersect = function (
  ray,
  transformedRay,
  t,
  cullBackFaces,
  verticesFromTriangleIndexCallback,
  result
) {
  this._intersectTriangles(
    ray,
    cullBackFaces,
    verticesFromTriangleIndexCallback,
    result
  );

  if (!defined(this.children)) {
    return result;
  }

  var dirX = transformedRay.direction.x;
  var dirY = transformedRay.direction.y;
  var dirZ = transformedRay.direction.z;

  var originX = transformedRay.origin.x + t * dirX;
  var originY = transformedRay.origin.y + t * dirY;
  var originZ = transformedRay.origin.z + t * dirZ;

  var sideX = originX >= this.aabbCenterX;
  var sideY = originY >= this.aabbCenterY;
  var sideZ = originZ >= this.aabbCenterZ;

  var canCrossX = sideX !== dirX >= 0.0;
  var canCrossY = sideY !== dirY >= 0.0;
  var canCrossZ = sideZ !== dirZ >= 0.0;

  var distX = canCrossX
    ? (this.aabbCenterX - originX) / dirX
    : invalidIntersection;
  var distY = canCrossY
    ? (this.aabbCenterY - originY) / dirY
    : invalidIntersection;
  var distZ = canCrossZ
    ? (this.aabbCenterZ - originZ) / dirZ
    : invalidIntersection;

  var minDist = 0;
  var childIdx =
    (sideX ? 1 : 0) | ((sideY ? 1 : 0) << 1) | ((sideZ ? 1 : 0) << 2);

  // There is a maximum of four possible child overlaps, but usually it's less than that.
  // Start by checking the one that the ray is inside, then move to the next closest, etc.
  for (var i = 0; i < 4; i++) {
    var child = this.children[childIdx];
    child.rayIntersect(
      ray,
      transformedRay,
      t + minDist,
      cullBackFaces,
      verticesFromTriangleIndexCallback,
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
        this.aabbMinX,
        this.aabbMaxX,
        this.aabbMinY,
        this.aabbMaxY,
        this.aabbMinZ,
        this.aabbMaxZ
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

/**
 * @typedef {Object} Overlap
 * @property {Number} bitMask
 * @property {Number} bitCount
 */

/**
 * @param {Number} nodeAabbCenterX
 * @param {Number} nodeAabbCenterY
 * @param {Number} nodeAabbCenterZ
 * @param {Triangle} triangle
 * @param {Overlap} result
 * @returns {Overlap}
 */
function getOverlap(
  nodeAabbCenterX,
  nodeAabbCenterY,
  nodeAabbCenterZ,
  triangle,
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

  if (triangle.aabbMinX > nodeAabbCenterX) {
    bitMask &= 170; // 10101010
    bitCount /= 2;
  } else if (triangle.aabbMaxX < nodeAabbCenterX) {
    bitMask &= 85; // 01010101
    bitCount /= 2;
  }

  if (triangle.aabbMinY > nodeAabbCenterY) {
    bitMask &= 204; // 11001100
    bitCount /= 2;
  } else if (triangle.aabbMaxY < nodeAabbCenterY) {
    bitMask &= 51; // 00110011
    bitCount /= 2;
  }

  if (triangle.aabbMinZ > nodeAabbCenterZ) {
    bitMask &= 240; // 11110000
    bitCount /= 2;
  } else if (triangle.aabbMaxZ < nodeAabbCenterZ) {
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
 * @param {Triangle} triangle
 * @param {Number} overlapMask
 */
Node.prototype._addTriangleToChildren = function (triangle, overlapMask) {
  for (var childIdx = 0; childIdx < 8; childIdx++) {
    var overlapsChild = (overlapMask & (1 << childIdx)) > 0;
    if (overlapsChild) {
      var childNode = this.children[childIdx];
      childNode.addTriangle(triangle);
    }
  }
};

/**
 * Adds triangle to tree.
 * If it's small enough, recursively add to child nodes.
 * There's potential for a triangle to belong to more than one child.
 * @param {Triangle} triangle
 */

Node.prototype.addTriangle = function (triangle) {
  var level = this.level;
  var x = this.x;
  var y = this.y;
  var z = this.z;

  var aabbCenterX = this.aabbCenterX;
  var aabbCenterY = this.aabbCenterY;
  var aabbCenterZ = this.aabbCenterZ;
  var overlap = getOverlap(
    aabbCenterX,
    aabbCenterY,
    aabbCenterZ,
    triangle,
    scratchOverlap0
  );
  var overlapBitCount = overlap.bitCount;
  var overlapBitMask = overlap.bitMask;

  // If the triangle is fairly small, recurse downwards to each of the child nodes it overlaps.
  var maxLevels = 10;
  var maxTrianglesPerNode = 50;
  var smallOverlapCount = 2;

  var tempTriangles = this.tempTriangles;
  var triangleIdxs = this.triangles;
  var triangleCount = triangleIdxs.length;
  var exceedsTriCount = triangleCount >= maxTrianglesPerNode;

  var isSmall = overlapBitCount <= smallOverlapCount;
  var atMaxLevel = level === maxLevels - 1;
  var shouldFilterDown = isSmall && !atMaxLevel;

  var hasChildren = defined(this.children);
  var subdivide = shouldFilterDown && !hasChildren && exceedsTriCount;
  var filterDown = shouldFilterDown && (hasChildren || subdivide);

  if (subdivide) {
    var childLevel = level + 1;
    var childXMin = x * 2 + 0;
    var childXMax = x * 2 + 1;
    var childYMin = y * 2 + 0;
    var childYMax = y * 2 + 1;
    var childZMin = z * 2 + 0;
    var childZMax = z * 2 + 1;

    this.children = new Array(
      new Node(childLevel, childXMin, childYMin, childZMin),
      new Node(childLevel, childXMax, childYMin, childZMin),
      new Node(childLevel, childXMin, childYMax, childZMin),
      new Node(childLevel, childXMax, childYMax, childZMin),
      new Node(childLevel, childXMin, childYMin, childZMax),
      new Node(childLevel, childXMax, childYMin, childZMax),
      new Node(childLevel, childXMin, childYMax, childZMax),
      new Node(childLevel, childXMax, childYMax, childZMax)
    );

    var tempTriangleLength = tempTriangles.length;
    for (var t = 0; t < tempTriangleLength; t++) {
      var overflowTri = tempTriangles[t];
      var overflowOverlap = getOverlap(
        aabbCenterX,
        aabbCenterY,
        aabbCenterZ,
        overflowTri,
        scratchOverlap1
      );
      this._addTriangleToChildren(overflowTri, overflowOverlap.bitMask);
    }
    triangleIdxs.length -= tempTriangles.length;
    this.tempTriangles = undefined;
  }

  if (filterDown) {
    this._addTriangleToChildren(triangle, overlapBitMask);
  } else if (isSmall) {
    triangleIdxs.push(triangle.index);
    tempTriangles.push(triangle);
  } else {
    triangleIdxs.unshift(triangle.index);
  }
};

function printDebugInfo(that) {
  var rootNode = that._rootNode;

  var triCount = 0;
  var triCountLeaf = 0;
  var nodeCount = 0;
  var nodeCountLeaf = 0;

  function accumTriCount(node) {
    var isLeaf = defined(node.children);

    var triCountNode = node.triangles.length;
    if (triCountNode > 0) {
      triCount += triCountNode;
      triCountLeaf += isLeaf ? triCountNode : 0;
      nodeCount += 1;
      nodeCountLeaf += isLeaf ? 1 : 0;
    }

    var children = node.children;
    if (defined(children)) {
      for (var i = 0; i < 8; i++) {
        accumTriCount(children[i]);
      }
    }
  }

  accumTriCount(rootNode);

  console.log(
    "tri count: " +
      triCount +
      " node count: " +
      nodeCount +
      " ratio: " +
      triCount / nodeCount +
      " ratio leaf: " +
      triCountLeaf / nodeCountLeaf
  );
}

var scratchTransform = new Matrix4();

/**
 * @constructor
 * @param {Number} triCount
 * @param {TrianglePicking~VerticesFromTriangleIndex} verticesFromTriangleIndexCallback
 * @param {OrientedBoundingBox} orientedBoundingBox
 */
function TrianglePicking(
  triCount,
  verticesFromTriangleIndexCallback,
  orientedBoundingBox
) {
  var time0 = getTimestamp();

  this._verticesFromTriangleIndexCallback = verticesFromTriangleIndexCallback;

  this._rootNode = new Node(0, 0, 0, 0);

  var transform = OrientedBoundingBox.toTransformation(
    orientedBoundingBox,
    scratchTransform
  );
  this._invTransform = Matrix4.inverse(transform, new Matrix4());
  var invTransform = this._invTransform;

  // Get local space AABBs for all triangles
  // Build the octree by adding each triangle one at a time.
  var triIdx = 0;
  for (triIdx = 0; triIdx < triCount; triIdx++) {
    this._verticesFromTriangleIndexCallback(
      triIdx,
      scratchV0,
      scratchV1,
      scratchV2
    );

    var v0Local = Matrix4.multiplyByPoint(invTransform, scratchV0, scratchV0);
    var v1Local = Matrix4.multiplyByPoint(invTransform, scratchV1, scratchV1);
    var v2Local = Matrix4.multiplyByPoint(invTransform, scratchV2, scratchV2);

    var triAabbMinX = Math.min(v0Local.x, v1Local.x, v2Local.x);
    var triAabbMaxX = Math.max(v0Local.x, v1Local.x, v2Local.x);
    var triAabbMinY = Math.min(v0Local.y, v1Local.y, v2Local.y);
    var triAabbMaxY = Math.max(v0Local.y, v1Local.y, v2Local.y);
    var triAabbMinZ = Math.min(v0Local.z, v1Local.z, v2Local.z);
    var triAabbMaxZ = Math.max(v0Local.z, v1Local.z, v2Local.z);

    var triangle = new Triangle(
      triIdx,
      triAabbMinX,
      triAabbMaxX,
      triAabbMinY,
      triAabbMaxY,
      triAabbMinZ,
      triAabbMaxZ
    );
    this._rootNode.addTriangle(triangle);
  }
  var time1 = getTimestamp();
  console.log("time: " + triCount + " " + (time1 - time0));
}

Object.defineProperties(TrianglePicking.prototype, {
  /**
   * Gets or set the function for retrieving the three triangle vertices from a triangle index.
   * @memberof TrianglePicking.prototype
   * @type {TrianglePicking~VerticesFromTriangleIndex}
   */
  verticesFromTriangleIndexCallback: {
    get: function () {
      return this._verticesFromTriangleIndexCallback;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.func("verticesFromTriangleIndexCallback", value);
      //>>includeEnd('debug');

      this._verticesFromTriangleIndexCallback = value;
    },
  },
});

var scratchTraversalResult = new TraversalResult();
var scratchTransformedRay = new Ray();

/**
 * @param {Ray} ray
 * @param {Cartesian3} result
 * @returns {Cartesian3} result
 */
TrianglePicking.prototype.rayIntersect = function (ray, cullBackFaces, result) {
  if (!defined(result)) {
    result = new Cartesian3();
  }
  var invTransform = this._invTransform;
  var rootNode = this._rootNode;

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
    cullBackFaces,
    this._verticesFromTriangleIndexCallback,
    traversalResult
  );

  if (traversalResult.t === invalidIntersection) {
    return undefined;
  }

  // printDebugInformation(this);

  result = Ray.getPoint(ray, traversalResult.t, result);
  return result;
};

/**
 * A function that gets the three vertices from a triangle index
 *
 * @callback TrianglePicking~VerticesFromTriangleIndex
 * @param {Number} triangleIndex
 * @param {Cartesian3} v0 The first vertex
 * @param {Cartesian3} v1 The second vertex
 * @param {Cartesian3} v2 The third vertex
 */
export default TrianglePicking;
