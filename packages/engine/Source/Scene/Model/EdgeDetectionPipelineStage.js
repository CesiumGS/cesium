import ShaderDestination from "../../Renderer/ShaderDestination.js";
import EdgeDetectionStageFS from "../../Shaders/Model/EdgeDetectionStageFS.js";

/**
 * A pipeline stage for edge detection and discard logic for planar surfaces.
 * This stage adds shader code to discard fragments that would cause z-fighting
 * with edges by reading from the ID buffer and depth texture.
 *
 * @namespace EdgeDetectionPipelineStage
 *
 * @private
 */
const EdgeDetectionPipelineStage = {
  name: "EdgeDetectionPipelineStage",
};

/**
 * Process a primitive. This modifies the following parts of the render
 * resources:
 * <ul>
 *  <li>Adds shader code to read from the edge ID buffer and depth texture</li>
 *  <li>Implements edge detection logic to discard fragments near edges</li>
 * </ul>
 * @param {PrimitiveRenderResources} renderResources The render resources for the primitive
 * @private
 */
EdgeDetectionPipelineStage.process = function (renderResources) {
  const shaderBuilder = renderResources.shaderBuilder;
  const uniformMap = renderResources.uniformMap;

  shaderBuilder.addUniform(
    "float",
    "czm_edgeDepthTolerance",
    ShaderDestination.FRAGMENT,
  );
  uniformMap.czm_edgeDepthTolerance = function () {
    return 0.001;
  };

  shaderBuilder.addFragmentLines([EdgeDetectionStageFS]);
};

export default EdgeDetectionPipelineStage;
