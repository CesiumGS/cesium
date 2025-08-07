import ShaderDestination from "../../Renderer/ShaderDestination.js";
import Pass from "../../Renderer/Pass.js";

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
  if (renderResources.alphaOptions.pass === Pass.CESIUM_3D_TILE_EDGES) {
    return;
  }

  const shaderBuilder = renderResources.shaderBuilder;
  const uniformMap = renderResources.uniformMap;

  shaderBuilder.addDefine(
    "HAS_EDGE_DETECTION",
    undefined,
    ShaderDestination.FRAGMENT,
  );

  // Add uniform for edge detection (czm_globeDepthTexture is already an automatic uniform)
  shaderBuilder.addUniform(
    "sampler2D",
    "czm_edgeIdTexture",
    ShaderDestination.FRAGMENT,
  );
  uniformMap.czm_edgeIdTexture = function () {
    // Bind to the edge framebuffer's ID texture
    return frameState.scene._view.edgeFramebuffer.idTexture;
  };

  shaderBuilder.addUniform(
    "float",
    "czm_edgeDepthTolerance",
    ShaderDestination.FRAGMENT,
  );
  uniformMap.czm_edgeDepthTolerance = function () {
    return 0.001;
  };

  shaderBuilder.addFragmentLines(`
    #ifdef HAS_EDGE_DETECTION
    void performEdgeDetection(vec2 fragCoord, float fragmentDepth) {
      // Read edge ID from the edge buffer
      vec4 edgeId = texture(czm_edgeIdTexture, fragCoord);
      
      // Read depth from the globe depth texture
      float edgeDepth = texture(czm_globeDepthTexture, fragCoord).r;
      
      // If there's an edge at this pixel and the depths are close, discard
      if (edgeId.a > 0.0 && abs(fragmentDepth - edgeDepth) < czm_edgeDepthTolerance) {
        discard;
      }
    }
    #endif
  `);
};

export default EdgeDetectionPipelineStage;
