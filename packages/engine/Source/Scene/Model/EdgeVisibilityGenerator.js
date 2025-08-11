import defined from "../../Core/defined.js";
import PrimitiveType from "../../Core/PrimitiveType.js";

/**
 * Generates edge geometry and draw commands for the EXT_mesh_primitive_edge_visibility extension.
 *
 * @namespace EdgeVisibilityGenerator
 *
 * @private
 */
const EdgeVisibilityGenerator = {
  name: "EdgeVisibilityGenerator", // Helps with debugging
};

/**
 * Edge visibility types matching the glTF extension specification
 * @private
 */
const EdgeVisibility = {
  HIDDEN: 0,
  SILHOUETTE: 1,
  VISIBLE: 2,
  VISIBLE_DUPLICATE: 3,
};

/**
 * Get human-readable name for visibility value
 * @param {number} visibility The visibility value
 * @returns {string} The visibility name
 * @private
 */
// function getVisibilityName(visibility) {
//   switch (visibility) {
//     case EdgeVisibility.HIDDEN:
//       return "HIDDEN";
//     case EdgeVisibility.SILHOUETTE:
//       return "SILHOUETTE";
//     case EdgeVisibility.VISIBLE:
//       return "VISIBLE";
//     case EdgeVisibility.VISIBLE_DUPLICATE:
//       return "VISIBLE_DUPLICATE";
//     default:
//       return `UNKNOWN(${visibility})`;
//   }
// }

/**
 * Creates an iterator for processing edge visibility data similar to iTwin.js CompactEdges
 * @param {Uint8Array} visibilityBuffer The visibility buffer
 * @param {number} triangleCount Number of triangles
 * @private
 */
function createEdgeVisibilityIterator(visibilityBuffer, triangleCount) {
  let triangleIndex = 0;
  let edgeIndex = 0;
  let bitIndex = 0;

  return {
    hasNext: () => triangleIndex < triangleCount,
    next: () => {
      if (triangleIndex >= triangleCount) {
        return null;
      }

      const triangle = {
        triangleIndex,
        edges: [],
      };

      // Process 3 edges for this triangle
      for (let i = 0; i < 3; i++) {
        const byteIndex = Math.floor(bitIndex / 4);
        const bitOffset = (bitIndex % 4) * 2;
        const visibility = (visibilityBuffer[byteIndex] >> bitOffset) & 0x3;

        triangle.edges.push({
          edgeIndex: edgeIndex,
          visibility: visibility,
          vertexIndices: getEdgeVertices(triangleIndex, i),
        });

        edgeIndex++;
        bitIndex++;
      }

      triangleIndex++;
      return triangle;
    },
  };
}

/**
 * Get vertex indices for an edge within a triangle
 * @param {number} triangleIndex Index of the triangle
 * @param {number} edgeIndex Edge index within triangle (0, 1, or 2)
 * @returns {Array} [v0, v1] vertex indices for the edge
 * @private
 */
function getEdgeVertices(triangleIndex, edgeIndex) {
  const baseIndex = triangleIndex * 3;
  switch (edgeIndex) {
    case 0:
      return [baseIndex, baseIndex + 1]; // v0-v1
    case 1:
      return [baseIndex + 1, baseIndex + 2]; // v1-v2
    case 2:
      return [baseIndex + 2, baseIndex]; // v2-v0
    default:
      return [0, 0];
  }
}

/**
 * Generate edge geometry from the primitive's edge visibility data
 * @param {ModelComponents.Primitive} primitive The primitive with edge visibility data
 * @param {Context} context The rendering context
 * @returns {Object} The generated edge geometry or undefined if no edges
 * @private
 */
EdgeVisibilityGenerator.generateEdgeGeometry = function (primitive, context) {
  if (!defined(primitive.edgeVisibility)) {
    return undefined;
  }

  const edgeVisibility = primitive.edgeVisibility;
  const visibility = edgeVisibility.visibility;
  const indices = primitive.indices;
  const positions = primitive.attributes.find(
    (attr) => attr.semantic === "POSITION",
  );

  if (!defined(visibility) || !defined(indices) || !defined(positions)) {
    return undefined;
  }

  // Get actual indices array - could be direct array or typedArray property
  const indicesArray = indices.typedArray || indices;
  const hasIndexArray = defined(indicesArray) && defined(indicesArray.length);
  const visibilityBytes = visibility.length >>> 0;

  // When running with a synthetic test buffer (small) but real mesh indices (large),
  // prefer deriving triangle count from visibility to avoid reading past the buffer.
  // Each triangle contributes 6 bits; total bytes = ceil(6*N/8).
  const trianglesFromVisibility =
    visibilityBytes > 0 ? Math.floor((visibilityBytes * 8) / 6) : 0;

  let triangleCount = hasIndexArray ? Math.floor(indicesArray.length / 3) : 0;
  if (trianglesFromVisibility > 0) {
    triangleCount = Math.min(
      triangleCount || trianglesFromVisibility,
      trianglesFromVisibility,
    );
  }

  const edgeIndices = [];
  const edgeNormals = [];

  // silhouetteNormal
  const silhouetteNormalsValues = edgeVisibility.silhouetteNormals;
  const hasSilhouetteNormals = defined(silhouetteNormalsValues);
  const normalPairs = hasSilhouetteNormals
    ? ArrayBuffer.isView(silhouetteNormalsValues)
      ? silhouetteNormalsValues
      : new Uint32Array(silhouetteNormalsValues)
    : undefined;
  let nextSilhouetteNormalIndex = 0;

  // Create iterator for processing visibility data
  const iterator = createEdgeVisibilityIterator(visibility, triangleCount);

  while (iterator.hasNext()) {
    const triangle = iterator.next();

    for (const edge of triangle.edges) {
      const { visibility: edgeVisibility, vertexIndices } = edge;
      const [v0Index, v1Index] = vertexIndices;
      if (!hasIndexArray || v1Index >= indicesArray.length) {
        continue;
      }
      const v0 = indicesArray[v0Index];
      const v1 = indicesArray[v1Index];

      // Add visible edges (excluding HIDDEN and VISIBLE_DUPLICATE to avoid redundancy)
      if (
        edgeVisibility === EdgeVisibility.VISIBLE ||
        edgeVisibility === EdgeVisibility.SILHOUETTE
      ) {
        // Associate a normal pair for silhouettes if available
        const normalPair =
          edgeVisibility === EdgeVisibility.SILHOUETTE && defined(normalPairs)
            ? normalPairs[nextSilhouetteNormalIndex++]
            : undefined;
        addEdge(v0, v1, edgeIndices, edgeNormals, normalPair);
      }
    }
  }

  if (edgeIndices.length === 0) {
    return undefined;
  }

  // Pick the typed array type to match the base indices (Uint16Array/Uint32Array)
  const baseIndices = indicesArray;
  const EdgeIndexArrayType =
    baseIndices instanceof Uint32Array ? Uint32Array : Uint16Array;

  const edgeIndexTyped = new EdgeIndexArrayType(edgeIndices);

  // Pack edge normals parallel to edge segments if any silhouettes exist.
  // Use 0xffffffff sentinel for edges without normals.
  let edgeNormalsTyped;
  if (edgeNormals.length > 0 && edgeNormals.some((n) => defined(n))) {
    edgeNormalsTyped = new Uint32Array(edgeIndices.length / 2);
    let writeIndex = 0;
    for (let i = 0; i < edgeNormalsTyped.length; i++) {
      const n = edgeNormals[writeIndex++];
      edgeNormalsTyped[i] = defined(n) ? n : 0xffffffff >>> 0;
    }
  }

  return {
    indexCount: edgeIndexTyped.length,
    primitiveType: PrimitiveType.LINES,
    edgeIndices: edgeIndexTyped,
    edgeNormals: edgeNormalsTyped,
  };
};

/**
 * Add an edge to the edge geometry
 * @param {number} v0 First vertex index
 * @param {number} v1 Second vertex index
 * @param {Array} edgeIndices Array to store edge indices
 * @param {Array} edgeNormals Array to store edge normals
 * @private
 */
function addEdge(v0, v1, edgeIndices, edgeNormals, normalPair) {
  // Add indices for line segment
  edgeIndices.push(v0, v1);

  // Track the edge normal if provided
  if (defined(edgeNormals)) {
    edgeNormals.push(normalPair);
  }
}

export default EdgeVisibilityGenerator;
