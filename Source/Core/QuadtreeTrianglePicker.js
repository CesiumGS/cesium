import Cartesian3 from "./Cartesian3.js";
import defined from "./defined.js";
import Matrix4 from "./Matrix4.js";
import Ray from "./Ray.js";
import IntersectionTests from "./IntersectionTests.js";
import Rectangle from "./Rectangle.js";

function QuadtreeTrianglePicker(packedQuadtree, encoding, vertices, indices) {
  this._inverseTransform = Matrix4.unpack(packedQuadtree.inverseTransform);
  this._transform = Matrix4.unpack(packedQuadtree.transform);
  this._rectangle = Rectangle.unpack(packedQuadtree.rectangle);
  this._quadtree = packedQuadtree.quadtree;
  this._positions = packedQuadtree.positions;
  this._encoding = encoding;
  this._vertices = vertices;
  this._indices = indices;
  this.obb = packedQuadtree.orientedBoundingBox;
  this.sphere = packedQuadtree.boundingSphere3D;

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

function getBasePosition(row, col, width, height) {
  // don't ask why these are switched - I have no idea
  // I thought just the rotation of the grid should do it
  //  but for some reason it needs this to.
  var tmp = col;
  col = row;
  row = tmp;
  // does a rotation of the matrix by 90 degrees clockwise
  //  as it's being looked up.
  return (
    (height - 2 - Math.min(col, width - 2)) * (width - 1) * 2 +
    2 * Math.min(row, height - 2)
  );
}

QuadtreeTrianglePicker.getTrianglesWithinNode = function (
  node,
  positions,
  ray,
  cullBackFaces,
  width,
  height,
  hasSkirting,
  e,
  v,
  i
) {
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

  var minT = invalidIntersection;

  for (var row = rowStart; row < rowEnd; row++) {
    for (var col = columnStart; col < columnEnd; col++) {
      // 0         1
      // +---------+
      // |X   T0   |
      // |  X      |
      // |    X    |
      // | T1   X  |
      // |        X|
      // +---------+
      // 2         3

      var t0Idx = getBasePosition(row, col, width, height);
      var t1Idx = t0Idx + 1; // just the triangle next door
      var t0v0 = e.decodePosition(v, i[t0Idx * 3], new Cartesian3());
      var t0v1 = e.decodePosition(v, i[t0Idx * 3 + 1], new Cartesian3());
      var t0v2 = e.decodePosition(v, i[t0Idx * 3 + 2], new Cartesian3());
      var t1v0 = e.decodePosition(v, i[t1Idx * 3], new Cartesian3());
      var t1v1 = e.decodePosition(v, i[t1Idx * 3 + 1], new Cartesian3());
      var t1v2 = e.decodePosition(v, i[t1Idx * 3 + 2], new Cartesian3());

      var tri0 = [t0v0, t0v1, t0v2];
      var tri1 = [t1v0, t1v1, t1v2];

      var i0 = rayTriIntersect(ray, t0v0, t0v1, t0v2, cullBackFaces);
      var i1 = rayTriIntersect(ray, t1v0, t1v1, t1v2, cullBackFaces);

      testedTriangles.push(tri0, tri1);

      if (i0 !== invalidIntersection && i0 < minT) {
        intersectedTriangle = tri0;
      }
      if (i1 !== invalidIntersection && i1 < minT) {
        intersectedTriangle = tri1;
      }

      minT = Math.min(minT, i0, i1);
    }
  }
  return {
    testedTriangles: testedTriangles,
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

  if (traceDetails) {
    traceDetails.rectangle = this._rectangle;
    traceDetails.transform = this._transform;
    traceDetails.inverseTransform = this._inverseTransform;
    traceDetails.positions = this._positions;
    traceDetails.width = this._width;
    traceDetails.height = this._height;

    // mark every node as not hit first
    var stack = [this._quadtree];
    while (stack.length) {
      var _n = stack.pop();
      if (_n.topLeftTree) {
        stack.push(
          _n.topLeftTree,
          _n.topRightTree,
          _n.bottomLeftTree,
          _n.bottomRightTree
        );
      }
      _n.isHit = false;
    }
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

  // from here: http://publications.lib.chalmers.se/records/fulltext/250170/250170.pdf
  // find all the quadtree nodes which intersects
  var queue = [quadtree];
  var intersections = [];
  while (queue.length) {
    var n = queue.pop();
    var intersection = rayIntersectsQuadtreeNode(transformedRay, n);
    if (intersection.intersection) {
      if (traceDetails) {
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

  var skirtHeight = this._skirtHeight;
  var hasSkirting = skirtHeight > 0;
  var width = this._width;
  var height = this._height;
  var positions = this._positions;
  var encoding = this._encoding;
  var vertices = this._vertices;
  var indices = this._indices;

  /// closest intersection point
  var minT = invalidIntersection;

  if (traceDetails) {
    traceDetails.testedPoints = [];
    traceDetails.testedTriangles = [];

    var i = -1;
    while (i++ < 100) {
      var t0v0 = encoding.decodePosition(
        vertices,
        indices[i * 3],
        new Cartesian3()
      );
      var t0v1 = encoding.decodePosition(
        vertices,
        indices[i * 3 + 1],
        new Cartesian3()
      );
      var t0v2 = encoding.decodePosition(
        vertices,
        indices[i * 3 + 2],
        new Cartesian3()
      );
      traceDetails.testedTriangles.push([t0v0, t0v1, t0v2]);
    }
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
      vertices,
      indices
    );
    minT = Math.min(intersectionResult.nodeMinT, minT);

    if (traceDetails) {
      traceDetails.testedPoints = traceDetails.testedPoints.concat(
        intersectionResult.testedPoints
      );
      traceDetails.testedTriangles = traceDetails.testedTriangles.concat(
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
    return Ray.getPoint(ray, minT);
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
