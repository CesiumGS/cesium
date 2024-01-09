import Cartesian2 from "../../Core/Cartesian2.js";
import ClippingPolygonCollection from "../ClippingPolygonCollection.js";
import combine from "../../Core/combine.js";
import ModelClippingPolygonsStageFS from "../../Shaders/Model/ModelClippingPolygonsStageFS.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";

/**
 * The model clipping planes stage is responsible for applying clipping planes to the model.
 *
 * @namespace ModelClippingPolygonsPipelineStage
 *
 * @private
 */
const ModelClippingPolygonsPipelineStage = {
  name: "ModelClippingPolygonsPipelineStage", // Helps with debugging
};

const textureResolutionScratch = new Cartesian2();
/**
 * Process a model. This modifies the following parts of the render resources:
 *
 * <ul>
 *  <li>adds a define to the fragment shader to indicate that the model has clipping planes</li>
 *  <li>adds the defines to the fragment shader for parameters related to clipping planes, such as the number of planes</li>
 *  <li>adds a function to the fragment shader to apply the clipping planes to the model's base color</li>
 *  <li>adds the uniforms for the fragment shader for the clipping plane texture and matrix</li>
 *</ul>
 *
 * @param {ModelRenderResources} renderResources The render resources for this model.
 * @param {Model} model The model.
 * @param {FrameState} frameState The frameState.
 *
 * @private
 */
ModelClippingPolygonsPipelineStage.process = function (
  renderResources,
  model,
  frameState
) {
  const clippingPolygons = model.clippingPolygons;
  const context = frameState.context;
  const shaderBuilder = renderResources.shaderBuilder;

  shaderBuilder.addDefine(
    "HAS_CLIPPING_POLYGONS",
    undefined,
    ShaderDestination.FRAGMENT
  );

  if (clippingPolygons.inverse) {
    shaderBuilder.addDefine(
      "CLIPPING_INVERSE",
      undefined,
      ShaderDestination.FRAGMENT
    );
  }

  shaderBuilder.addDefine(
    "CLIPPING_POLYGONS_LENGTH",
    clippingPolygons.length,
    ShaderDestination.FRAGMENT
  );

  const textureResolution = ClippingPolygonCollection.getTextureResolution(
    clippingPolygons,
    context,
    textureResolutionScratch
  );

  shaderBuilder.addDefine(
    "CLIPPING_POLYGONS_TEXTURE_WIDTH",
    textureResolution.x,
    ShaderDestination.FRAGMENT
  );

  shaderBuilder.addDefine(
    "CLIPPING_POLYGONS_TEXTURE_HEIGHT",
    textureResolution.y,
    ShaderDestination.FRAGMENT
  );

  shaderBuilder.addUniform(
    "sampler2D",
    "model_clippingPolygons",
    ShaderDestination.FRAGMENT
  );

  shaderBuilder.addFragmentLines(ModelClippingPolygonsStageFS);

  const uniformMap = {
    model_clippingPolygons: function () {
      return clippingPolygons.texture;
    },
  };

  renderResources.uniformMap = combine(uniformMap, renderResources.uniformMap);
};

export default ModelClippingPolygonsPipelineStage;
