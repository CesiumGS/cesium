import defined from "../../Core/defined.js";
import DrawCommand from "../../Renderer/DrawCommand.js";
import Pass from "../../Renderer/Pass.js";
import PrimitiveType from "../../Core/PrimitiveType.js";
import Buffer from "../../Renderer/Buffer.js";
import BufferUsage from "../../Renderer/BufferUsage.js";
import ComponentDatatype from "../../Core/ComponentDatatype.js";

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

  const edgeIndices = [];
  const edgePositions = [];
  const edgeNormals = [];

  // Process each triangle's edges
  for (let i = 0; i < indices.length; i += 3) {
    const v0 = indices[i];
    const v1 = indices[i + 1];
    const v2 = indices[i + 2];

    // Get edge visibility for this triangle
    const edge0Visibility = (visibility[i] >> 0) & 0x3;
    const edge1Visibility = (visibility[i + 1] >> 0) & 0x3;
    const edge2Visibility = (visibility[i + 2] >> 0) & 0x3;

    // Add visible edges
    if (
      edge0Visibility === EdgeVisibility.VISIBLE ||
      edge0Visibility === EdgeVisibility.SILHOUETTE
    ) {
      addEdge(v0, v1, positions, edgeIndices, edgePositions, edgeNormals);
    }
    if (
      edge1Visibility === EdgeVisibility.VISIBLE ||
      edge1Visibility === EdgeVisibility.SILHOUETTE
    ) {
      addEdge(v1, v2, positions, edgeIndices, edgePositions, edgeNormals);
    }
    if (
      edge2Visibility === EdgeVisibility.VISIBLE ||
      edge2Visibility === EdgeVisibility.SILHOUETTE
    ) {
      addEdge(v2, v0, positions, edgeIndices, edgePositions, edgeNormals);
    }
  }

  if (edgeIndices.length === 0) {
    return undefined;
  }

  // Create buffers
  const indexBuffer = Buffer.createIndexBuffer({
    context: context,
    typedArray: new Uint16Array(edgeIndices),
    usage: BufferUsage.STATIC_DRAW,
  });

  const positionBuffer = Buffer.createVertexBuffer({
    context: context,
    typedArray: new Float32Array(edgePositions),
    usage: BufferUsage.STATIC_DRAW,
  });

  return {
    indexBuffer: indexBuffer,
    positionBuffer: positionBuffer,
    indexCount: edgeIndices.length,
    primitiveType: PrimitiveType.LINES,
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

/**
 * Create a draw command for edge rendering
 * @param {Object} edgeGeometry The generated edge geometry
 * @param {PrimitiveRenderResources} renderResources The render resources
 * @param {FrameState} frameState The frame state
 * @returns {DrawCommand} The edge draw command
 * @private
 */
EdgeVisibilityGenerator.createEdgeDrawCommand = function (
  edgeGeometry,
  renderResources,
  frameState,
) {
  const shaderProgram = renderResources.shaderProgram;
  const uniformMap = renderResources.uniformMap;
  const model = renderResources.model;

  const drawCommand = new DrawCommand({
    modelMatrix: model.modelMatrix,
    primitiveType: edgeGeometry.primitiveType,
    vertexArray: {
      indexBuffer: edgeGeometry.indexBuffer,
      attributes: [
        {
          index: 0,
          vertexBuffer: edgeGeometry.positionBuffer,
          componentsPerAttribute: 3,
          componentDatatype: ComponentDatatype.FLOAT,
          offsetInBytes: 0,
          strideInBytes: 0,
          normalize: false,
        },
      ],
    },
    shaderProgram: shaderProgram,
    uniformMap: uniformMap,
    pass: Pass.CESIUM_3D_TILE_EDGES,
    count: edgeGeometry.indexCount,
    owner: model,
  });

  return drawCommand;
};

export default EdgeVisibilityGenerator;
