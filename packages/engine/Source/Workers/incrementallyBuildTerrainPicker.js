import createTaskProcessorWorker from "./createTaskProcessorWorker.js";
import Matrix4 from "../Core/Matrix4.js";
import Cartesian3 from "../Core/Cartesian3.js";
import AxisAlignedBoundingBox from "../Core/AxisAlignedBoundingBox.js";

const scratchAABBCornerMin = new Cartesian3();
const scratchAABBCornerMax = new Cartesian3();
const scratchTrianglePoints = [
  new Cartesian3(),
  new Cartesian3(),
  new Cartesian3(),
];
const scratchTriangleAABB = new AxisAlignedBoundingBox();

const TILE_AABB_MAX = new Cartesian3(0.5, 0.5, 0.5);
const TILE_AABB_MIN = new Cartesian3(-0.5, -0.5, -0.5);

/**
 * Builds the next layer of the terrain picker's quadtree by determining which triangles intersect
 * each of the four child nodes. (Essentially distributing the parent's triangles to its children.)
 *
 * Takes in the AABBs of the four child nodes in the tree's local space, an inverse transform
 * to convert triangle positions to the tree's local space, and the parent node's triangle indices and positions.
 *
 * Returns an four arrays - one for each child node - containing the indices of the triangles that intersect each node.
 */
function incrementallyBuildTerrainPicker(parameters, transferableObjects) {
  // Rehydrate worker inputs
  const aabbs = new Float64Array(parameters.aabbs);
  const nodeAABBs = Array.from({ length: 4 }, (_, i) => {
    const min = Cartesian3.unpack(aabbs, i * 6, scratchAABBCornerMin);
    const max = Cartesian3.unpack(aabbs, i * 6 + 3, scratchAABBCornerMax);
    return AxisAlignedBoundingBox.fromCorners(
      min,
      max,
      new AxisAlignedBoundingBox(),
    );
  });

  const inverseTransformArray = new Float64Array(parameters.inverseTransform);
  const inverseTransform = Matrix4.unpack(
    inverseTransformArray,
    0,
    new Matrix4(),
  );

  const triangleIndices = new Uint32Array(parameters.triangleIndices);
  const trianglePositions = new Float64Array(parameters.trianglePositions);
  const intersectingTrianglesArrays = Array.from({ length: 4 }, () => []);

  for (let j = 0; j < triangleIndices.length; j++) {
    Cartesian3.unpack(trianglePositions, j * 9, scratchTrianglePoints[0]);
    Cartesian3.unpack(trianglePositions, j * 9 + 3, scratchTrianglePoints[1]);
    Cartesian3.unpack(trianglePositions, j * 9 + 6, scratchTrianglePoints[2]);

    const triangleAABB = createAABBFromTriangle(
      inverseTransform,
      scratchTrianglePoints,
    );

    for (let i = 0; i < 4; i++) {
      const aabbsIntersect =
        nodeAABBs[i].intersectAxisAlignedBoundingBox(triangleAABB);
      if (!aabbsIntersect) {
        continue;
      }

      intersectingTrianglesArrays[i].push(triangleIndices[j]);
    }
  }

  const intersectingTrianglesTypedArrays = intersectingTrianglesArrays.map(
    (array) => {
      const uintArray = new Uint32Array(array);
      transferableObjects.push(uintArray.buffer);
      return uintArray.buffer;
    },
  );

  return {
    intersectingTrianglesArrays: intersectingTrianglesTypedArrays,
  };
}

/**
 * Creates a tree-space axis-aligned bounding box from the given triangle points and inverse transform (from world to tree space).
 * @param {Matrix4} inverseTransform transform from world space to tree local space
 * @param {Cartesian3[]} trianglePoints array of 3 Cartesian3 points representing the triangle
 * @returns {AxisAlignedBoundingBox} the axis-aligned bounding box enclosing the triangle in tree local space
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

  const aabb = AxisAlignedBoundingBox.fromPoints(
    trianglePoints,
    scratchTriangleAABB,
  );

  // In 2D mode, sometimes the height-scale of a tile is 0. See {@link TerrainMesh#computeTransform2D}.
  // This makes the inverseTransform degenerate, so we set the height-scale to 1 to be prevent that. However, this is artificial and
  // can lead to the triangle's AABB extending beyond the (height) bounds of the tile's AABB.
  // Thus, we clamp the triangle's AABB to the tile's local-space AABB.
  Cartesian3.clamp(aabb.minimum, TILE_AABB_MIN, TILE_AABB_MAX, aabb.minimum);
  Cartesian3.clamp(aabb.maximum, TILE_AABB_MIN, TILE_AABB_MAX, aabb.maximum);
  return aabb;
}

export default createTaskProcessorWorker(incrementallyBuildTerrainPicker);
