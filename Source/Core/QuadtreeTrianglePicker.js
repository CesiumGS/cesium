import Cartesian3 from "./Cartesian3.js";
import defined from "./defined.js";
import Matrix4 from "./Matrix4.js";
import Ray from "./Ray.js";
import IntersectionTests from "./IntersectionTests.js";
import Rectangle from "./Rectangle.js";

function QuadtreeTrianglePicker(packedQuadtree, encoding, vertices) {
  this._inverseTransform = Matrix4.unpack(packedQuadtree.inverseTransform);
  this._transform = Matrix4.unpack(packedQuadtree.transform);
  this._rectangle = Rectangle.unpack(packedQuadtree.rectangle);
  this._quadtree = packedQuadtree.quadtree;
  this._positions = packedQuadtree.positions;
  this._encoding = encoding;
  this._vertices = vertices;
  this._width = packedQuadtree.width;
  this._height = packedQuadtree.height;
  this._skirtHeight = packedQuadtree.skirtHeight;
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

function rayTriIntersect(ray, v0, v1, v2, cullBackFaces) {
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

QuadtreeTrianglePicker.getPosition = function (
  positions,
  width,
  height,
  row,
  col,
  hasSkirting,
  encoding,
  vertices
) {
  // why invert the row here? IDK!
  // first row becomes the last row and last row becomes the first
  // TODO why is this so?
  var rowInvert = height - row - 1;
  var colIdx = col; // * 3;
  var widthIdx = width; // * 3;
  var baseIdx = rowInvert * widthIdx + colIdx;

  var x = positions[baseIdx];
  var y = positions[1 + baseIdx];
  var z = positions[2 + baseIdx];

  return new Cartesian3(x, y, z);
};

QuadtreeTrianglePicker.getDimensionBounds = function (
  level,
  width,
  height,
  topLeftX,
  topLeftY
) {
  var numberOfQuadsAtThisLevel = Math.pow(2, level);
  var offsetX = topLeftX * numberOfQuadsAtThisLevel;
  var halfWidth = width / 2;

  var pointsPerNodeX = width / numberOfQuadsAtThisLevel;
  var columnStart = Math.max(0, pointsPerNodeX * offsetX + halfWidth - 1);
  var columnEnd = Math.min(columnStart + pointsPerNodeX, width - 1);

  var offsetY = topLeftY * numberOfQuadsAtThisLevel;
  var rowStart = Math.max(0, pointsPerNodeX * offsetY + halfWidth - 1);
  var rowEnd = Math.min(rowStart + pointsPerNodeX, height - 1);

  return {
    rowStart: Math.floor(rowStart),
    rowEnd: Math.ceil(rowEnd),
    columnStart: Math.floor(columnStart),
    columnEnd: Math.ceil(columnEnd),
  };
};

QuadtreeTrianglePicker.getTrianglesWithinNode = function (
  node,
  positions,
  ray,
  cullBackFaces,
  width,
  height,
  hasSkirting,
  encoding,
  vertices
) {
  var testedPoints = [];
  var testedTriangles = [];

  var intersectedTriangle = null;

  var dimensionBounds = QuadtreeTrianglePicker.getDimensionBounds(
    node.level,
    width,
    height,
    node.topLeft.x,
    node.topLeft.y
  );
  var rowStart = dimensionBounds.rowStart;
  var rowEnd = dimensionBounds.rowEnd;
  var columnStart = dimensionBounds.columnStart;
  var columnEnd = dimensionBounds.columnEnd;

  function getPos(row, col) {
    return QuadtreeTrianglePicker.getPosition(
      positions,
      width,
      height,
      row,
      col,
      hasSkirting,
      encoding,
      vertices
    );
  }

  var minT = invalidIntersection;

  for (var row = rowStart; row < rowEnd; row++) {
    for (var col = columnStart; col < columnEnd; col++) {
      // 0         1
      // +---------+
      // |X    T1  |
      // |  X      |
      // |    X    |
      // |  T2  X  |
      // |        X|
      // +---------+
      // 2         3
      var pos0 = getPos(row, col);
      var pos1 = getPos(row, col + 1);
      var pos2 = getPos(row + 1, col);
      var pos3 = getPos(row + 1, col + 1);

      var tri0 = [pos0, pos1, pos3];
      var tri1 = [pos0, pos2, pos3];

      var i0 = rayTriIntersect(ray, tri0[0], tri0[1], tri0[2], cullBackFaces);
      var i1 = rayTriIntersect(ray, tri1[0], tri1[1], tri1[2], cullBackFaces);

      testedTriangles.push(tri0, tri1);

      if (i0 !== invalidIntersection && i0 < minT) {
        intersectedTriangle = tri0;
        minT = Math.min(minT, i0, i1);
      }
      if (i1 !== invalidIntersection && i1 < minT) {
        intersectedTriangle = tri1;
        minT = Math.min(minT, i0, i1);
      }
    }
  }
  return {
    testedTriangles: testedTriangles,
    testedPoints: testedPoints,
    nodeMinT: minT,
    intersectedTriangle: intersectedTriangle,
  };
};

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

  var nodeToTrackTrianglesFor = quadtree.topLeftTree.bottomRightTree;
  if (traceDetails) {
    nodeToTrackTrianglesFor.isSpecial = true;
  }

  var queue = [quadtree];
  var intersections = [];
  while (queue.length) {
    var n = queue.pop();
    var intersection = rayIntersectsQuadtreeNode(transformedRay, n);
    if (intersection.intersection) {
      if (traceDetails) {
        // if (n.level === 2 && !nodeToTrackTrianglesFor) {
        //   nodeToTrackTrianglesFor = n;
        //   n.isSpecial = true;
        // }
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

  var skirtHeight = this._skirtHeight;
  var hasSkirting = skirtHeight > 0;
  var width = this._width;
  var height = this._height;
  var positions = this._positions;
  var encoding = this._encoding;
  var vertices = this._vertices;

  /// closest intersection point
  var minT = invalidIntersection;

  // var testedTriangles = [];
  // var testedPoints = [];

  if (traceDetails) {
    traceDetails.coolPoints = [];
    traceDetails.coolTriangles = [];
    traceDetails.nodeToTrackTrianglesFor = nodeToTrackTrianglesFor;
    if (nodeToTrackTrianglesFor) {
      // var loopResults = loopThroughTrianglesForNode(
      //   nodeToTrackTrianglesFor,
      //   positions,
      //   ray,
      //   cullBackFaces,
      //   width,
      //   skirtHeight
      // );
      // traceDetails.coolPoints = (traceDetails.coolPoints || []).concat(
      //   loopResults.testedPoints
      // );
    }

    // function getPos(row, col) {
    //   return QuadtreeTrianglePicker.getPosition(
    //     positions,
    //     width,
    //     height,
    //     row,
    //     col,
    //     hasSkirting
    //   );
    // }
    //
    // var firstPoints = [];
    // firstPoints.push(getPos(0, 0));
    // firstPoints.push(getPos(0, 1));
    // firstPoints.push(getPos(0, 2));
    // firstPoints.push(getPos(1, 0));
    // firstPoints.push(getPos(1, 1));
    // firstPoints.push(getPos(1, 2));
    //
    // firstPoints.push(getPos(2, 0));
    // firstPoints.push(getPos(2, 1));
    // firstPoints.push(getPos(2, 2));
    //
    // traceDetails.firstPointsInHeightmap = firstPoints;
  }

  // for each intersected node - test every triangle which falls in that node
  for (var ii = 0; ii < sortedTests.length; ii++) {
    var test = sortedTests[ii];

    var intersectionResult = QuadtreeTrianglePicker.getTrianglesWithinNode(
      test.node,
      positions,
      ray,
      cullBackFaces,
      width,
      height,
      hasSkirting,
      encoding,
      vertices
    );
    minT = Math.min(intersectionResult.nodeMinT, minT);

    if (traceDetails) {
      traceDetails.coolPoints = traceDetails.coolPoints.concat(
        intersectionResult.testedPoints
      );
      traceDetails.coolTriangles = traceDetails.coolTriangles.concat(
        intersectionResult.testedTriangles
      );
    }

    if (minT !== invalidIntersection) {
      if (traceDetails) {
        traceDetails.newIntersectedTriangle =
          intersectionResult.intersectedTriangle;
      }
      // found our first intersection - we can bail early!
      break;
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
