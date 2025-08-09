// import ShaderDestination from "../../Renderer/ShaderDestination.js";
import EdgeVisibilityGenerator from "./EdgeVisibilityGenerator.js";
import Buffer from "../../Renderer/Buffer.js";
import BufferUsage from "../../Renderer/BufferUsage.js";
import VertexArray from "../../Renderer/VertexArray.js";
import defined from "../../Core/defined.js";
import IndexDatatype from "../../Core/IndexDatatype.js";
// import EdgeVisibilityStageVS from "../../Shaders/Model/EdgeVisibilityStageVS.js";
// import EdgeVisibilityStageFS from "../../Shaders/Model/EdgeVisibilityStageFS.js";

/**
 * The edge visibility pipeline stage configures the shader to render edges
 * from the EXT_mesh_primitive_edge_visibility extension.
 *
 * @namespace EdgeVisibilityPipelineStage
 *
 * @private
 */
const EdgeVisibilityPipelineStage = {
  name: "EdgeVisibilityPipelineStage", // Helps with debugging
};

/**
 * <ul>
 *  <li>Generates edge geometry from the visibility data</li>
 *  <li>Creates separate draw commands for edges assigned to CESIUM_3D_TILE_EDGES pass</li>
 *  <li>Adds shader code for edge rendering</li>
 * </ul>
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

  console.log(
    "EdgeVisibilityPipelineStage: Processing primitive with edge visibility data",
  );
  console.log("Edge visibility data:", primitive.edgeVisibility);

  // Generate edge geometry data
  console.log("EdgeVisibilityPipelineStage: Generating edge geometry...");
  const edgeGeometry = EdgeVisibilityGenerator.generateEdgeGeometry(
    primitive,
    frameState.context,
  );

  // Store edge geometry data for ModelDrawCommand to use
  if (defined(edgeGeometry)) {
    const indexDatatype =
      edgeGeometry.edgeIndices instanceof Uint32Array
        ? IndexDatatype.UNSIGNED_INT
        : IndexDatatype.UNSIGNED_SHORT;
    const indexBuffer = Buffer.createIndexBuffer({
      context: frameState.context,
      typedArray: edgeGeometry.edgeIndices,
      usage: BufferUsage.STATIC_DRAW,
      indexDatatype: indexDatatype,
    });

    const attributes = [];
    for (let i = 0; i < renderResources.attributes.length; i++) {
      const a = renderResources.attributes[i];
      attributes.push({
        index: a.index,
        vertexBuffer: a.vertexBuffer,
        componentsPerAttribute: a.componentsPerAttribute,
        componentDatatype: a.componentDatatype,
        offsetInBytes: a.offsetInBytes,
        strideInBytes: a.strideInBytes,
        normalize: a.normalize,
      });
    }

    const vertexArray = new VertexArray({
      context: frameState.context,
      indexBuffer: indexBuffer,
      attributes: attributes,
    });

    // Expose to ModelDrawCommand so it can derive the edge command
    renderResources.edgeGeometry = {
      vertexArray: vertexArray,
      indexCount: edgeGeometry.indexCount,
      primitiveType: edgeGeometry.primitiveType,
      edgeNormals: edgeGeometry.edgeNormals,
    };

    // Track resources for cleanup with the model
    const model = renderResources.model;
    model._pipelineResources.push(indexBuffer, vertexArray);

    console.log("Edge geometry details:", {
      indexCount: edgeGeometry.indexCount,
      primitiveType: edgeGeometry.primitiveType,
    });
  } else {
    console.log("EdgeVisibilityPipelineStage: No edge geometry generated");
  }

  // shaderBuilder.addVertexLines(EdgeVisibilityStageVS);
  // shaderBuilder.addFragmentLines(EdgeVisibilityStageFS);
};

export default EdgeVisibilityPipelineStage;
