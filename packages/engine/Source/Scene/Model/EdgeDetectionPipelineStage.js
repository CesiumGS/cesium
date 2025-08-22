import defined from "../../Core/defined.js";
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
  // Skip edge detection for edge passes themselves
  if (renderResources.alphaOptions.pass === Pass.CESIUM_3D_TILE_EDGES) {
    return;
  }

  // Only apply edge detection if we have an edge framebuffer available
  if (
    !defined(frameState.scene) ||
    !defined(frameState.scene._view) ||
    !defined(frameState.scene._view.edgeFramebuffer)
  ) {
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
    if (
      defined(frameState.scene) &&
      defined(frameState.scene._view) &&
      defined(frameState.scene._view.edgeFramebuffer)
    ) {
      return frameState.scene._view.edgeFramebuffer.idTexture;
    }
    return undefined;
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
  shaderBuilder.addFragmentLines([
    "#ifdef HAS_EDGE_DETECTION",
    "void performEdgeDetection() {",
    "  // Get screen coordinate for texture lookup",
    "  vec2 screenCoord = gl_FragCoord.xy / czm_viewport.zw;",
    "  ",
    "  // Read edge ID from the edge buffer",
    "  vec4 edgeId = texture(czm_edgeIdTexture, screenCoord);",
    "  ",
    "  // Read depth from the globe depth texture (includes 3D Tiles)",
    "  float edgeDepth = texture(czm_globeDepthTexture, screenCoord).r;",
    "  ",
    "  // Convert fragment depth to same coordinate system",
    "  float fragmentDepth = gl_FragCoord.z;",
    "  ",
    "  // If there's an edge at this pixel and the depths are close, discard",
    "  // This prevents z-fighting between edges and underlying surfaces",
    "  if (edgeId.a > 0.0 && abs(fragmentDepth - edgeDepth) < czm_edgeDepthTolerance) {",
    "    discard;",
    "  }",
    "}",
    "#endif",
  ]);

  // Add the call to edge detection in the fragment shader main function
  shaderBuilder.addFunctionLines("fragmentMain", [
    "#ifdef HAS_EDGE_DETECTION",
    "  performEdgeDetection();",
    "#endif",
  ]);
};

export default EdgeDetectionPipelineStage;
