import defined from "./defined.js";
import IndexDatatype from "./IndexDatatype.js";
import PrimitiveType from "./PrimitiveType.js";

/**
 * Functions for generating indices for model wireframes. The indices are
 * outputted as typed arrays, which can then be put into buffers for rendering.
 *
 * @namespace WireframeIndexGenerator
 * @private
 */
const WireframeIndexGenerator = {};

function createWireframeFromTriangles(vertexCount) {
  const wireframeIndices = IndexDatatype.createTypedArray(
    vertexCount,
    vertexCount * 2,
  );
  const length = vertexCount;
  let index = 0;
  for (let i = 0; i < length; i += 3) {
    wireframeIndices[index++] = i;
    wireframeIndices[index++] = i + 1;
    wireframeIndices[index++] = i + 1;
    wireframeIndices[index++] = i + 2;
    wireframeIndices[index++] = i + 2;
    wireframeIndices[index++] = i;
  }

  return wireframeIndices;
}

function createWireframeFromTriangleIndices(vertexCount, originalIndices) {
  const originalIndicesCount = originalIndices.length;
  const wireframeIndices = IndexDatatype.createTypedArray(
    vertexCount,
    originalIndicesCount * 2,
  );
  let index = 0;
  for (let i = 0; i < originalIndicesCount; i += 3) {
    const point0 = originalIndices[i];
    const point1 = originalIndices[i + 1];
    const point2 = originalIndices[i + 2];

    wireframeIndices[index++] = point0;
    wireframeIndices[index++] = point1;
    wireframeIndices[index++] = point1;
    wireframeIndices[index++] = point2;
    wireframeIndices[index++] = point2;
    wireframeIndices[index++] = point0;
  }

  return wireframeIndices;
}

function createWireframeFromTriangleStrip(vertexCount) {
  const numberOfTriangles = vertexCount - 2;
  const wireframeIndicesCount = 2 + numberOfTriangles * 4;
  const wireframeIndices = IndexDatatype.createTypedArray(
    vertexCount,
    wireframeIndicesCount,
  );
  let index = 0;

  // Handle the first edge
  wireframeIndices[index++] = 0;
  wireframeIndices[index++] = 1;

  // Add two edges for every triangle in the strip
  for (let i = 0; i < numberOfTriangles; i++) {
    wireframeIndices[index++] = i + 1;
    wireframeIndices[index++] = i + 2;
    wireframeIndices[index++] = i + 2;
    wireframeIndices[index++] = i;
  }

  return wireframeIndices;
}

function createWireframeFromTriangleStripIndices(vertexCount, originalIndices) {
  const originalIndicesCount = originalIndices.length;
  const numberOfTriangles = originalIndicesCount - 2;
  const wireframeIndicesCount = 2 + numberOfTriangles * 4;
  const wireframeIndices = IndexDatatype.createTypedArray(
    vertexCount,
    wireframeIndicesCount,
  );
  let index = 0;

  // Handle the first edge
  wireframeIndices[index++] = originalIndices[0];
  wireframeIndices[index++] = originalIndices[1];

  // Add two edges for every triangle in the strip
  for (let i = 0; i < numberOfTriangles; i++) {
    const point0 = originalIndices[i];
    const point1 = originalIndices[i + 1];
    const point2 = originalIndices[i + 2];

    wireframeIndices[index++] = point1;
    wireframeIndices[index++] = point2;
    wireframeIndices[index++] = point2;
    wireframeIndices[index++] = point0;
  }

  return wireframeIndices;
}

function createWireframeFromTriangleFan(vertexCount) {
  const numberOfTriangles = vertexCount - 2;
  const wireframeIndicesCount = 2 + numberOfTriangles * 4;
  const wireframeIndices = IndexDatatype.createTypedArray(
    vertexCount,
    wireframeIndicesCount,
  );
  let index = 0;

  // Handle the first edge
  wireframeIndices[index++] = 0;
  wireframeIndices[index++] = 1;

  // Add two edges for every triangle in the fan
  for (let i = 0; i < numberOfTriangles; i++) {
    wireframeIndices[index++] = i + 1;
    wireframeIndices[index++] = i + 2;
    wireframeIndices[index++] = i + 2;
    wireframeIndices[index++] = 0;
  }

  return wireframeIndices;
}

function createWireframeFromTriangleFanIndices(vertexCount, originalIndices) {
  const originalIndicesCount = originalIndices.length;
  const numberOfTriangles = originalIndicesCount - 2;
  const wireframeIndicesCount = 2 + numberOfTriangles * 4;
  const wireframeIndices = IndexDatatype.createTypedArray(
    vertexCount,
    wireframeIndicesCount,
  );
  let index = 0;

  // Handle the first edge
  const firstPoint = originalIndices[0];
  wireframeIndices[index++] = firstPoint;
  wireframeIndices[index++] = originalIndices[1];

  // Add two edges for every triangle in the fan
  for (let i = 0; i < numberOfTriangles; i++) {
    const point1 = originalIndices[i + 1];
    const point2 = originalIndices[i + 2];

    wireframeIndices[index++] = point1;
    wireframeIndices[index++] = point2;
    wireframeIndices[index++] = point2;
    wireframeIndices[index++] = firstPoint;
  }

  return wireframeIndices;
}

/**
 * Generates a wireframe index buffer for a primitive, either by reindexing the existing indices
 * or creating them from scratch if the model had none.
 *
 * @param {PrimitiveType} primitiveType The primitive type.
 * @param {number} vertexCount The number of vertices in the primitive.
 * @param {Uint8Array|Uint16Array|Uint32Array} [originalIndices] A typed array containing the original indices of the primitive.
 *
 * @return {Uint16Array|Uint32Array} A typed array with the wireframe indices, or undefined if the primitive type does not use triangles.
 *
 * @private
 */
WireframeIndexGenerator.createWireframeIndices = function (
  primitiveType,
  vertexCount,
  originalIndices,
) {
  const hasOriginalIndices = defined(originalIndices);
  if (primitiveType === PrimitiveType.TRIANGLES) {
    return hasOriginalIndices
      ? createWireframeFromTriangleIndices(vertexCount, originalIndices)
      : createWireframeFromTriangles(vertexCount);
  }

  if (primitiveType === PrimitiveType.TRIANGLE_STRIP) {
    return hasOriginalIndices
      ? createWireframeFromTriangleStripIndices(vertexCount, originalIndices)
      : createWireframeFromTriangleStrip(vertexCount);
  }

  if (primitiveType === PrimitiveType.TRIANGLE_FAN) {
    return hasOriginalIndices
      ? createWireframeFromTriangleFanIndices(vertexCount, originalIndices)
      : createWireframeFromTriangleFan(vertexCount);
  }

  return undefined;
};

/**
 * Gets the number of indices in the wireframe index buffer of a primitive type.
 *
 * @param {PrimitiveType} primitiveType The primitive type.
 * @param {number} originalCount The original number of vertices or indices in the primitive.
 * @return {number} The number of indices in the primitive's wireframe.
 *
 * @private
 */
WireframeIndexGenerator.getWireframeIndicesCount = function (
  primitiveType,
  originalCount,
) {
  // For TRIANGLES, the wireframe takes every triangle (i.e. three of the original
  // indices) and turns it into lines. Each triangle has three lines, and each line
  // requires two indices, so the final count is twice the original.
  if (primitiveType === PrimitiveType.TRIANGLES) {
    return originalCount * 2;
  }

  // For TRIANGLE_STRIP and TRIANGLE_FAN, the number of triangles in the primitive
  // is equal to the total number of vertices minus two. This is because after the
  // first edge is specified by the first two indices, every point afterwards
  // contributes two more edges with two of the previous points, forming a new triangle.
  // Each of these edges requires two indices, so each triangle in the primitive
  // results in four indices in addition to the first two.
  if (
    primitiveType === PrimitiveType.TRIANGLE_STRIP ||
    primitiveType === PrimitiveType.TRIANGLE_FAN
  ) {
    const numberOfTriangles = originalCount - 2;
    return 2 + numberOfTriangles * 4;
  }

  return originalCount;
};

export default WireframeIndexGenerator;
