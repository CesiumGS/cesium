import defaultValue from "../../Core/defaultValue.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import LightingStageFS from "../../Shaders/ModelExperimental/LightingStageFS.js";
import LightingModel from "./LightingModel.js";

/**
 * The lighting pipeline stage is responsible for taking a material and rendering
 * it with a lighting model such as physically based rendering (PBR) or unlit
 * shading
 *
 * @namespace LightingPipelineStage
 *
 * @private
 */
var LightingPipelineStage = {};

/**
 * Process a primitive. This modifies the following parts of the render
 * resources:
 * <ul>
 *   <li>modifies the shader to include the lighting stage</li>
 * </ul>
 * @param {RenderResources.PrimitiveRenderResources} renderResources The render resources for the primitive
 * @param {ModelComponents.Primitive} primitive The primitive to be rendered
 *
 * @private
 */
LightingPipelineStage.process = function (renderResources, primitive) {
  var lightingOptions = renderResources.lightingOptions;
  var shaderBuilder = renderResources.shaderBuilder;

  // The lighting model is always set by the material. However, custom shaders
  // can override this.
  var lightingModel = defaultValue(
    lightingOptions.customShaderLightingModel,
    lightingOptions.lightingModel
  );

  if (lightingModel === LightingModel.PBR) {
    shaderBuilder.addDefine(
      "LIGHTING_PBR",
      undefined,
      ShaderDestination.FRAGMENT
    );
  } else {
    shaderBuilder.addDefine(
      "LIGHTING_UNLIT",
      undefined,
      ShaderDestination.FRAGMENT
    );
  }

  shaderBuilder.addFragmentLines([LightingStageFS]);
};

export default LightingPipelineStage;
