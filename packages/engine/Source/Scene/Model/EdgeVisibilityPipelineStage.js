import Buffer from "../../Renderer/Buffer.js";
import BufferUsage from "../../Renderer/BufferUsage.js";
import VertexArray from "../../Renderer/VertexArray.js";
import defined from "../../Core/defined.js";
import IndexDatatype from "../../Core/IndexDatatype.js";
import PrimitiveType from "../../Core/PrimitiveType.js";
import Pass from "../../Renderer/Pass.js";
import ComponentDatatype from "../../Core/ComponentDatatype.js";

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

  // Check if we have the required edge visibility data
  if (!defined(primitive.edgeVisibility.visibility)) {
    return;
  }

  // Create a simple edge geometry that doesn't require typed array access
  // This approach uses the edge visibility buffer directly in shaders
  const edgeGeometry = createEdgeGeometryFromVisibilityBuffer(
    primitive,
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
    primitiveType: PrimitiveType.TRIANGLES, // Use triangles for quad-based edges
    pass: Pass.CESIUM_3D_TILE,
  };

  // Track resources for cleanup
  const model = renderResources.model;
  model._pipelineResources.push(
    edgeGeometry.indexBuffer,
    edgeGeometry.vertexArray,
  );
};

/**
 * Creates edge geometry from EXT_mesh_primitive_edge_visibility data by properly
 * decoding the visibility bitfield and mapping edges to vertex endpoints.
 * @param {ModelComponents.Primitive} primitive The primitive with edge visibility data
 * @param {PrimitiveRenderResources} renderResources The render resources
 * @param {Context} context The rendering context
 * @returns {Object} Edge geometry with vertex array and index buffer
 * @private
 */
function createEdgeGeometryFromVisibilityBuffer(
  primitive,
  renderResources,
  context,
) {
  const edgeVisibility = primitive.edgeVisibility;
  if (!defined(edgeVisibility.visibility)) {
    return undefined;
  }

  // Extract visible edges by decoding the visibility bitfield
  const visibleEdges = extractVisibleEdges(primitive);
  if (!visibleEdges || visibleEdges.length === 0) {
    return undefined;
  }

  // Create quad geometry for each visible edge
  const verticesPerEdge = 4; // quad vertices
  const indicesPerEdge = 6; // 2 triangles per quad
  const edgeCount = visibleEdges.length;
  const totalVertices = edgeCount * verticesPerEdge;
  const totalIndices = edgeCount * indicesPerEdge;

  // Create edge parameter buffer - each vertex has [triangleIndex, edgeInTriangle, quadCorner, unused]
  // The shader will use triangleIndex and edgeInTriangle to look up the actual vertex indices
  const edgeParameters = new Float32Array(totalVertices * 4);

  for (let edgeIndex = 0; edgeIndex < edgeCount; edgeIndex++) {
    const edge = visibleEdges[edgeIndex];
    const baseVertex = edgeIndex * verticesPerEdge;

    // Quad corners: 0=bottom-left, 1=bottom-right, 2=top-right, 3=top-left
    for (let corner = 0; corner < 4; corner++) {
      const vertexIndex = (baseVertex + corner) * 4;
      edgeParameters[vertexIndex] = edge.triangleIndex; // Triangle index for this edge
      edgeParameters[vertexIndex + 1] = edge.edgeInTriangle; // Edge within triangle (0, 1, or 2)
      edgeParameters[vertexIndex + 2] = corner; // Quad corner identifier
      edgeParameters[vertexIndex + 3] = edge.visibility; // Visibility value for potential use
    }
  }

  // Create indices for triangulated quads
  const indices = new Uint32Array(totalIndices);
  for (let edgeIndex = 0; edgeIndex < edgeCount; edgeIndex++) {
    const baseVertex = edgeIndex * verticesPerEdge;
    const baseIndex = edgeIndex * indicesPerEdge;

    // First triangle: 0-1-2
    indices[baseIndex] = baseVertex;
    indices[baseIndex + 1] = baseVertex + 1;
    indices[baseIndex + 2] = baseVertex + 2;

    // Second triangle: 0-2-3
    indices[baseIndex + 3] = baseVertex;
    indices[baseIndex + 4] = baseVertex + 2;
    indices[baseIndex + 5] = baseVertex + 3;
  }

  // Create buffers
  const edgeParameterBuffer = Buffer.createVertexBuffer({
    context: context,
    typedArray: edgeParameters,
    usage: BufferUsage.STATIC_DRAW,
  });

  const indexBuffer = Buffer.createIndexBuffer({
    context: context,
    typedArray: indices,
    usage: BufferUsage.STATIC_DRAW,
    indexDatatype: IndexDatatype.UNSIGNED_INT,
  });

  // Create vertex array with edge parameters
  const attributes = [
    {
      index: 0, // Edge parameters attribute
      vertexBuffer: edgeParameterBuffer,
      componentsPerAttribute: 4,
      componentDatatype: ComponentDatatype.FLOAT,
      offsetInBytes: 0,
      strideInBytes: 16, // 4 floats
    },
  ];

  const vertexArray = new VertexArray({
    context: context,
    attributes: attributes,
    indexBuffer: indexBuffer,
  });

  return {
    vertexArray: vertexArray,
    indexBuffer: indexBuffer,
    indexCount: totalIndices,
  };
}

/**
 * Extracts visible edges from the EXT_mesh_primitive_edge_visibility data by
 * properly decoding the packed 2-bit visibility values. Since we can't access
 * the index buffer during pipeline processing, we'll create a deferred approach
 * that stores the visibility data for later processing in the shader.
 * @param {ModelComponents.Primitive} primitive The primitive with edge visibility data
 * @returns {Array} Array of edge visibility information
 * @private
 */
function extractVisibleEdges(primitive) {
  const edgeVisibility = primitive.edgeVisibility;
  const visibilityBuffer = edgeVisibility.visibility;

  // Get triangle count from indices
  const indices = primitive.indices;
  if (!defined(indices) || !defined(indices.count)) {
    return undefined;
  }

  const triangleCount = indices.count / 3;

  // Get visibility data - this is a packed bitfield with 2 bits per edge
  const visibilityData = visibilityBuffer.buffer;
  const visibilityBytes = new Uint8Array(visibilityData);

  const edges = [];

  // Process each triangle's edges
  for (let triangleIndex = 0; triangleIndex < triangleCount; triangleIndex++) {
    // Three edges per triangle
    for (let edgeInTriangle = 0; edgeInTriangle < 3; edgeInTriangle++) {
      const globalEdgeIndex = triangleIndex * 3 + edgeInTriangle;

      // Extract 2-bit visibility value from packed data
      const byteIndex = Math.floor(globalEdgeIndex / 4); // 4 edges per byte (2 bits each)
      const bitOffset = (globalEdgeIndex % 4) * 2;

      if (byteIndex < visibilityBytes.length) {
        const visibilityByte = visibilityBytes[byteIndex];
        const visibility = (visibilityByte >> bitOffset) & 0x03;

        // Only include visible edges (SILHOUETTE=1, VISIBLE=2, VISIBLE_DUPLICATE=3)
        // HIDDEN=0 edges are skipped
        if (visibility > 0) {
          // Store triangle index and edge-in-triangle for shader lookup
          edges.push({
            triangleIndex: triangleIndex,
            edgeInTriangle: edgeInTriangle,
            visibility: visibility,
          });
        }
      }
    }
  }

  return edges;
}

export default EdgeVisibilityPipelineStage;
