import defined from "../../Core/defined.js";
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
 * @param {ModelComponents.Primitive} primitive The primitive to be rendered
 * @param {FrameState} frameState The frame state
 * @private
 */
EdgeDetectionPipelineStage.process = function (
  renderResources,
  primitive,
  frameState,
) {
  const shaderBuilder = renderResources.shaderBuilder;
  const uniformMap = renderResources.uniformMap;

  // Add uniform for edge detection (czm_globeDepthTexture is already an automatic uniform)
  shaderBuilder.addUniform(
    "sampler2D",
    "czm_edgeIdTexture",
    ShaderDestination.FRAGMENT,
  );
  uniformMap.czm_edgeIdTexture = function () {
    // Bind to the edge framebuffer's ID texture
    if (
      defined(frameState.scene) &&
      defined(frameState.scene._view) &&
      defined(frameState.scene._view.edgeFramebuffer)
    ) {
      return frameState.scene._view.edgeFramebuffer.idTexture;
    }
    return frameState.context.defaultTexture;
  };

  shaderBuilder.addUniform(
    "float",
    "czm_edgeDepthTolerance",
    ShaderDestination.FRAGMENT,
  );
  uniformMap.czm_edgeDepthTolerance = function () {
    return 0.001;
  };

  // Add the edge detection function to fragment shader
  shaderBuilder.addFragmentLines([EdgeDetectionStageFS]);
};

export default EdgeDetectionPipelineStage;
