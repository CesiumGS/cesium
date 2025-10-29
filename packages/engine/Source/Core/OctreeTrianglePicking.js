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
import Cartographic from "./Cartographic.js";
import SceneMode from "../Scene/SceneMode.js";
import Transforms from "./Transforms.js";

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
  this._inverseTransform = undefined;
  this._needsRebuild = true;
  // Octree can be 4 levels deep (0-3)
  this._maximumLevel = 3;
  this._rootNode = createNode();
}

const incrementallyBuildOctreeTaskProcessor = new TaskProcessor(
  "incrementallyBuildOctree",
);

const scratchOrientedBoundingBox = new OrientedBoundingBox();
const scratchTransform = new Matrix4();

function computeTransform(
  encoding,
  rectangle,
  minHeight,
  maxHeight,
  mode,
  projection,
) {
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

  const transform = OrientedBoundingBox.computeTransformation(
    obb,
    scratchTransform,
  );
  return mode === SceneMode.SCENE3D
    ? transform
    : Transforms.basisTo2D(projection, transform, transform);
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
OctreeTrianglePicking.prototype.rayIntersect = function (
  ray,
  cullBackFaces,
  mode,
  projection,
) {
  // Lazily (re)create the octree
  if (this._needsRebuild) {
    reset(this, mode, projection);
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

  return rayIntersectOctree(
    this,
    ray,
    transformedRay,
    cullBackFaces,
    mode,
    projection,
  );
};

function reset(octreeTrianglePicking, mode, projection) {
  // PERFORMANCE_IDEA: warm-start the octree by building a level on a worker.
  // This currently isn't feasible because you can only copy the vertex buffer to a worker (slow) or transfer ownership (can't do picking on main thread in meantime).
  // SharedArrayBuffers could be used, but most environments do not support them.
  octreeTrianglePicking._needsRebuild = false;

  const transform = computeTransform(
    octreeTrianglePicking._encoding,
    octreeTrianglePicking._rectangle,
    octreeTrianglePicking._minimumHeight,
    octreeTrianglePicking._maximumHeight,
    mode,
    projection,
  );
  octreeTrianglePicking._inverseTransform = Matrix4.inverse(
    transform,
    new Matrix4(),
  );
  const intersectingTriangles = new Uint32Array(
    octreeTrianglePicking._indices.length / 3,
  );
  octreeTrianglePicking._rootNode.intersectingTriangles = Uint32Array.from(
    intersectingTriangles.keys(),
  );
  octreeTrianglePicking._rootNode.children.length = 0;
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

const scratchCartographic = new Cartographic();

function getVertexPosition(
  encoding,
  mode,
  projection,
  vertices,
  index,
  result,
) {
  let position = encoding.getExaggeratedPosition(vertices, index, result);
  if (mode === SceneMode.SCENE3D) {
    return position;
  }

  const ellipsoid = projection.ellipsoid;
  const positionCartographic = ellipsoid.cartesianToCartographic(
    position,
    scratchCartographic,
  );
  position = projection.project(positionCartographic, result);
  // Swizzle because coordinate basis are different in 2D/Columbus View
  position = Cartesian3.fromElements(
    position.z,
    position.x,
    position.y,
    result,
  );

  return position;
}

function getClosestTriangleInNode(
  octreeTrianglePicking,
  ray,
  node,
  cullBackFaces,
  mode,
  projection,
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
    const v0 = getVertexPosition(
      encoding,
      mode,
      projection,
      vertices,
      indices[3 * triIndex],
      scratchTrianglePoints[0],
    );
    const v1 = getVertexPosition(
      encoding,
      mode,
      projection,
      vertices,
      indices[3 * triIndex + 1],
      scratchTrianglePoints[1],
    );
    const v2 = getVertexPosition(
      encoding,
      mode,
      projection,
      vertices,
      indices[3 * triIndex + 2],
      scratchTrianglePoints[2],
    );

    const triT = IntersectionTests.rayTriangleParametric(
      ray,
      v0,
      v1,
      v2,
      cullBackFaces,
    );

    if (defined(triT) && triT < result) {
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
      octreeTrianglePicking._inverseTransform,
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
  mode,
  projection,
) {
  // from here: http://publications.lib.chalmers.se/records/fulltext/250170/250170.pdf
  // find all the nodes which intersect the ray

  let queue = [octreeTrianglePicking._rootNode];
  const intersections = [];
  while (queue.length) {
    const n = queue.pop();
    const aabb = n.aabb;
    const interval = IntersectionTests.rayAxisAlignedBoundingBox(
      transformedRay,
      aabb,
    );
    if (interval) {
      const isLeaf = !n.children.length || n.buildingChildren;
      if (isLeaf) {
        intersections.push({
          node: n,
          interval: interval,
        });
      } else {
        queue = queue.concat(n.children);
      }
    }
  }

  // sort each intersection node by start ascending
  const sortedIntersections = intersections.sort(function (a, b) {
    return a.interval.start - b.interval.start;
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
      mode,
      projection,
    );
    minT = Math.min(intersectionResult, minT);
    if (minT !== Number.MAX_VALUE) {
      break;
    }
  }

  if (minT !== Number.MAX_VALUE) {
    return Ray.getPoint(ray, minT);
  }

  return undefined;
}

async function addTrianglesToChildrenNodes(
  inverseTransform,
  node,
  triangleIndices,
  trianglePositions,
) {
  node.buildingChildren = true;

  // Prepare data to be sent to a worker
  const matrixArray = new Array(16);
  Matrix4.pack(inverseTransform, matrixArray, 0);
  const inverseTransformPacked = new Float64Array(matrixArray);

  const aabbArray = new Float64Array(6 * 8); // 6 elements per AABB, 8 children
  for (let i = 0; i < 8; i++) {
    Cartesian3.pack(node.children[i].aabb.minimum, aabbArray, i * 6);
    Cartesian3.pack(node.children[i].aabb.maximum, aabbArray, i * 6 + 3);
  }

  const parameters = {
    aabbs: aabbArray,
    inverseTransform: inverseTransformPacked,
    triangleIndices: triangleIndices,
    trianglePositions: trianglePositions,
  };

  const transferableObjects = [
    aabbArray.buffer,
    inverseTransformPacked.buffer,
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
