import defined from "../../Core/defined.js";
import PrimitiveType from "../../Core/PrimitiveType.js";
// import Buffer from "../../Renderer/Buffer.js";
// import BufferUsage from "../../Renderer/BufferUsage.js";
// import ComponentDatatype from "../../Core/ComponentDatatype.js";
// import VertexArray from "../../Renderer/VertexArray.js";

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
function getVisibilityName(visibility) {
  switch (visibility) {
    case EdgeVisibility.HIDDEN:
      return "HIDDEN";
    case EdgeVisibility.SILHOUETTE:
      return "SILHOUETTE";
    case EdgeVisibility.VISIBLE:
      return "VISIBLE";
    case EdgeVisibility.VISIBLE_DUPLICATE:
      return "VISIBLE_DUPLICATE";
    default:
      return `UNKNOWN(${visibility})`;
  }
}

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

      console.log(`Processing triangle ${triangleIndex}`);

      // Process 3 edges for this triangle
      for (let i = 0; i < 3; i++) {
        const byteIndex = Math.floor(bitIndex / 4);
        const bitOffset = (bitIndex % 4) * 2;
        const visibility = (visibilityBuffer[byteIndex] >> bitOffset) & 0x3;

        console.log(
          `  Edge ${i}: bitIndex=${bitIndex}, byteIndex=${byteIndex}, bitOffset=${bitOffset}, visibility=${visibility}`,
        );

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
    console.log("EdgeVisibilityGenerator: Missing required data", {
      hasVisibility: defined(visibility),
      hasIndices: defined(indices),
      hasPositions: defined(positions),
    });
    return undefined;
  }

  console.log("EdgeVisibilityGenerator: Debugging indices structure:", {
    indices: indices,
    indicesType: typeof indices,
    indicesLength: indices.length,
    indicesTypedArray: indices.typedArray,
    indicesTypedArrayLength: indices.typedArray
      ? indices.typedArray.length
      : "undefined",
  });

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

  console.log(`EdgeVisibilityGenerator: Processing ${triangleCount} triangles`);
  console.log(`Visibility buffer length: ${visibility.length} bytes`);
  const expectedBytes = Math.ceil((triangleCount * 3 * 2) / 8);
  console.log(
    `Expected buffer length (for ${triangleCount} tris): ${expectedBytes} bytes`,
  );

  const edgeIndices = [];
  const edgePositions = [];
  const edgeNormals = [];

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

      console.log(
        `    Edge ${v0}-${v1}: visibility=${edgeVisibility} (${getVisibilityName(edgeVisibility)})`,
      );

      // Add visible edges (excluding HIDDEN and VISIBLE_DUPLICATE to avoid redundancy)
      if (
        edgeVisibility === EdgeVisibility.VISIBLE ||
        edgeVisibility === EdgeVisibility.SILHOUETTE
      ) {
        addEdge(v0, v1, positions, edgeIndices, edgePositions, edgeNormals);
        console.log(`      Added edge ${v0}-${v1} to geometry`);
      }
    }
  }

  console.log(`Generated ${edgeIndices.length / 2} edge segments`);

  if (edgeIndices.length === 0) {
    console.log("EdgeVisibilityGenerator: No edges to render");
    return undefined;
  }

  // COMMENTED OUT - Create buffers (for console logging only)
  // const indexBuffer = Buffer.createIndexBuffer({
  //   context: context,
  //   typedArray: new Uint16Array(edgeIndices),
  //   usage: BufferUsage.STATIC_DRAW,
  // });

  // const positionBuffer = Buffer.createVertexBuffer({
  //   context: context,
  //   typedArray: new Float32Array(edgePositions),
  //   usage: BufferUsage.STATIC_DRAW,
  // });

  // // Create vertex array for edge rendering
  // const vertexArray = new VertexArray({
  //   context: context,
  //   indexBuffer: indexBuffer,
  //   attributes: [
  //     {
  //       index: 0,
  //       vertexBuffer: positionBuffer,
  //       componentsPerAttribute: 3,
  //       componentDatatype: ComponentDatatype.FLOAT,
  //       offsetInBytes: 0,
  //       strideInBytes: 0,
  //       normalize: false,
  //     },
  //   ],
  // });

  // Return minimal data for logging purposes only
  return {
    // vertexArray: vertexArray,
    indexCount: edgeIndices.length,
    primitiveType: PrimitiveType.LINES,
    edgeIndices: edgeIndices,
  };
};

/**
 * Add an edge to the edge geometry
 * @param {number} v0 First vertex index
 * @param {number} v1 Second vertex index
 * @param {Object} positions Position attribute data
 * @param {Array} edgeIndices Array to store edge indices
 * @param {Array} edgePositions Array to store edge positions
 * @param {Array} edgeNormals Array to store edge normals
 * @private
 */
function addEdge(v0, v1, positions, edgeIndices, edgePositions, edgeNormals) {
  // Add indices for line segment
  edgeIndices.push(v0, v1);

  // Add positions (assuming positions are already in the main geometry)
  // For now, we'll reference the main position buffer
  // In a full implementation, you might want to create a separate position buffer for edges
}

export default EdgeVisibilityGenerator;
