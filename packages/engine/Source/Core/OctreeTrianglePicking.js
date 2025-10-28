import AxisAlignedBoundingBox from "./AxisAlignedBoundingBox.js";
import Cartesian3 from "./Cartesian3.js";
import defined from "./defined.js";
import IntersectionTests from "./IntersectionTests.js";
import Matrix4 from "./Matrix4.js";
import Ray from "./Ray.js";
import OrientedBoundingBox from "./OrientedBoundingBox.js";
import Ellipsoid from "./Ellipsoid.js";
import VerticalExaggeration from "./VerticalExaggeration.js";

/**
 * Create an octree object for the main thread for testing intersection
 * @alias OctreeTrianglePicking
 * @constructor
 * @private
 */
function OctreeTrianglePicking(
  vertices,
  indices,
  encoding,
  minimumHeight,
  maximumHeight,
  rectangle,
) {
  this._vertices = vertices;
  this._indices = indices;
  this._encoding = encoding;
  this._minimumHeight = minimumHeight;
  this._maximumHeight = maximumHeight;
  this._rectangle = rectangle;
  this._transform = undefined;
  this._inverseTransform = undefined;
  this._needsRebuild = true;
  // Octree can be 4 levels deep (0-3)
  this._maximumLevel = 3;

  const rootNode = getOrCreateNode();
  rootNode.intersectingTriangles = Array.from(
    { length: indices.length / 3 },
    (_, i) => i,
  );
  this._rootNode = rootNode;
}

const scratchOrientedBoundingBox = new OrientedBoundingBox();

function computeTransform(encoding, rectangle, minHeight, maxHeight) {
  const exaggeration = encoding.exaggeration;
  const exaggerationRelativeHeight = encoding.exaggerationRelativeHeight;

  const exaggeratedMinHeight = VerticalExaggeration.getHeight(
    minHeight,
    exaggeration,
    exaggerationRelativeHeight,
  );

  const exaggeratedMaxHeight = VerticalExaggeration.getHeight(
    maxHeight,
    exaggeration,
    exaggerationRelativeHeight,
  );

  const obb = OrientedBoundingBox.fromRectangle(
    rectangle,
    exaggeratedMinHeight,
    exaggeratedMaxHeight,
    Ellipsoid.default,
    scratchOrientedBoundingBox,
  );

  return OrientedBoundingBox.computeTransformation(obb);
}

Object.defineProperties(OctreeTrianglePicking.prototype, {
  needsRebuild: {
    get: function () {
      return this._needsRebuild;
    },
    set: function (value) {
      this._needsRebuild = value;
    },
  },
});

const scratchTransformedRay = new Ray();
const scratchTrianglePoints = [
  new Cartesian3(),
  new Cartesian3(),
  new Cartesian3(),
];

/**
 * Ray intersection test
 * @param {Ray} ray
 * @param {Boolean} cullBackFaces
 * @returns {Cartesian3} result
 */
OctreeTrianglePicking.prototype.rayIntersect = function (ray, cullBackFaces) {
  // Lazily (re)create the octree
  if (this._needsRebuild) {
    this._needsRebuild = false;
    this._transform = computeTransform(
      this._encoding,
      this._rectangle,
      this._minimumHeight,
      this._maximumHeight,
    );
    this._inverseTransform = Matrix4.inverse(this._transform, new Matrix4());
    this._rootNode.children.length = 0;
  }

  const invTransform = this._inverseTransform;

  const transformedRay = scratchTransformedRay;
  transformedRay.origin = Matrix4.multiplyByPoint(
    invTransform,
    ray.origin,
    transformedRay.origin,
  );
  transformedRay.direction = Matrix4.multiplyByPointAsVector(
    invTransform,
    ray.direction,
    transformedRay.direction,
  );

  return rayIntersectOctree(this, ray, transformedRay, cullBackFaces);
};

const invalidIntersection = Number.MAX_VALUE;

/**
 * @param {Ray} ray
 * @param {Cartesian3} v0
 * @param {Cartesian3} v1
 * @param {Cartesian3} v2
 * @param {Boolean} cullBackFaces
 * @returns {Number} t
 * @private
 */
function rayTriangleIntersect(ray, v0, v1, v2, cullBackFaces) {
  const t = IntersectionTests.rayTriangleParametric(
    ray,
    v0,
    v1,
    v2,
    cullBackFaces,
  );
  const valid = defined(t) && t >= 0.0;
  return valid ? t : invalidIntersection;
}

const scratchAABBMin = new Cartesian3();
const scratchAABBMax = new Cartesian3();
const scratchNodeAABB = new AxisAlignedBoundingBox();
const scratchTriangleAABB = new AxisAlignedBoundingBox();

/**
 * @param {} node
 * @returns {@link AxisAlignedBoundingBox}
 */
function createAABBFromOctreeNode(node) {
  const sizeAtLevel = 1.0 / Math.pow(2, node.level);

  const aabbMin = Cartesian3.fromElements(
    node.x * sizeAtLevel - 0.5,
    node.y * sizeAtLevel - 0.5,
    node.z * sizeAtLevel - 0.5,
    scratchAABBMin,
  );

  const aabbMax = Cartesian3.fromElements(
    (node.x + 1) * sizeAtLevel - 0.5,
    (node.y + 1) * sizeAtLevel - 0.5,
    (node.z + 1) * sizeAtLevel - 0.5,
    scratchAABBMax,
  );

  return AxisAlignedBoundingBox.fromCorners(aabbMin, aabbMax, scratchNodeAABB);
}

/**
 * @param {Number} triangleIdx starting index of the triangle corners in the array
 * @returns {AxisAlignedBoundingBox}
 */
function createAABBFromTriangle(inverseTransform, trianglePoints) {
  Matrix4.multiplyByPoint(
    inverseTransform,
    trianglePoints[0],
    trianglePoints[0],
  );
  Matrix4.multiplyByPoint(
    inverseTransform,
    trianglePoints[1],
    trianglePoints[1],
  );
  Matrix4.multiplyByPoint(
    inverseTransform,
    trianglePoints[2],
    trianglePoints[2],
  );

  return AxisAlignedBoundingBox.fromPoints(trianglePoints, scratchTriangleAABB);
}

/**
 * Represents a node in the octree
 */
function getOrCreateNode(childIdx = 0, parentNode) {
  if (defined(parentNode) && defined(parentNode.children[childIdx])) {
    return parentNode.children[childIdx];
  }

  // Use bitwise operations to get child x,y,z from child index
  const x = parentNode?.x ?? 0;
  const y = parentNode?.y ?? 0;
  const z = parentNode?.z ?? 0;
  const childX = x * 2 + (childIdx & 1);
  const childY = y * 2 + ((childIdx >> 1) & 1);
  const childZ = z * 2 + ((childIdx >> 2) & 1);

  const node = {
    level: defined(parentNode) ? parentNode.level + 1 : 0,
    x: childX,
    y: childY,
    z: childZ,
    intersectingTriangles: [],
    children: [],
  };

  if (defined(parentNode)) {
    parentNode.children[childIdx] = node;
  }

  return node;
}

const scratchIntersectionResult = { intersection: false, tMin: 0, tMax: 0 };

function doesRayIntersectAABB(ray, aabb) {
  const tx = getRayIntervalForAABB(
    ray.origin.x,
    ray.direction.x,
    aabb.minimum.x,
    aabb.maximum.x,
  );
  const ty = getRayIntervalForAABB(
    ray.origin.y,
    ray.direction.y,
    aabb.minimum.y,
    aabb.maximum.y,
  );
  const tz = getRayIntervalForAABB(
    ray.origin.z,
    ray.direction.z,
    aabb.minimum.z,
    aabb.maximum.z,
  );

  const result = scratchIntersectionResult;
  result.tMin = tx.min > ty.min ? tx.min : ty.min; //Get Greatest Min
  result.tMax = tx.max < ty.max ? tx.max : ty.max; //Get Smallest Max
  result.intersection = false;

  if (tx.min > ty.max || ty.min > tx.max) {
    return result;
  }

  if (result.tMin > tz.max || tz.min > result.tMax) {
    return result;
  }

  if (tz.min > result.tMin) {
    result.tMin = tz.min;
  }
  if (tz.max < result.tMax) {
    result.tMax = tz.max;
  }

  result.intersection = true;
  return result;
}

const scratchRayInterval = { min: 0, max: 0 };
function getRayIntervalForAABB(rayOrigin, rayDirection, min, max) {
  const rayInterval = scratchRayInterval;
  rayInterval.min = (min - rayOrigin) / rayDirection;
  rayInterval.max = (max - rayOrigin) / rayDirection;
  if (rayInterval.max < rayInterval.min) {
    const tmp = rayInterval.max;
    rayInterval.max = rayInterval.min;
    rayInterval.min = tmp;
  }

  return rayInterval;
}

function getClosestTriangleInNode(
  octreeTrianglePicking,
  ray,
  node,
  cullBackFaces,
) {
  let result = Number.MAX_VALUE;
  const encoding = octreeTrianglePicking._encoding;
  const indices = octreeTrianglePicking._indices;
  const vertices = octreeTrianglePicking._vertices;

  for (let i = 0; i < node.intersectingTriangles.length; i++) {
    const triIndex = node.intersectingTriangles[i];
    const v0 = encoding.getExaggeratedPosition(
      vertices,
      indices[3 * triIndex],
      scratchTrianglePoints[0],
    );
    const v1 = encoding.getExaggeratedPosition(
      vertices,
      indices[3 * triIndex + 1],
      scratchTrianglePoints[1],
    );
    const v2 = encoding.getExaggeratedPosition(
      vertices,
      indices[3 * triIndex + 2],
      scratchTrianglePoints[2],
    );

    const triT = rayTriangleIntersect(ray, v0, v1, v2, cullBackFaces);

    // Incrementally build up the octree (on each pick, to accelerate future picks).
    addTriangleToNodeChildren(
      octreeTrianglePicking,
      node,
      triIndex,
      scratchTrianglePoints,
    );

    if (triT !== invalidIntersection && triT < result) {
      result = triT;
    }
  }

  // Triangles have been transferred to children - clear them out of this node
  if (node.level < octreeTrianglePicking._maximumLevel) {
    node.intersectingTriangles.length = 0;
  }

  return result;
}

function rayIntersectOctree(
  octreeTrianglePicking,
  ray,
  transformedRay,
  cullBackFaces,
) {
  // from here: http://publications.lib.chalmers.se/records/fulltext/250170/250170.pdf
  // find all the nodes which intersect the ray

  let queue = [octreeTrianglePicking._rootNode];
  const intersections = [];
  while (queue.length) {
    const n = queue.pop();
    const aabb = createAABBFromOctreeNode(n);
    const intersection = doesRayIntersectAABB(transformedRay, aabb);
    if (intersection.intersection) {
      const isLeaf = !n.children.length;
      if (isLeaf) {
        intersections.push({
          node: n,
          tMin: intersection.tMin,
          tMax: intersection.tMax,
        });
      } else {
        queue = queue.concat(n.children);
      }
    }
  }

  // sort each intersection node by tMin ascending
  const sortedIntersections = intersections.sort(function (a, b) {
    return a.tMin - b.tMin;
  });

  let minT = Number.MAX_VALUE;
  // for each intersected node - test every triangle which falls in that node
  for (let i = 0; i < sortedIntersections.length; i++) {
    const intersection = sortedIntersections[i];
    const intersectionResult = getClosestTriangleInNode(
      octreeTrianglePicking,
      ray,
      intersection.node,
      cullBackFaces,
    );
    minT = Math.min(intersectionResult, minT);
    if (minT !== invalidIntersection) {
      break;
    }
  }

  if (minT !== invalidIntersection) {
    return Ray.getPoint(ray, minT);
  }

  return undefined;
}

function addTriangleToNodeChildren(
  octreeTrianglePicking,
  node,
  triangleIndex,
  trianglePoints,
) {
  if (node.level >= octreeTrianglePicking._maximumLevel) {
    return;
  }

  const triangleAABB = createAABBFromTriangle(
    octreeTrianglePicking._inverseTransform,
    trianglePoints,
  );

  for (let childIdx = 0; childIdx < 8; childIdx++) {
    const childNode = getOrCreateNode(childIdx, node);
    const childNodeAABB = createAABBFromOctreeNode(childNode);

    const aabbsIntersect =
      childNodeAABB.intersectAxisAlignedBoundingBox(triangleAABB);
    if (!aabbsIntersect) {
      continue;
    }

    childNode.intersectingTriangles.push(triangleIndex);
  }
}

export default OctreeTrianglePicking;
