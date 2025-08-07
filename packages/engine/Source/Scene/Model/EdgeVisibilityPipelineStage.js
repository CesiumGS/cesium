import ShaderDestination from "../../Renderer/ShaderDestination.js";
import EdgeVisibilityGenerator from "./EdgeVisibilityGenerator.js";
import EdgeVisibilityStageVS from "../../Shaders/Model/EdgeVisibilityStageVS.js";
import EdgeVisibilityStageFS from "../../Shaders/Model/EdgeVisibilityStageFS.js";
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
 * Process a primitive. This modifies the following parts of the render
 * resources:
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

  const shaderBuilder = renderResources.shaderBuilder;
  // const uniformMap = renderResources.uniformMap;

  shaderBuilder.addDefine(
    "HAS_EDGE_VISIBILITY",
    undefined,
    ShaderDestination.BOTH,
  );

  // Generate edge geometry
  const edgeGeometry = EdgeVisibilityGenerator.generateEdgeGeometry(
    primitive,
    frameState.context,
  );

  if (defined(edgeGeometry)) {
    // Create edge draw command
    const edgeDrawCommand = EdgeVisibilityGenerator.createEdgeDrawCommand(
      edgeGeometry,
      renderResources,
      frameState,
    );

    // Store edge command for later submission
    renderResources.edgeCommands = renderResources.edgeCommands || [];
    renderResources.edgeCommands.push(edgeDrawCommand);
  }

  // TODO: get information from model maybe?
  // const model = renderResources.model;
  // shaderBuilder.addUniform(
  //   "vec4",
  //   "model_edgeColor",
  //   ShaderDestination.FRAGMENT,
  // );
  // uniformMap.model_edgeColor = function () {
  //   return model.edgeColor || [0.0, 0.0, 0.0, 1.0];
  // };

  // shaderBuilder.addUniform(
  //   "bool",
  //   "model_showEdges",
  //   ShaderDestination.FRAGMENT,
  // );
  // uniformMap.model_showEdges = function () {
  //   return model.showEdges !== false;
  // };

  // Add shader code for edge rendering
  shaderBuilder.addVertexLines(EdgeVisibilityStageVS);
  shaderBuilder.addFragmentLines(EdgeVisibilityStageFS);
};

export default EdgeVisibilityPipelineStage;
