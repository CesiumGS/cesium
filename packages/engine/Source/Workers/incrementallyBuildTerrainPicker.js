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
  const trianglePositions = new Float32Array(parameters.trianglePositions);
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

export default createTaskProcessorWorker(incrementallyBuildTerrainPicker);
