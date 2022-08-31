import Cartesian2 from "../../Core/Cartesian2.js";
import ClippingPlaneCollection from "../ClippingPlaneCollection.js";
import combine from "../../Core/combine.js";
import Color from "../../Core/Color.js";
import ModelClippingPlanesStageFS from "../../Shaders/Model/ModelClippingPlanesStageFS.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";

/**
 * The model clipping planes stage is responsible for applying clipping planes to the model.
 *
 * @namespace ModelClippingPlanesPipelineStage
 *
 * @private
 */
const ModelClippingPlanesPipelineStage = {};
ModelClippingPlanesPipelineStage.name = "ModelClippingPlanesPipelineStage"; // Helps with debugging

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
ModelClippingPlanesPipelineStage.process = function (
  renderResources,
  model,
  frameState
) {
  const clippingPlanes = model.clippingPlanes;
  const context = frameState.context;
  const shaderBuilder = renderResources.shaderBuilder;

  shaderBuilder.addDefine(
    "HAS_CLIPPING_PLANES",
    undefined,
    ShaderDestination.FRAGMENT
  );

  shaderBuilder.addDefine(
    "CLIPPING_PLANES_LENGTH",
    clippingPlanes.length,
    ShaderDestination.FRAGMENT
  );

  if (clippingPlanes.unionClippingRegions) {
    shaderBuilder.addDefine(
      "UNION_CLIPPING_REGIONS",
      undefined,
      ShaderDestination.FRAGMENT
    );
  }

  if (ClippingPlaneCollection.useFloatTexture(context)) {
    shaderBuilder.addDefine(
      "USE_CLIPPING_PLANES_FLOAT_TEXTURE",
      undefined,
      ShaderDestination.FRAGMENT
    );
  }

  const textureResolution = ClippingPlaneCollection.getTextureResolution(
    clippingPlanes,
    context,
    textureResolutionScratch
  );

  shaderBuilder.addDefine(
    "CLIPPING_PLANES_TEXTURE_WIDTH",
    textureResolution.x,
    ShaderDestination.FRAGMENT
  );

  shaderBuilder.addDefine(
    "CLIPPING_PLANES_TEXTURE_HEIGHT",
    textureResolution.y,
    ShaderDestination.FRAGMENT
  );

  shaderBuilder.addUniform(
    "sampler2D",
    "model_clippingPlanes",
    ShaderDestination.FRAGMENT
  );
  shaderBuilder.addUniform(
    "vec4",
    "model_clippingPlanesEdgeStyle",
    ShaderDestination.FRAGMENT
  );
  shaderBuilder.addUniform(
    "mat4",
    "model_clippingPlanesMatrix",
    ShaderDestination.FRAGMENT
  );

  shaderBuilder.addFragmentLines(ModelClippingPlanesStageFS);

  const uniformMap = {
    model_clippingPlanes: function () {
      return clippingPlanes.texture;
    },
    model_clippingPlanesEdgeStyle: function () {
      const style = Color.clone(clippingPlanes.edgeColor);
      style.alpha = clippingPlanes.edgeWidth;
      return style;
    },
    model_clippingPlanesMatrix: function () {
      return model._clippingPlanesMatrix;
    },
  };

  renderResources.uniformMap = combine(uniformMap, renderResources.uniformMap);
};

export default ModelClippingPlanesPipelineStage;
