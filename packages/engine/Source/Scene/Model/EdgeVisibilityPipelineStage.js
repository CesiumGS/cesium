import Buffer from "../../Renderer/Buffer.js";
import BufferUsage from "../../Renderer/BufferUsage.js";
import VertexArray from "../../Renderer/VertexArray.js";
import defined from "../../Core/defined.js";
import IndexDatatype from "../../Core/IndexDatatype.js";
import PrimitiveType from "../../Core/PrimitiveType.js";
import Pass from "../../Renderer/Pass.js";

/**
 * Pipeline stage for generating edge geometry from EXT_mesh_primitive_edge_visibility data.
 *
 * @namespace EdgeVisibilityPipelineStage
 *
 * @private
 */
const EdgeVisibilityPipelineStage = {
  name: "EdgeVisibilityPipelineStage",
};

/**
 *
 * @param {PrimitiveRenderResources} renderResources The render resources for the primitive
 * @param {ModelComponents.Primitive} primitive The primitive to be rendered
 * @param {FrameState} frameState The frame state
 * @private
 */
EdgeVisibilityPipelineStage.process = function (
  renderResources,
  primitive,
  frameState,
) {
  if (!defined(primitive.edgeVisibility)) {
    return;
  }

  // Extract visible edges as line indices (pairs of vertex indices)
  const edgeIndices = extractVisibleEdgesAsLineIndices(primitive);
  if (!defined(edgeIndices) || edgeIndices.length === 0) {
    return;
  }

  // Create edge geometry using existing attributes and line indices
  const edgeGeometry = createLineEdgeGeometry(
    edgeIndices,
    renderResources,
    frameState.context,
  );

  if (!defined(edgeGeometry)) {
    return;
  }

  // Store edge geometry for ModelDrawCommand to create edge commands
  renderResources.edgeGeometry = {
    vertexArray: edgeGeometry.vertexArray,
    indexCount: edgeGeometry.indexCount,
    primitiveType: PrimitiveType.LINES, // Render as lines
    pass: Pass.CESIUM_3D_TILE, // Use regular 3D tile pass for testing
  };

  // Track resources for cleanup
  const model = renderResources.model;
  model._pipelineResources.push(
    edgeGeometry.indexBuffer,
    edgeGeometry.vertexArray,
  );
};

/**
 * Extracts visible edge segments from EXT_mesh_primitive_edge_visibility data
 * and converts them to line indices for GL_LINES rendering.
 * @param {ModelComponents.Primitive} primitive The primitive with edge visibility data
 * @returns {number[]} Array of line indices (pairs of vertex indices)
 * @private
 */
function extractVisibleEdgesAsLineIndices(primitive) {
  const edgeVisibility = primitive.edgeVisibility;
  const visibility = edgeVisibility.visibility;
  const indices = primitive.indices;

  if (!defined(visibility) || !defined(indices)) {
    return [];
  }

  const triangleIndexArray = indices.typedArray;
  const vertexCount = primitive.attributes[0].count;
  const lineIndices = [];
  const seenEdgeHashes = new Set();

  let bitOffset = 0; // 2 bits per edge in order (v0:v1, v1:v2, v2:v0)
  const totalIndices = triangleIndexArray.length;

  for (let i = 0; i + 2 < totalIndices; i += 3) {
    const v0 = triangleIndexArray[i];
    const v1 = triangleIndexArray[i + 1];
    const v2 = triangleIndexArray[i + 2];

    // Iterate the 3 edges in order
    const edgeVertices = [
      [v0, v1],
      [v1, v2],
      [v2, v0],
    ];

    for (let e = 0; e < 3; e++) {
      const byteIndex = Math.floor(bitOffset / 4);
      const bitPairOffset = (bitOffset % 4) * 2;

      if (byteIndex >= visibility.length) {
        break;
      }

      const byte = visibility[byteIndex];
      const visibility2Bit = (byte >> bitPairOffset) & 0x3;
      bitOffset++;

      // Extract SILHOUETTE (1) and VISIBLE (2) edges
      if (visibility2Bit === 1 || visibility2Bit === 2) {
        const a = edgeVertices[e][0];
        const b = edgeVertices[e][1];
        const small = Math.min(a, b);
        const big = Math.max(a, b);
        const hash = small * vertexCount + big;

        if (!seenEdgeHashes.has(hash)) {
          seenEdgeHashes.add(hash);
          lineIndices.push(a, b); // Add line segment
        }
      }
    }
  }

  return lineIndices;
}

/**
 * Creates simple line edge geometry using existing vertex attributes.
 * @param {number[]} edgeIndices The line indices (pairs of vertex indices)
 * @param {PrimitiveRenderResources} renderResources The render resources
 * @param {Context} context The rendering context
 * @returns {Object} Edge geometry with vertex array and index buffer
 * @private
 */
function createLineEdgeGeometry(edgeIndices, renderResources, context) {
  if (!defined(edgeIndices) || edgeIndices.length === 0) {
    return undefined;
  }

  // Create index buffer for line indices
  const indexBuffer = Buffer.createIndexBuffer({
    context: context,
    typedArray: new Uint16Array(edgeIndices),
    usage: BufferUsage.STATIC_DRAW,
    indexDatatype: IndexDatatype.UNSIGNED_SHORT,
  });

  const vertexArray = new VertexArray({
    context: context,
    indexBuffer: indexBuffer,
    attributes: renderResources.attributes,
  });

  return {
    vertexArray: vertexArray,
    indexBuffer: indexBuffer,
    indexCount: edgeIndices.length,
  };
}

export default EdgeVisibilityPipelineStage;
