import Cartesian3 from "./Cartesian3.js";
import defined from "./defined.js";
import Matrix4 from "./Matrix4.js";
import Ray from "./Ray.js";

function QuadtreeTrianglePicker(packedQuadtree, triangleVerticesCallback) {
  this._inverseTransform = Matrix4.unpack(packedQuadtree.inverseTransform);
  this._quadtree = packedQuadtree.quadtree;
  this._triangleVerticesCallback = triangleVerticesCallback;
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
  var queue = [quadtree];
  var intersections = [];
  while (queue.length) {
    var n = queue.pop();
    var intersection = rayIntersectsQuadtreeNode(transformedRay, n);
    if (intersection.intersection) {
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

  // for each intersected node - test every triangle which falls in that node
  for (var ii = 0; ii < sortedTests.length; ii++) {
    var test = sortedTests[ii];
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
