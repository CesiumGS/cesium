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
  // TODO only need the centre at this point!
  // var dimAtLevel = Math.pow(2, level);
  // var sizeAtLevel = 1.0 / dimAtLevel;
  var sizeAtLevel = 1.0 / Math.pow(2, level);
  return {
    x,
    y,
    z,
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
function Node() {
  // this.level = level;
  // this.x = x;
  // this.y = y;
  // this.z = z;
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

var scratchV0 = new Cartesian3();
var scratchV1 = new Cartesian3();
var scratchV2 = new Cartesian3();

/**
 * Find the closest intersection against the node's triangles, if there are any,
 * and recurse over children that might have a closer intersection.
 * Adapted from https://daeken.svbtle.com/a-stupidly-simple-fast-octree-traversal-for-ray-intersection
 *
 * @param {Node} node
 * @param {Ray} ray
 * @param {Ray} transformedRay
 * @param {Number} t
 * @param {Boolean} cullBackFaces
 * @param {TrianglePicking~TriangleVerticesCallback} triangleVerticesCallback
 * @param {TraversalResult} result
 * @returns {TraversalResult}
 */
function nodeRayIntersect(
  node,
  packedNodeIdx,
  packedNodes,
  packedTriangleSets,
  nodes,
  level,
  x,
  y,
  z,
  ray,
  transformedRay,
  t,
  cullBackFaces,
  triangleVerticesCallback,
  result
) {
  // var triCount = packedNodes[packedNodeIdx + 1];
  var nodeFirstChildIdx = packedNodes[packedNodeIdx];

  // console.assert(triCount === node.triangles.length);
  // if (triCount !== node.triangles.length) {
  //   console.error('whoops');
  // }
  // // console.assert(nodeFirstChildIdx === node.firstChildNodeIdx);
  // if (nodeFirstChildIdx !== node.firstChildNodeIdx) {
  //   console.error('whoops');
  // }

  nodeIntersectTriangles(
    node,
    packedNodes[packedNodeIdx],
    packedNodes[packedNodeIdx + 1],
    packedNodes[packedNodeIdx + 2],
    packedTriangleSets,
    ray,
    cullBackFaces,
    triangleVerticesCallback,
    result
  );

  // var noChildren = !defined(node.children) || node.children.length === 0;
  // var noChildAgain = node.firstChildNodeIdx === -1;
  var noChildAgain = nodeFirstChildIdx === -1;
  // console.assert(noChildren === noChildAgain);

  if (noChildAgain) {
    return result;
  }

  const onTheFlyAABB = onTheFlyNodeAABB(level, x, y, z);
  // recurse the node tree
  //  check if the node AABB contains the ray
  //  if so, recurse one layer down into the correct child

  var dirX = transformedRay.direction.x;
  var dirY = transformedRay.direction.y;
  var dirZ = transformedRay.direction.z;

  var originX = transformedRay.origin.x + t * dirX;
  var originY = transformedRay.origin.y + t * dirY;
  var originZ = transformedRay.origin.z + t * dirZ;

  var sideX = originX >= onTheFlyAABB.aabbCenterX;
  var sideY = originY >= onTheFlyAABB.aabbCenterY;
  var sideZ = originZ >= onTheFlyAABB.aabbCenterZ;

  var canCrossX = sideX !== dirX >= 0.0;
  var canCrossY = sideY !== dirY >= 0.0;
  var canCrossZ = sideZ !== dirZ >= 0.0;

  var distX = canCrossX
    ? (onTheFlyAABB.aabbCenterX - originX) / dirX
    : invalidIntersection;
  var distY = canCrossY
    ? (onTheFlyAABB.aabbCenterY - originY) / dirY
    : invalidIntersection;
  var distZ = canCrossZ
    ? (onTheFlyAABB.aabbCenterZ - originZ) / dirZ
    : invalidIntersection;

  var minDist = 0;
  var childIdx =
    (sideX ? 1 : 0) | ((sideY ? 1 : 0) << 1) | ((sideZ ? 1 : 0) << 2);

  // There is a maximum of four possible child overlaps, but usually it's less than that.
  // Start by checking the one that the ray is inside, then move to the next closest, etc.
  for (var i = 0; i < 4; i++) {
    // var oldChild = node.children[childIdx];
    var child = null; // nodes[node.firstChildNodeIdx + childIdx];
    // var child = packedNodes[packedNodeIdx + childIdx];

    // console.assert(oldChild === child);
    // for each level, x doubles
    var childXMin = x * 2;
    var childXMax = x * 2 + 1;
    var childYMin = y * 2;
    var childYMax = y * 2 + 1;
    var childZMin = z * 2;
    var childZMax = z * 2 + 1;
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
    var childNodeIdx = firstChildIdx * 3 + childIdx * 3; /* packed node space */
    // var childNodeTriangleCount = packedNodes[childNodeIdx + 1];
    // var childNodeTriangleSetIdx = packedNodes[childNodeIdx + 2];

    /// console.assert(childNodeTriangleCount === child.triangles.length);
    // if (childNodeTriangleCount !== child.triangles.length) {
    //   console.error('whoops');
    // }
    // for (var g = 0; g < child.triangles.length; g++) {
    //   var q = child.triangles[g];
    //   var packedT = packedTriangleSets[childNodeTriangleSetIdx + g];
    //   if (q !== packedT) {
    //     console.error('whoops');
    //   }
    // }
    nodeRayIntersect(
      child,
      childNodeIdx,
      packedNodes,
      packedTriangleSets,
      nodes,
      level + 1,
      _x,
      _y,
      _z,
      ray,
      transformedRay,
      t + minDist,
      cullBackFaces,
      triangleVerticesCallback,
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
        onTheFlyAABB.aabbMinX,
        onTheFlyAABB.aabbMaxX,
        onTheFlyAABB.aabbMinY,
        onTheFlyAABB.aabbMaxY,
        onTheFlyAABB.aabbMinZ,
        onTheFlyAABB.aabbMaxZ
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
}

/**
 * @param {Node} node
 * @param {Ray} ray
 * @param {Boolean} cullBackFaces
 * @param {TrianglePicking~TriangleVerticesCallback} triangleVerticesCallback
 * @param {TraversalResult} result
 */
function nodeIntersectTriangles(
  node,
  firstChildNodeIdx,
  triangleCount,
  triangleSetIdx,
  packedTriangleSets,
  ray,
  cullBackFaces,
  triangleVerticesCallback,
  result
) {
  // var triangleCount = node.triangles.length;
  // console.assert(newTriangleCount === triangleCount);
  // triangleCount = newTriangleCount;
  for (var i = 0; i < triangleCount; i++) {
    // var triIndex = node.triangles[i];
    var triIndex = packedTriangleSets[triangleSetIdx + i];
    // console.assert(triIndex === newtriIndex);
    // triIndex = newtriIndex;

    var v0 = scratchV0;
    var v1 = scratchV1;
    var v2 = scratchV2;
    triangleVerticesCallback(triIndex, v0, v1, v2);
    var triT = rayTriangleIntersect(ray, v0, v1, v2, cullBackFaces);

    if (triT !== invalidIntersection && triT < result.t) {
      result.t = triT;
      result.triangleIndex = triIndex;
      // result.level = node.level;
      // result.x = node.x;
      // result.y = node.y;
      // result.z = node.z;
    }
  }
}

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
 * @param {Node} node
 * @param {Triangle} triangle
 * @param {Number} overlapMask
 */
function nodeAddTriangleToChildren(
  node,
  level,
  x,
  y,
  z,
  triangle,
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
        childNode,
        level + 1,
        _x,
        _y,
        _z,
        triangle,
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

// If the triangle is fairly small, recurse downwards to each of the child nodes it overlaps.
var maxLevels = 5;
var maxTrianglesPerNode = 100;
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

function nodeAddTriangle(node, level, x, y, z, triangle, triangles, nodes) {
  var sizeAtLevel = 1.0 / Math.pow(2, level);
  var aabbCenterX = (x + 0.5) * sizeAtLevel - 0.5;
  var aabbCenterY = (y + 0.5) * sizeAtLevel - 0.5;
  var aabbCenterZ = (z + 0.5) * sizeAtLevel - 0.5;
  var overlap = getOverlap(
    aabbCenterX,
    aabbCenterY,
    aabbCenterZ,
    triangle,
    scratchOverlap0
  );
  var triangleIdxs = node.triangles;
  var exceedsTriCount = triangleIdxs.length >= maxTrianglesPerNode;
  // the current triangle is a good fit for the current node.
  //  it's either fully contained within the bounding box or 2 out of the 3 planes are contained within the AABB
  var isSmall = overlap.bitCount <= smallOverlapCount;
  var atMaxLevel = level === maxLevels - 1;
  var shouldFilterDown = isSmall && !atMaxLevel;
  var hasChildren = node.firstChildNodeIdx !== -1;
  // cut our current node up into 8 children, redistribute all triangles in the current node into new children
  var subdivide = shouldFilterDown && !hasChildren && exceedsTriCount;
  // put the current triangle further down in the tree
  var filterDown = shouldFilterDown && (hasChildren || subdivide);
  if (subdivide) {
    node.firstChildNodeIdx = nodes.length;
    nodes.push(
      new Node(),
      new Node(),
      new Node(),
      new Node(),
      new Node(),
      new Node(),
      new Node(),
      new Node()
    );
    for (let i = 0; i < triangleIdxs.length; i++) {
      var triidx = triangleIdxs[i];
      var overflowTri2 = triangles[triidx];
      var overflowOverlap2 = getOverlap(
        aabbCenterX,
        aabbCenterY,
        aabbCenterZ,
        overflowTri2,
        scratchOverlap1
      );

      nodeAddTriangleToChildren(
        node,
        level,
        x,
        y,
        z,
        overflowTri2,
        overflowOverlap2.bitMask,
        triangles,
        nodes
      );
    }
    triangleIdxs.length = 0;
  }
  if (filterDown) {
    nodeAddTriangleToChildren(
      node,
      level,
      x,
      y,
      z,
      triangle,
      overlap.bitMask,
      triangles,
      nodes
    );
  } else {
    triangleIdxs.push(triangle.index);
  }
}

/**
 * @param {TrianglePicking} that
 */
// function printDebugInfo(that) {
//   var rootNode = that._rootNode;
//
//   var triCount = 0;
//   var triCountLeaf = 0;
//   var nodeCount = 0;
//   var nodeCountLeaf = 0;
//
//   function accumTriCount(node) {
//     // var isLeaf = !children || !node.children.length;
//     var isLeaf = node.firstChildNodeIdx === -1;
//
//     var triCountNode = node.triangles.length;
//     if (triCountNode > 0) {
//       triCount += triCountNode;
//       triCountLeaf += isLeaf ? triCountNode : 0;
//       nodeCount += 1;
//       nodeCountLeaf += isLeaf ? 1 : 0;
//     }
//
//     var firstChildIdx = node.firstChildNodeIdx;
//     if (firstChildIdx !== -1) {
//       for (var i = 0; i < 8; i++) {
//         accumTriCount(that._nodes[firstChildIdx + i]);
//       }
//     }
//   }
//
//   accumTriCount(rootNode);
//   console.log(rootNode);
//   console.table({
//     tri_count : triCount,
//     node_count : nodeCount,
//     ratio : triCount / nodeCount,
//     ratioLeaf : triCountLeaf / nodeCountLeaf
//   });
// }

var scratchTransform = new Matrix4();

/**
 * @constructor
 * @param {Object} options
 * @param {OrientedBoundingBox} options.orientedBoundingBox
 * @param {TrianglePicking~TriangleVerticesCallback} [options.triangleVerticesCallback]
 */
function TrianglePicking(options) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object(
    "options.orientedBoundingBox",
    options.orientedBoundingBox
  );
  //>>includeEnd('debug');

  this._triangleVerticesCallback = options.triangleVerticesCallback;
  this._orientedBoundingBox = OrientedBoundingBox.clone(
    options.orientedBoundingBox
  );
  var transform = OrientedBoundingBox.toTransformation(
    this._orientedBoundingBox,
    scratchTransform
  );
  this._invTransform = Matrix4.inverse(transform, new Matrix4());
  this._rootNode = new Node(0, 0, 0, 0);
  this._nodes = [this._rootNode];
}

Object.defineProperties(TrianglePicking.prototype, {
  /**
   * Gets or set the function for retrieving the triangle vertices from a triangle index.
   * @memberof TrianglePicking.prototype
   * @type {TrianglePicking~TriangleVerticesCallback}
   */
  triangleVerticesCallback: {
    get: function () {
      return this._triangleVerticesCallback;
    },
    set: function (value) {
      this._triangleVerticesCallback = value;
    },
  },
});

/**
 * @param {Number} triangleIndex
 * @param {Number} triangleCount
 */
TrianglePicking.prototype.addTriangles = function (
  triangleIndex,
  triangleCount
) {
  console.time("creating triangles");
  var rootNode = this._rootNode;
  var invTransform = this._invTransform;
  var nodes = this._nodes;
  var triangleIndexEnd = triangleIndex + triangleCount;
  var triangleVerticesCallback = this._triangleVerticesCallback;

  var triangles = [];

  var i = 0;
  for (var triIdx2 = triangleIndex; triIdx2 < triangleIndexEnd; triIdx2++) {
    i++;
    triangleVerticesCallback(triIdx2, scratchV0, scratchV1, scratchV2);

    var v0Local2 = Matrix4.multiplyByPoint(invTransform, scratchV0, scratchV0);
    var v1Local2 = Matrix4.multiplyByPoint(invTransform, scratchV1, scratchV1);
    var v2Local2 = Matrix4.multiplyByPoint(invTransform, scratchV2, scratchV2);

    // Get local space AABBs for triangle
    var triAabbMinX2 = Math.min(v0Local2.x, v1Local2.x, v2Local2.x);
    var triAabbMaxX2 = Math.max(v0Local2.x, v1Local2.x, v2Local2.x);
    var triAabbMinY2 = Math.min(v0Local2.y, v1Local2.y, v2Local2.y);
    var triAabbMaxY2 = Math.max(v0Local2.y, v1Local2.y, v2Local2.y);
    var triAabbMinZ2 = Math.min(v0Local2.z, v1Local2.z, v2Local2.z);
    var triAabbMaxZ2 = Math.max(v0Local2.z, v1Local2.z, v2Local2.z);

    var triangle2 = new Triangle(
      triIdx2,
      triAabbMinX2,
      triAabbMaxX2,
      triAabbMinY2,
      triAabbMaxY2,
      triAabbMinZ2,
      triAabbMaxZ2
    );
    triangles.push(triangle2);
  }
  console.timeEnd("creating triangles");

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.func("triangleVerticesCallback", triangleVerticesCallback);
  //>>includeEnd('debug');
  console.time("creating actual octree");
  for (var x = 0; x < triangles.length; x++) {
    nodeAddTriangle(rootNode, 0, 0, 0, 0, triangles[x], triangles, nodes);
  }
  console.timeEnd("creating actual octree");
  console.time("creating packed");
  var packedNodeSpace = 3;
  var packedNodes = new Int32Array(nodes.length * packedNodeSpace);
  var triangleSets = [];
  var n;
  for (var w = 0; w < nodes.length; w++) {
    n = nodes[w];
    // a reference to the packed node index (*3)
    packedNodes[w * packedNodeSpace] = n.firstChildNodeIdx;
    // the number of triangles this node contains
    packedNodes[w * packedNodeSpace + 1] = n.triangles.length;
    // the index of the first triangle in thee packed triangles
    packedNodes[w * packedNodeSpace + 2] = triangleSets.length;
    triangleSets.push(...n.triangles);
  }
  var packedTriangles = new Int32Array(triangleSets);

  console.timeEnd("creating packed");

  console.timeEnd("creating octree");

  // function logNode(node, nodes, level, idx, treeNode) {
  //   // console.log(`node at ${level}/${idx} has ${node.triangles.length}`);
  //   treeNode.triangles = node.triangles.length;
  //   let firstChildNodeIdx = node.firstChildNodeIdx;
  //   if (firstChildNodeIdx !== -1) {
  //     for (var _df = firstChildNodeIdx; _df < firstChildNodeIdx + 8; _df++) {
  //       var _n = nodes[_df];
  //       var childTreeNode = {triangles: 0, children: []};
  //       treeNode.children.push(childTreeNode);
  //       logNode(_n, nodes, level + 1, firstChildNodeIdx - _df, childTreeNode);
  //     }
  //   }
  // }
  //
  // var tree = {triangles: 0, children: []};
  // logNode(nodes[0], nodes, 0, 0, tree);
  // console.log(tree);

  // var _l = 0;
  // for (var asdf = 0; asdf < nodes.length; asdf++) {
  //   n = nodes[asdf];
  //   console.log(`node at ${_l} has ${n.triangles.length}`);
  //   for (var _df = n.firstChildNodeIdx; _df < n.firstChildNodeIdx + 8; df++) {
  //     var _n = nodes[_df];
  //     console.log(`node at ${_l} has ${_n.triangles.length}`);
  //   }
  // }

  this._packedTriangles = packedTriangles;
  this._packedNodes = packedNodes;
  // printDebugInfo(this);
  // null these properties out so they don't get copied across the worker thead.
  //  instead we'll use their array buffer variants
  this._rootNode = null;
  this._nodes = null;
};

var scratchTraversalResult = new TraversalResult();
var scratchTransformedRay = new Ray();

/**
 * @param {Ray} ray
 * @param {Boolean} cullBackFaces
 * @param {Cartesian3} result
 * @returns {Cartesian3} result
 */
TrianglePicking.prototype.rayIntersect = function (ray, cullBackFaces, result) {
  if (!defined(result)) {
    result = new Cartesian3();
  }
  var invTransform = this._invTransform;
  var rootNode = null; //this._rootNode;
  var nodes = this._nodes;

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

  var traversalResult = scratchTraversalResult;
  traversalResult.reset();

  var t = rayCubeIntersect(transformedRay);
  if (t === invalidIntersection) {
    return undefined;
  }

  traversalResult = nodeRayIntersect(
    rootNode,
    0,
    packedNodes,
    packedTriangleSets,
    nodes,
    0,
    0,
    0,
    0,
    ray,
    transformedRay,
    t,
    cullBackFaces,
    this._triangleVerticesCallback,
    traversalResult
  );

  if (traversalResult.t === invalidIntersection) {
    return undefined;
  }

  // printDebugInfo(this);

  result = Ray.getPoint(ray, traversalResult.t, result);
  return result;
};

/**
 * @param {TrianglePicking} trianglePicking
 */
TrianglePicking.clone = function (trianglePicking) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("trianglePicking", trianglePicking);
  //>>includeEnd('debug');

  var result = new TrianglePicking({
    orientedBoundingBox: trianglePicking._orientedBoundingBox,
    triangleVerticesCallback: trianglePicking.triangleVerticesCallback,
  });

  result._rootNode = trianglePicking._rootNode;
  result._nodes = trianglePicking._nodes;
  result._packedTriangles = trianglePicking._packedTriangles;
  result._packedNodes = trianglePicking._packedNodes;
  return result;
};

/**
 * A function that gets the three vertices from a triangle index
 *
 * @callback TrianglePicking~TriangleVerticesCallback
 * @param {Number} triangleIndex The triangle index
 * @param {Cartesian3} v0 The first vertex
 * @param {Cartesian3} v1 The second vertex
 * @param {Cartesian3} v2 The third vertex
 */
export default TrianglePicking;
