// import ShaderDestination from "../../Renderer/ShaderDestination.js";
import EdgeVisibilityGenerator from "./EdgeVisibilityGenerator.js";
// import EdgeVisibilityStageVS from "../../Shaders/Model/EdgeVisibilityStageVS.js";
// import EdgeVisibilityStageFS from "../../Shaders/Model/EdgeVisibilityStageFS.js";
import defined from "../../Core/defined.js";

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
  // Check if this primitive has edge visibility data
  if (!defined(primitive.edgeVisibility)) {
    return;
  }

  console.log(
    "EdgeVisibilityPipelineStage: Processing primitive with edge visibility data",
  );
  console.log("Edge visibility data:", primitive.edgeVisibility);

  // const shaderBuilder = renderResources.shaderBuilder;
  // const uniformMap = renderResources.uniformMap;

  // COMMENTED OUT FOR CONSOLE LOGGING ONLY - NO RENDERING
  // shaderBuilder.addDefine(
  //   "HAS_EDGE_VISIBILITY",
  //   undefined,
  //   ShaderDestination.BOTH,
  // );

  // Generate edge geometry data
  console.log("EdgeVisibilityPipelineStage: Generating edge geometry...");
  const edgeGeometry = EdgeVisibilityGenerator.generateEdgeGeometry(
    primitive,
    frameState.context,
  );

  // Store edge geometry data for ModelDrawCommand to use
  if (defined(edgeGeometry)) {
    // renderResources.edgeGeometry = edgeGeometry;
    console.log(
      "EdgeVisibilityPipelineStage: Edge geometry generated successfully",
    );
    console.log("Edge geometry details:", {
      indexCount: edgeGeometry.indexCount,
      primitiveType: edgeGeometry.primitiveType,
    });
  } else {
    console.log("EdgeVisibilityPipelineStage: No edge geometry generated");
  }

  // COMMENTED OUT - Add shader code for edge rendering
  // shaderBuilder.addVertexLines(EdgeVisibilityStageVS);
  // shaderBuilder.addFragmentLines(EdgeVisibilityStageFS);
};

export default EdgeVisibilityPipelineStage;
