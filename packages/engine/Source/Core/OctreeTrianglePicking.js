import AxisAlignedBoundingBox from "./AxisAlignedBoundingBox.js";
import Cartesian3 from "./Cartesian3.js";
import defined from "./defined.js";
import IntersectionTests from "./IntersectionTests.js";
import Matrix4 from "./Matrix4.js";
import Ray from "./Ray.js";
import OrientedBoundingBox from "./OrientedBoundingBox.js";
import Ellipsoid from "./Ellipsoid.js";
import VerticalExaggeration from "./VerticalExaggeration.js";
import TaskProcessor from "./TaskProcessor.js";

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
  this._rootNode = createNode();
}

const incrementallyBuildOctreeTaskProcessor = new TaskProcessor(
  "incrementallyBuildOctree",
  5,
);

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
    const intersectingTriangles = new Uint32Array(this._indices.length / 3);
    this._rootNode.intersectingTriangles = Uint32Array.from(
      intersectingTriangles.keys(),
    );
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

/**
 * @param {} node
 * @returns {@link AxisAlignedBoundingBox}
 */
function createAABBForNode(x, y, z, level) {
  const sizeAtLevel = 1.0 / Math.pow(2, level);

  const aabbMin = Cartesian3.fromElements(
    x * sizeAtLevel - 0.5,
    y * sizeAtLevel - 0.5,
    z * sizeAtLevel - 0.5,
    scratchAABBMin,
  );

  const aabbMax = Cartesian3.fromElements(
    (x + 1) * sizeAtLevel - 0.5,
    (y + 1) * sizeAtLevel - 0.5,
    (z + 1) * sizeAtLevel - 0.5,
    scratchAABBMax,
  );

  return AxisAlignedBoundingBox.fromCorners(aabbMin, aabbMax);
}

/**
 * Represents a node in the octree
 */
function createNode(childIdx = 0, parentNode) {
  // Use bitwise operations to get child x,y,z from child index
  const x = parentNode?.x ?? 0;
  const y = parentNode?.y ?? 0;
  const z = parentNode?.z ?? 0;
  const childX = x * 2 + (childIdx & 1);
  const childY = y * 2 + ((childIdx >> 1) & 1);
  const childZ = z * 2 + ((childIdx >> 2) & 1);
  const level = defined(parentNode) ? parentNode.level + 1 : 0;

  const node = {
    level: level,
    aabb: createAABBForNode(childX, childY, childZ, level),
    x: childX,
    y: childY,
    z: childZ,
    intersectingTriangles: [],
    children: [],
    buildingChildren: false,
  };

  if (defined(parentNode)) {
    parentNode.children[childIdx] = node;
  }

  return node;
}

const scratchIntersectionResult = { intersection: false, tMin: 0, tMax: 0 };
const scratchRayIntervalX = { min: 0, max: 0 };
const scratchRayIntervalY = { min: 0, max: 0 };
const scratchRayIntervalZ = { min: 0, max: 0 };

function doesRayIntersectAABB(ray, aabb) {
  const tx = getRayIntervalForAABB(
    ray.origin.x,
    ray.direction.x,
    aabb.minimum.x,
    aabb.maximum.x,
    scratchRayIntervalX,
  );
  const ty = getRayIntervalForAABB(
    ray.origin.y,
    ray.direction.y,
    aabb.minimum.y,
    aabb.maximum.y,
    scratchRayIntervalY,
  );
  const tz = getRayIntervalForAABB(
    ray.origin.z,
    ray.direction.z,
    aabb.minimum.z,
    aabb.maximum.z,
    scratchRayIntervalZ,
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

function getRayIntervalForAABB(rayOrigin, rayDirection, min, max, rayInterval) {
  rayInterval.min = (min - rayOrigin) / rayDirection;
  rayInterval.max = (max - rayOrigin) / rayDirection;
  if (rayInterval.max < rayInterval.min) {
    const tmp = rayInterval.max;
    rayInterval.max = rayInterval.min;
    rayInterval.min = tmp;
  }

  return rayInterval;
}

function packTriangleBuffers(
  trianglePositionsBuffer,
  triangleIndicesBuffer,
  trianglePosition,
  triangleIndex,
  bufferIndex,
) {
  Cartesian3.pack(
    trianglePosition[0],
    trianglePositionsBuffer,
    9 * bufferIndex,
  );

  Cartesian3.pack(
    trianglePosition[1],
    trianglePositionsBuffer,
    9 * bufferIndex + 3,
  );

  Cartesian3.pack(
    trianglePosition[2],
    trianglePositionsBuffer,
    9 * bufferIndex + 6,
  );

  triangleIndicesBuffer[bufferIndex] = triangleIndex;
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
  const triangleCount = node.intersectingTriangles.length;
  const isMaxLevel = node.level >= octreeTrianglePicking._maximumLevel;
  const shouldBuildChildren = !isMaxLevel && !node.buildingChildren;
  let trianglePositions;
  let triangleIndices;
  if (shouldBuildChildren) {
    // If the tree can be built deeper, prepare buffers to store triangle data for child nodes
    trianglePositions = new Float32Array(triangleCount * 9); // 3 vertices per triangle * 3 floats per vertex
    triangleIndices = new Uint32Array(triangleCount);
  }

  for (let i = 0; i < triangleCount; i++) {
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

    if (triT !== invalidIntersection && triT < result) {
      result = triT;
    }

    if (shouldBuildChildren) {
      packTriangleBuffers(
        trianglePositions,
        triangleIndices,
        scratchTrianglePoints,
        triIndex,
        i,
      );
    }
  }

  if (shouldBuildChildren) {
    for (let childIdx = 0; childIdx < 8; childIdx++) {
      createNode(childIdx, node);
    }

    addTrianglesToChildrenNodes(
      octreeTrianglePicking,
      node,
      triangleIndices,
      trianglePositions,
    );
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
    const aabb = n.aabb;
    const intersection = doesRayIntersectAABB(transformedRay, aabb);
    if (intersection.intersection) {
      const isLeaf = !n.children.length || n.buildingChildren;
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

async function addTrianglesToChildrenNodes(
  octreeTrianglePicking,
  node,
  triangleIndices,
  trianglePositions,
) {
  node.buildingChildren = true;

  // Prepare data to be sent to a worker
  const matrixArray = new Array(16);
  Matrix4.pack(octreeTrianglePicking._inverseTransform, matrixArray, 0);
  const inverseTransform = new Float64Array(matrixArray);

  const aabbArray = new Float64Array(6 * 8); // 6 elements per AABB, 8 children
  for (let i = 0; i < 8; i++) {
    Cartesian3.pack(node.children[i].aabb.minimum, aabbArray, i * 6);
    Cartesian3.pack(node.children[i].aabb.maximum, aabbArray, i * 6 + 3);
  }

  const parameters = {
    aabbs: aabbArray,
    inverseTransform: inverseTransform,
    triangleIndices: triangleIndices,
    trianglePositions: trianglePositions,
  };

  const transferableObjects = [
    aabbArray.buffer,
    inverseTransform.buffer,
    triangleIndices.buffer,
    trianglePositions.buffer,
  ];

  const incrementallyBuildOctreePromise =
    incrementallyBuildOctreeTaskProcessor.scheduleTask(
      parameters,
      transferableObjects,
    );

  if (!defined(incrementallyBuildOctreePromise)) {
    // Failed to schedule task, retry on next pick
    node.buildingChildren = false;
    return;
  }

  const result = await incrementallyBuildOctreePromise;
  result.intersectingTrianglesArrays.forEach((buffer, index) => {
    node.children[index].intersectingTriangles = new Uint32Array(buffer);
  });

  node.buildingChildren = false;
  node.intersectingTriangles = new Uint32Array(0);
}

export default OctreeTrianglePicking;
