import defined from "../../Core/defined.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import LightingStageFS from "../../Shaders/Model/LightingStageFS.js";
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
const LightingPipelineStage = {
  name: "LightingPipelineStage", // Helps with debugging
};

/**
 * Process a primitive. This modifies the following parts of the render
 * resources:
 * <ul>
 *   <li>modifies the shader to include the lighting stage</li>
 * </ul>
 * @param {PrimitiveRenderResources} renderResources The render resources for the primitive
 * @param {ModelComponents.Primitive} primitive The primitive to be rendered
 *
 * @private
 */
LightingPipelineStage.process = function (renderResources, primitive) {
  const model = renderResources.model;
  const lightingOptions = renderResources.lightingOptions;
  const shaderBuilder = renderResources.shaderBuilder;

  if (defined(model.lightColor)) {
    shaderBuilder.addDefine(
      "USE_CUSTOM_LIGHT_COLOR",
      undefined,
      ShaderDestination.FRAGMENT
    );

    shaderBuilder.addUniform(
      "vec3",
      "model_lightColorHdr",
      ShaderDestination.FRAGMENT
    );

    const uniformMap = renderResources.uniformMap;
    uniformMap.model_lightColorHdr = function () {
      return model.lightColor;
    };
  }

  // The lighting model is always set by the material. However, custom shaders
  // can override this.
  const lightingModel = lightingOptions.lightingModel;

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

  shaderBuilder.addFragmentLines(LightingStageFS);
};

export default LightingPipelineStage;
