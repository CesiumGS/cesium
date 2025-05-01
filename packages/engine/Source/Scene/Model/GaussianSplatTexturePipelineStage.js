import ShaderDestination from "../../Renderer/ShaderDestination.js";
import GaussianSplatVS from "../../Shaders/Model/GaussianSplatVS.js";
import GaussianSplatFS from "../../Shaders/Model/GaussianSplatFS.js";
import Pass from "../../Renderer/Pass.js";
import PrimitiveType from "../../Core/PrimitiveType.js";
import BlendingState from "../BlendingState.js";

const GaussianSplatTexturePipelineStage = {
  name: "GaussianSplatTexturePipelineStage",
};

/**
 * This pipeline stage sets up the Gaussian splat shaders for rendering from an attribute texture
 * and modifies the rendering resource for instanced rendering.
 *
 * @param {PrimitiveRenderResources} renderResources The render resources for this primitive.
 * @param {ModelComponents.Primitive} primitive The primitive.
 * @param {FrameState} frameState The frame state.
 *
 * @private
 */

GaussianSplatTexturePipelineStage.process = function (
  renderResources,
  primitive,
  frameState,
) {
  const { shaderBuilder } = renderResources;

  const renderStateOptions = renderResources.renderStateOptions;
  renderStateOptions.cull.enabled = false;
  renderStateOptions.depthMask = true;
  renderStateOptions.depthTest.enabled = true;
  renderStateOptions.blending = BlendingState.PRE_MULTIPLIED_ALPHA_BLEND;

  renderResources.alphaOptions.pass = Pass.GAUSSIAN_SPLATS;

  shaderBuilder.addDefine(
    "HAS_GAUSSIAN_SPLATS",
    undefined,
    ShaderDestination.BOTH,
  );

  shaderBuilder.addDefine(
    "HAS_SPLAT_TEXTURE",
    undefined,
    ShaderDestination.BOTH,
  );

  if (renderResources.model.content.tileset.debugShowBoundingVolume) {
    shaderBuilder.addDefine(
      "DEBUG_BOUNDING_VOLUMES",
      undefined,
      ShaderDestination.BOTH,
    );
  }

  shaderBuilder.addAttribute("float", "a_splatIndex");

  shaderBuilder.addVarying("vec4", "v_splatColor");
  shaderBuilder.addVarying("vec2", "v_vertPos");

  shaderBuilder.addUniform(
    "highp usampler2D",
    "u_splatAttributeTexture",
    ShaderDestination.VERTEX,
  );

  shaderBuilder.addUniform("float", "u_splatScale", ShaderDestination.VERTEX);

  const uniformMap = renderResources.uniformMap;

  uniformMap.u_splatScale = function () {
    return renderResources.model?.style?.splatScale ?? 1.0;
  };

  uniformMap.u_splatAttributeTexture = function () {
    return primitive.gaussianSplatTexture;
  };

  renderResources.instanceCount = renderResources.count;
  renderResources.count = 4;
  renderResources.primitiveType = PrimitiveType.TRIANGLE_STRIP;

  shaderBuilder.addVertexLines(GaussianSplatVS);
  shaderBuilder.addFragmentLines(GaussianSplatFS);
};

export default GaussianSplatTexturePipelineStage;
