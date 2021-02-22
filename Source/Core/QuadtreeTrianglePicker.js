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
  col
) {
  var colIdx = col * 3;
  var widthIdx = width * 3;

  var rowIdx = height - row;

  var x = positions[rowIdx * widthIdx + colIdx];
  var y = positions[1 + (rowIdx * widthIdx + colIdx)];
  var z = positions[2 + (rowIdx * widthIdx + colIdx)];

  return new Cartesian3(x, y, z);
};

function getDimensionBounds(level, width, x, y, skirtHeight) {
  var numberOfQuadsAtThisLevel = Math.pow(2, level);
  var offsetX = x * numberOfQuadsAtThisLevel;
  var halfWidth = width / 2;

  var numberOfPositionsInANodeAtThisLevel = width / numberOfQuadsAtThisLevel;

  var columnStart = numberOfPositionsInANodeAtThisLevel * offsetX + halfWidth;
  var columnEnd = columnStart + numberOfPositionsInANodeAtThisLevel;

  var offsetY = y * numberOfQuadsAtThisLevel;
  var rowStart = numberOfPositionsInANodeAtThisLevel * offsetY + halfWidth;
  var rowEnd = rowStart + numberOfPositionsInANodeAtThisLevel;

  // if (skirtHeight > 0.0) {
  //   rowStart++;
  //   rowEnd++;
  //   columnStart++;
  //   columnEnd++;
  // }

  return {
    rowStart: Math.floor(rowStart),
    rowEnd: Math.floor(rowEnd),
    columnStart: Math.floor(columnStart),
    columnEnd: Math.floor(columnEnd),
  };
}

QuadtreeTrianglePicker.getPositionsInSegment = function (
  positions,
  width,
  height,
  x,
  y,
  level,
  skirtHeight
) {
  var dimensionBounds = getDimensionBounds(level, width, x, y, skirtHeight);
  var rowStart = dimensionBounds.rowStart;
  var rowEnd = dimensionBounds.rowEnd;
  var columnStart = dimensionBounds.columnStart;
  var columnEnd = dimensionBounds.columnEnd;

  var matchedPositions = [];

  for (var row = rowStart; row < rowEnd; row++) {
    for (var col = columnStart; col < columnEnd; col++) {
      var pos = QuadtreeTrianglePicker.getPosition(
        positions,
        width,
        height,
        row,
        col
      );
      matchedPositions.push(pos);
    }
  }
  return matchedPositions;
};

function loopThroughTrianglesForNode(
  node,
  positions,
  ray,
  cullBackFaces,
  width,
  height,
  skirtHeight
) {
  var testedPoints = [];
  var testedTriangles = [];

  var dimensionBounds = getDimensionBounds(
    node.level,
    width,
    node.topLeft.x,
    node.topLeft.y,
    skirtHeight
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
      col
    );
  }

  var minT = invalidIntersection;

  for (var row = rowStart; row < rowEnd; row++) {
    for (var col = columnStart; col < columnEnd; col++) {
      // -1 row; -1 col
      var pos0 = getPos(row - 1, col - 1);
      // -1 row; +0 col
      var pos1 = getPos(row - 1, col);
      // -1 row; +1 col
      var pos2 = getPos(row - 1, col + 1);
      // +0 row; -1 col
      var pos3 = getPos(row, col - 1);
      // +0 row; +0 col
      var pos4 = getPos(row, col);
      // +0 row; +1 col
      var pos5 = getPos(row, col + 1);
      // +0 row; -1 col
      var pos6 = getPos(row, col - 1);
      // +1 row; +0 col
      var pos7 = getPos(row + 1, col);
      // +1 row; +1 col
      var pos8 = getPos(row + 1, col + 1);

      var tri0 = [pos0, pos1, pos3];
      var tri1 = [pos1, pos2, pos4];
      var tri2 = [pos1, pos3, pos4];
      var tri3 = [pos2, pos4, pos5];
      var tri4 = [pos3, pos4, pos6];
      var tri5 = [pos4, pos5, pos7];
      var tri6 = [pos4, pos6, pos7];
      var tri7 = [pos5, pos7, pos8];

      var i0 = rayTriIntersect(ray, tri0[0], tri0[1], tri0[2], cullBackFaces);
      var i1 = rayTriIntersect(ray, tri1[0], tri1[1], tri1[2], cullBackFaces);
      var i2 = rayTriIntersect(ray, tri2[0], tri2[1], tri2[2], cullBackFaces);
      var i3 = rayTriIntersect(ray, tri3[0], tri3[1], tri3[2], cullBackFaces);
      var i4 = rayTriIntersect(ray, tri4[0], tri4[1], tri4[2], cullBackFaces);
      var i5 = rayTriIntersect(ray, tri5[0], tri5[1], tri5[2], cullBackFaces);
      var i6 = rayTriIntersect(ray, tri6[0], tri6[1], tri6[2], cullBackFaces);
      var i7 = rayTriIntersect(ray, tri7[0], tri7[1], tri7[2], cullBackFaces);

      minT = Math.min(minT, i0, i1, i2, i3, i4, i5, i6, i7, minT);

      testedPoints.push(pos4);
      testedTriangles.push(tri0, tri1, tri2, tri3, tri4, tri5, tri6, tri7);
    }
  }
  return {
    testedTriangles: testedTriangles,
    testedPoints: testedPoints,
    nodeMinT: minT,
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

  var width = this._width;
  var height = this._height;
  var positions = this._positions;
  var skirtHeight = this._skirtHeight;

  var halfWidth = width / 2;

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

    function getPos(row, col) {
      return QuadtreeTrianglePicker.getPosition(
        positions,
        width,
        height,
        row,
        col
      );
    }

    var firstPoints = [];
    firstPoints.push(getPos(0, 0));
    firstPoints.push(getPos(0, 1));
    firstPoints.push(getPos(0, 2));
    firstPoints.push(getPos(1, 0));
    firstPoints.push(getPos(1, 1));
    firstPoints.push(getPos(1, 2));

    firstPoints.push(getPos(2, 0));
    firstPoints.push(getPos(2, 1));
    firstPoints.push(getPos(2, 2));

    traceDetails.firstPointsInHeightmap = firstPoints;
  }

  // for each intersected node - test every triangle which falls in that node
  for (var ii = 0; ii < sortedTests.length; ii++) {
    var test = sortedTests[ii];

    var intersectionResult = loopThroughTrianglesForNode(
      test.node,
      positions,
      ray,
      cullBackFaces,
      width,
      height,
      skirtHeight
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
