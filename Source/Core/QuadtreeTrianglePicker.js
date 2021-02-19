import Cartesian3 from "./Cartesian3.js";
import defined from "./defined.js";
import Matrix4 from "./Matrix4.js";
import Ray from "./Ray.js";
import IntersectionTests from "./IntersectionTests.js";
import Rectangle from "./Rectangle.js";

function QuadtreeTrianglePicker(packedQuadtree, triangleVerticesCallback) {
  this._inverseTransform = Matrix4.unpack(packedQuadtree.inverseTransform);
  this._transform = Matrix4.unpack(packedQuadtree.transform);
  this._rectangle = Rectangle.unpack(packedQuadtree.rectangle);
  this._quadtree = packedQuadtree.quadtree;
  this._positions = packedQuadtree.positions;
  this._triangleVerticesCallback = triangleVerticesCallback;
  this._width = packedQuadtree.width;
  this._height = packedQuadtree.height;
}

function rayIntersectsQuadtreeNode(ray, node) {
  return rayIntersectsAABB(
    ray,
    node.topLeft.x,
    node.bottomRight.y,
    node.minHeight,
    node.bottomRight.x,
    node.topLeft.y,
    node.maxHeight
  );
}

function rayIntersectsAABB(ray, minX, minY, minZ, maxX, maxY, maxZ) {
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

var invalidIntersection = Number.MAX_VALUE;

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

function flatten(node) {
  if (!node) {
    return [];
  }
  return [node]
    .concat(flatten(node.topLeftTree))
    .concat(flatten(node.bottomLeftTree))
    .concat(flatten(node.topRightTree))
    .concat(flatten(node.bottomRightTree));
}

function loopThroughTrianglesForNode(node, positions, width, halfWidth) {
  var testedPoints = [];
  var testedTriangles = [];
  var numberOfQuadsAtThisLevel = Math.pow(2, node.level);
  var offsetX = node.topLeft.x * numberOfQuadsAtThisLevel;

  var numberOfPositionsInANodeAtThisLevel = width / numberOfQuadsAtThisLevel;

  var columnStart = numberOfPositionsInANodeAtThisLevel * offsetX + halfWidth;
  var columnEnd = columnStart + numberOfPositionsInANodeAtThisLevel;

  // y
  var offsetY = node.topLeft.y * numberOfQuadsAtThisLevel;
  var rowStart = numberOfPositionsInANodeAtThisLevel * offsetY + halfWidth;
  var rowEnd = rowStart + numberOfPositionsInANodeAtThisLevel;

  for (var row = rowStart; row < rowEnd; row++) {
    for (var col = columnStart; col < columnEnd; col++) {
      // find all triangles which have a vertex at this position

      var pos0X = positions[3 * (row * width + col - row - 1)];
      var pos0Y = positions[1 + 3 * (row * width + col - row - 1)];
      var pos0Z = positions[2 + 3 * (row * width + col - row - 1)];

      var pos1X = positions[3 * (row * width + col - row)];
      var pos1Y = positions[1 + 3 * (row * width + col - row)];
      var pos1Z = positions[2 + 3 * (row * width + col - row)];

      var pos2X = positions[3 * (row * width + col - row + 1)];
      var pos2Y = positions[1 + 3 * (row * width + col - row + 1)];
      var pos2Z = positions[2 + 3 * (row * width + col - row + 1)];

      var pos3X = positions[3 * (row * width + col - 1)];
      var pos3Y = positions[1 + 3 * (row * width + col - 1)];
      var pos3Z = positions[2 + 3 * (row * width + col - 1)];

      var pos4X = positions[3 * (row * width + col)];
      var pos4Y = positions[1 + 3 * (row * width + col)];
      var pos4Z = positions[2 + 3 * (row * width + col)];

      var pos5X = positions[3 * (row * width + col + 1)];
      var pos5Y = positions[1 + 3 * (row * width + col + 1)];
      var pos5Z = positions[2 + 3 * (row * width + col + 1)];

      var pos6X = positions[3 * (row * width + col + row - 1)];
      var pos6Y = positions[1 + 3 * (row * width + col + row - 1)];
      var pos6Z = positions[2 + 3 * (row * width + col + row - 1)];

      var pos7X = positions[3 * (row * width + col + row)];
      var pos7Y = positions[1 + 3 * (row * width + col + row)];
      var pos7Z = positions[2 + 3 * (row * width + col + row)];

      var pos8X = positions[3 * (row * width + col + row + 1)];
      var pos8Y = positions[1 + 3 * (row * width + col + row + 1)];
      var pos8Z = positions[2 + 3 * (row * width + col + row + 1)];

      var pos0 = new Cartesian3(pos0X, pos0Y, pos0Z);
      var pos1 = new Cartesian3(pos1X, pos1Y, pos1Z);
      var pos2 = new Cartesian3(pos2X, pos2Y, pos2Z);
      var pos3 = new Cartesian3(pos3X, pos3Y, pos3Z);
      var pos4 = new Cartesian3(pos4X, pos4Y, pos4Z);
      var pos5 = new Cartesian3(pos5X, pos5Y, pos5Z);
      var pos6 = new Cartesian3(pos6X, pos6Y, pos6Z);
      var pos7 = new Cartesian3(pos7X, pos7Y, pos7Z);
      var pos8 = new Cartesian3(pos8X, pos8Y, pos8Z);

      var triangle0 = [pos0, pos1, pos3];
      var triangle1 = [pos1, pos2, pos4];
      var triangle2 = [pos1, pos3, pos4];
      var triangle3 = [pos2, pos4, pos5];
      var triangle4 = [pos3, pos4, pos6];
      var triangle5 = [pos4, pos5, pos7];
      var triangle6 = [pos4, pos6, pos7];
      var triangle7 = [pos5, pos7, pos8];

      testedTriangles.push(
        triangle0,
        triangle1,
        triangle2,
        triangle3,
        triangle4,
        triangle5,
        triangle6,
        triangle7
      );

      testedPoints.push(pos4);
    }
  }
  return {
    testedTriangles: testedTriangles,
    testedPoints: testedPoints,
  };
}

/**
 * @param {Ray} ray
 * @param {Boolean} cullBackFaces
 * @param {Cartesian3} result
 * @returns {Cartesian3} result
 */
QuadtreeTrianglePicker.prototype.rayIntersect = function (
  ray,
  cullBackFaces,
  result,
  traceDetails
) {
  if (!defined(result)) {
    result = new Cartesian3();
  }

  var allQuadTreeNodes = flatten(this._quadtree);
  if (traceDetails) {
    traceDetails.rectangle = this._rectangle;
    traceDetails.transform = this._transform;
    traceDetails.inverseTransform = this._inverseTransform;
    traceDetails.positions = this._positions;
    traceDetails.width = this._width;
    traceDetails.height = this._height;

    // mark every node as not hit first
    allQuadTreeNodes.forEach(function (n) {
      n.isHit = false;
      n.isSpecial = false;
    });
  }

  var invTransform = this._inverseTransform;
  var transformedRay = new Ray();
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

  var quadtree = this._quadtree;
  var t = 0;

  // from here: http://publications.lib.chalmers.se/records/fulltext/250170/250170.pdf

  // find all the quadtree nodes which intersects

  var nodeToTrackTrianglesFor = null;

  var queue = [quadtree];
  var intersections = [];
  while (queue.length) {
    var n = queue.pop();
    var intersection = rayIntersectsQuadtreeNode(transformedRay, n);
    if (intersection.intersection) {
      if (traceDetails) {
        if (n.level === 2 && !nodeToTrackTrianglesFor) {
          nodeToTrackTrianglesFor = n;
          n.isSpecial = true;
        }
        // if we're tracking hit nodes - mark the hit nodes as hit
        n.isHit = true;
      }

      var isLeaf = !n.bottomLeftTree;
      if (isLeaf) {
        intersections.push({
          node: n,
          tMin: intersection.tMin,
          tMax: intersection.tMax,
        });
      } else {
        queue.push(
          n.topLeftTree,
          n.topRightTree,
          n.bottomLeftTree,
          n.bottomRightTree
        );
      }
    }
  }

  // sort each intersection node by tMin ascending
  var sortedTests = intersections.sort(function (a, b) {
    return a.tMin - b.tMin;
  });

  // nodeToTrackTrianglesFor = allQuadTreeNodes.find(function (n) {
  //   return n.node.level === 1;
  // });

  var width = this._width - 1;
  var height = this._height - 1;
  var positions = this._positions;

  var halfWidth = width / 2;

  /// closest intersection point
  var minT = invalidIntersection;

  // var testedTriangles = [];
  // var testedPoints = [];

  if (traceDetails) {
    traceDetails.nodeToTrackTrianglesFor = nodeToTrackTrianglesFor;
    if (nodeToTrackTrianglesFor) {
      var loopResults = loopThroughTrianglesForNode(
        nodeToTrackTrianglesFor,
        positions,
        width,
        halfWidth
      );
      traceDetails.coolTriangles = loopResults.testedTriangles;
      traceDetails.coolPoints = loopResults.testedPoints;
    }
  }

  // for each intersected node - test every triangle which falls in that node
  for (var ii = 0; ii < sortedTests.length; ii++) {
    var test = sortedTests[ii];

    var numberOfQuadsAtThisLevel = Math.pow(2, test.node.level);
    var offsetX = test.node.topLeft.x * numberOfQuadsAtThisLevel;

    var numberOfPositionsInANodeAtThisLevel = width / numberOfQuadsAtThisLevel;

    var columnStart = numberOfPositionsInANodeAtThisLevel * offsetX + halfWidth;
    var columnEnd = columnStart + numberOfPositionsInANodeAtThisLevel;

    // y
    var offsetY = test.node.topLeft.y * numberOfQuadsAtThisLevel;
    var rowStart = numberOfPositionsInANodeAtThisLevel * offsetY + halfWidth;
    var rowEnd = rowStart + numberOfPositionsInANodeAtThisLevel;

    for (var row = rowStart; row < rowEnd; row++) {
      for (var col = columnStart; col < columnEnd; col++) {
        // find all triangles which have a vertex at this position

        var pos0X = positions[3 * (row * width + col - row - 1)];
        var pos0Y = positions[1 + 3 * (row * width + col - row - 1)];
        var pos0Z = positions[2 + 3 * (row * width + col - row - 1)];

        var pos1X = positions[3 * (row * width + col - row)];
        var pos1Y = positions[1 + 3 * (row * width + col - row)];
        var pos1Z = positions[2 + 3 * (row * width + col - row)];

        var pos2X = positions[3 * (row * width + col - row + 1)];
        var pos2Y = positions[1 + 3 * (row * width + col - row + 1)];
        var pos2Z = positions[2 + 3 * (row * width + col - row + 1)];

        var pos3X = positions[3 * (row * width + col - 1)];
        var pos3Y = positions[1 + 3 * (row * width + col - 1)];
        var pos3Z = positions[2 + 3 * (row * width + col - 1)];

        var pos4X = positions[3 * (row * width + col)];
        var pos4Y = positions[1 + 3 * (row * width + col)];
        var pos4Z = positions[2 + 3 * (row * width + col)];

        var pos5X = positions[3 * (row * width + col + 1)];
        var pos5Y = positions[1 + 3 * (row * width + col + 1)];
        var pos5Z = positions[2 + 3 * (row * width + col + 1)];

        var pos6X = positions[3 * (row * width + col + row - 1)];
        var pos6Y = positions[1 + 3 * (row * width + col + row - 1)];
        var pos6Z = positions[2 + 3 * (row * width + col + row - 1)];

        var pos7X = positions[3 * (row * width + col + row)];
        var pos7Y = positions[1 + 3 * (row * width + col + row)];
        var pos7Z = positions[2 + 3 * (row * width + col + row)];

        var pos8X = positions[3 * (row * width + col + row + 1)];
        var pos8Y = positions[1 + 3 * (row * width + col + row + 1)];
        var pos8Z = positions[2 + 3 * (row * width + col + row + 1)];

        var pos0 = new Cartesian3(pos0X, pos0Y, pos0Z);
        var pos1 = new Cartesian3(pos1X, pos1Y, pos1Z);
        var pos2 = new Cartesian3(pos2X, pos2Y, pos2Z);
        var pos3 = new Cartesian3(pos3X, pos3Y, pos3Z);
        var pos4 = new Cartesian3(pos4X, pos4Y, pos4Z);
        var pos5 = new Cartesian3(pos5X, pos5Y, pos5Z);
        var pos6 = new Cartesian3(pos6X, pos6Y, pos6Z);
        var pos7 = new Cartesian3(pos7X, pos7Y, pos7Z);
        var pos8 = new Cartesian3(pos8X, pos8Y, pos8Z);

        var triangle0 = [pos0, pos1, pos3];
        var triangle1 = [pos1, pos2, pos4];
        var triangle2 = [pos1, pos3, pos4];
        var triangle3 = [pos2, pos4, pos5];
        var triangle4 = [pos3, pos4, pos6];
        var triangle5 = [pos4, pos5, pos7];
        var triangle6 = [pos4, pos6, pos7];
        var triangle7 = [pos5, pos7, pos8];

        // testedTriangles.push(
        //   triangle0,
        //   triangle1,
        //   triangle2,
        //   triangle3,
        //   triangle4,
        //   triangle5,
        //   triangle6,
        //   triangle7
        // );
        //
        // testedPoints.push(pos4);
        //
        // if (traceDetails) {
        //   traceDetails.coolTriangles = testedTriangles;
        //   traceDetails.coolPoints = testedPoints;
        // }

        var intersects0 = rayTriangleIntersect(
          ray,
          triangle0[0],
          triangle0[1],
          triangle0[2],
          cullBackFaces
        );
        var intersects1 = rayTriangleIntersect(
          ray,
          triangle1[0],
          triangle1[1],
          triangle1[2],
          cullBackFaces
        );
        var intersects2 = rayTriangleIntersect(
          ray,
          triangle2[0],
          triangle2[1],
          triangle2[2],
          cullBackFaces
        );
        var intersects3 = rayTriangleIntersect(
          ray,
          triangle3[0],
          triangle3[1],
          triangle3[2],
          cullBackFaces
        );
        var intersects4 = rayTriangleIntersect(
          ray,
          triangle4[0],
          triangle4[1],
          triangle4[2],
          cullBackFaces
        );
        var intersects5 = rayTriangleIntersect(
          ray,
          triangle5[0],
          triangle5[1],
          triangle5[2],
          cullBackFaces
        );
        var intersects6 = rayTriangleIntersect(
          ray,
          triangle6[0],
          triangle6[1],
          triangle6[2],
          cullBackFaces
        );
        var intersects7 = rayTriangleIntersect(
          ray,
          triangle7[0],
          triangle7[1],
          triangle7[2],
          cullBackFaces
        );

        if (intersects0 !== invalidIntersection) {
          minT = Math.min(intersects0, minT);
        }
        if (intersects1 !== invalidIntersection) {
          minT = Math.min(intersects1, minT);
        }
        if (intersects2 !== invalidIntersection) {
          minT = Math.min(intersects2, minT);
        }
        if (intersects3 !== invalidIntersection) {
          minT = Math.min(intersects3, minT);
        }
        if (intersects4 !== invalidIntersection) {
          minT = Math.min(intersects4, minT);
        }
        if (intersects5 !== invalidIntersection) {
          minT = Math.min(intersects5, minT);
        }
        if (intersects6 !== invalidIntersection) {
          minT = Math.min(intersects6, minT);
        }
        if (intersects7 !== invalidIntersection) {
          minT = Math.min(intersects7, minT);
        }
      }
    }
  }

  if (minT !== invalidIntersection) {
    var result = Ray.getPoint(ray, minT);
    return result;
  }

  return undefined;
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
export default QuadtreeTrianglePicker;
