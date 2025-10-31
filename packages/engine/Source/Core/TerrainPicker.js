import AxisAlignedBoundingBox from "./AxisAlignedBoundingBox.js";
import Cartesian3 from "./Cartesian3.js";
import defined from "./defined.js";
import IntersectionTests from "./IntersectionTests.js";
import Matrix4 from "./Matrix4.js";
import Ray from "./Ray.js";
import TaskProcessor from "./TaskProcessor.js";
import Cartographic from "./Cartographic.js";
import SceneMode from "../Scene/SceneMode.js";

/**
 * Creates an object that handles arbitrary ray intersections with a terrain mesh using spatially accelerated structures.
 *
 * @alias TerrainPicker
 * @constructor
 * @private
 */
function TerrainPicker(vertices, indices, encoding, transform) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(vertices)) {
    throw new Error("vertices is required.");
  }
  if (!defined(indices)) {
    throw new Error("indices is required.");
  }
  if (!defined(encoding)) {
    throw new Error("encoding is required.");
  }
  if (!defined(transform)) {
    throw new Error("transform is required.");
  }
  //>>includeEnd('debug');

  this._vertices = vertices;
  this._indices = indices;
  this._encoding = encoding;
  this._transform = transform;
  this._inverseTransform = new Matrix4(); // Compute as-needed on rebuild
  this._needsRebuild = true;
  // Terrain picker can be 4 levels deep (0-3)
  this._maximumLevel = 3;
  this._rootNode = new TerrainPickerNode();
}

const incrementallyBuildTerrainPickerTaskProcessor = new TaskProcessor(
  "incrementallyBuildTerrainPicker",
);

Object.defineProperties(TerrainPicker.prototype, {
  /**
   * Indicates whether the terrain picker needs to be rebuilt due to changes in the underlying terrain mesh's vertices or indices.
   * @type {boolean}
   */
  needsRebuild: {
    get: function () {
      return this._needsRebuild;
    },
    set: function (value) {
      this._needsRebuild = value;
    },
  },
});

/**
 * A node in the terrain picker quadtree.
 * @constructor
 * @private
 */
function TerrainPickerNode() {
  this.x = 0;
  this.y = 0;
  this.level = 0;
  this.aabb = createAABBForNode(this.x, this.y, this.level);
  this.intersectingTriangles = [];
  this.children = [];
  this.buildingChildren = false;
}

/**
 * Adds a child node to this node.
 *
 * @param {number} childIdx The index of the child to add (0-3).
 */
TerrainPickerNode.prototype.addChild = function (childIdx) {
  //>>includeStart('debug', pragmas.debug);
  if (childIdx < 0 || childIdx > 3) {
    throw new Error("TerrainPickerNode child index must be between 0 and 3.");
  }
  //>>includeEnd('debug');

  const childNode = new TerrainPickerNode();
  // Use bitwise operations to get child x,y from child index and parent x,y
  childNode.x = this.x * 2 + (childIdx & 1);
  childNode.y = this.y * 2 + ((childIdx >> 1) & 1);
  childNode.level = this.level + 1;
  childNode.aabb = createAABBForNode(childNode.x, childNode.y, childNode.level);

  this.children[childIdx] = childNode;
};

const scratchTransformedRay = new Ray();
const scratchTrianglePoints = [
  new Cartesian3(),
  new Cartesian3(),
  new Cartesian3(),
];

/**
 * Determines the point on the mesh where the given ray intersects.
 * @param {Ray} ray The ray to test.
 * @param {Boolean} cullBackFaces Whether to consider back-facing triangles as intersections.
 * @returns {Cartesian3 | undefined} result The intersection point, or undefined if there is no intersection.
 */
TerrainPicker.prototype.rayIntersect = function (
  ray,
  cullBackFaces,
  mode,
  projection,
) {
  // Lazily (re)create the terrain picker
  if (this._needsRebuild) {
    reset(this);
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

  const intersections = [];
  getNodesIntersectingRay(this._rootNode, transformedRay, intersections);

  return getClosestPointInNode(
    this,
    intersections,
    ray,
    cullBackFaces,
    mode,
    projection,
  );
};

/**
 * Resets the terrain picker's quadtree structure to just a root node. Done whenever the underlying terrain mesh changes.
 * @param terrainPicker The terrain picker to reset.
 */
function reset(terrainPicker) {
  // PERFORMANCE_IDEA: warm-start the terrain picker by building a level on a worker.
  // This currently isn't feasible because you can only copy the vertex buffer to a worker (slow) or transfer ownership (can't do picking on main thread in meantime).
  // SharedArrayBuffers could be used, but most environments do not support them.
  Matrix4.inverse(terrainPicker._transform, terrainPicker._inverseTransform);

  terrainPicker._needsRebuild = false;
  const intersectingTriangles = new Uint32Array(
    terrainPicker._indices.length / 3,
  );
  terrainPicker._rootNode.intersectingTriangles = Uint32Array.from(
    intersectingTriangles.keys(),
  );
  terrainPicker._rootNode.children.length = 0;
}

const scratchAABBMin = new Cartesian3();
const scratchAABBMax = new Cartesian3();

/**
 * Creates an axis-aligned bounding box for a quadtree node at the given coordinates and level.
 * This AABB is in the node's local space (where the root node of the tree is a unit cube in its own local space).
 *
 * @param {number} x The x coordinate of the node.
 * @param {number} y The y coordinate of the node.
 * @param {number} level The level of the node.
 * @returns {AxisAlignedBoundingBox} The axis-aligned bounding box for the node.
 */
function createAABBForNode(x, y, level) {
  const sizeAtLevel = 1.0 / Math.pow(2, level);

  const aabbMin = Cartesian3.fromElements(
    x * sizeAtLevel - 0.5,
    y * sizeAtLevel - 0.5,
    -0.5,
    scratchAABBMin,
  );

  const aabbMax = Cartesian3.fromElements(
    (x + 1) * sizeAtLevel - 0.5,
    (y + 1) * sizeAtLevel - 0.5,
    0.5,
    scratchAABBMax,
  );

  return AxisAlignedBoundingBox.fromCorners(aabbMin, aabbMax);
}

/**
 * Packs triangle vertex positions and index into provided buffers, for the worker to process.
 * (The worker does tests to organize triangles into child nodes of the quadtree.)
 */
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

/**
 * Recursively gets all nodes in the quadtree that the ray intersects.
 *
 * @param {TerrainPickerNode} currentNode The current node being tested.
 * @param {Ray} ray The ray to test.
 * @param {*} intersectingNodes The array to store intersecting nodes in.
 */
function getNodesIntersectingRay(currentNode, ray, intersectingNodes) {
  const interval = IntersectionTests.rayAxisAlignedBoundingBox(
    ray,
    currentNode.aabb,
  );

  if (!defined(interval)) {
    return;
  }

  const isLeaf = !currentNode.children.length || currentNode.buildingChildren;
  if (isLeaf) {
    intersectingNodes.push({
      node: currentNode,
      interval: interval,
    });
    return;
  }

  for (let i = 0; i < currentNode.children.length; i++) {
    getNodesIntersectingRay(currentNode.children[i], ray, intersectingNodes);
  }
}

/**
 * Gets the closest intersection point in the given node, in world space, by testing all triangles in the node against the ray.
 *
 * @param {TerrainPicker} terrainPicker The terrain picker.
 * @param {*} intersections The nodes that intersect the ray, along with the intersection intervals along said ray.
 * @param {Ray} ray The ray to test.
 * @param {boolean} cullBackFaces Whether to cull back faces.
 * @param {SceneMode} mode The scene mode (2D/3D/Columbus View).
 * @param {MapProjection} projection The map projection.
 * @returns The closest point in world space, or undefined if no intersection.
 */
function getClosestPointInNode(
  terrainPicker,
  intersections,
  ray,
  cullBackFaces,
  mode,
  projection,
) {
  const sortedIntersections = intersections.sort(function (a, b) {
    return a.interval.start - b.interval.start;
  });

  let minT = Number.MAX_VALUE;
  for (let i = 0; i < sortedIntersections.length; i++) {
    const intersection = sortedIntersections[i];
    const intersectionResult = getClosestTriangleInNode(
      terrainPicker,
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

/**
 * Test all triangles in the given node against the ray, returning the closest intersection t value along the ray.
 * Additionally, collect the triangles' positions and indices along the way to launch worker process that uses them to build out child nodes.
 *
 * @param {TerrainPicker} terrainPicker The terrain picker.
 * @param {Ray} ray The ray to test.
 * @param {TerrainPickerNode} node The node to test.
 * @param {boolean} cullBackFaces Whether to cull back faces.
 * @param {SceneMode} mode The scene mode (2D/3D/Columbus View).
 * @param {MapProjection} projection The map projection.
 * @returns {number} The closest intersection t value along the ray, or Number.MAX_VALUE if no intersection.
 */
function getClosestTriangleInNode(
  terrainPicker,
  ray,
  node,
  cullBackFaces,
  mode,
  projection,
) {
  let result = Number.MAX_VALUE;
  const encoding = terrainPicker._encoding;
  const indices = terrainPicker._indices;
  const vertices = terrainPicker._vertices;
  const triangleCount = node.intersectingTriangles.length;
  const isMaxLevel = node.level >= terrainPicker._maximumLevel;
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

    if (defined(triT) && triT < result && triT >= 0) {
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
    for (let childIdx = 0; childIdx < 4; childIdx++) {
      node.addChild(childIdx);
    }

    addTrianglesToChildrenNodes(
      terrainPicker._inverseTransform,
      node,
      triangleIndices,
      trianglePositions,
    );
  }

  return result;
}

const scratchCartographic = new Cartographic();

/**
 * Gets a vertex position in world space, taking into account the exaggeration and scene mode of the terrain.
 *
 * @param {TerrainEncoding} encoding The terrain encoding.
 * @param {SceneMode} mode The scene mode (2D/3D/Columbus View).
 * @param {MapProjection} projection
 * @param {Float32Array} vertices
 * @param {Number} index
 * @param {Cartesian3} result
 * @returns
 */
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

/**
 * Adds triangles to the child nodes of the given node by launching a worker process to do the categorization.
 *
 * @param {Matrix4} inverseTransform
 * @param {TerrainNode} node
 * @param {Uint32Array} triangleIndices
 * @param {Float32Array} trianglePositions
 * @returns {Promise<void>} A promise that resolves when the triangles have been added to the child nodes.
 */
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

  const aabbArray = new Float64Array(6 * 4); // 6 elements per AABB, 4 children
  for (let i = 0; i < 4; i++) {
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

  const incrementallyBuildTerrainPickerPromise =
    incrementallyBuildTerrainPickerTaskProcessor.scheduleTask(
      parameters,
      transferableObjects,
    );

  if (!defined(incrementallyBuildTerrainPickerPromise)) {
    // Failed to schedule task, retry on next pick
    node.buildingChildren = false;
    return;
  }

  const result = await incrementallyBuildTerrainPickerPromise;
  result.intersectingTrianglesArrays.forEach((buffer, index) => {
    node.children[index].intersectingTriangles = new Uint32Array(buffer);
  });

  node.buildingChildren = false;
  node.intersectingTriangles = new Uint32Array(0);
}

export default TerrainPicker;
