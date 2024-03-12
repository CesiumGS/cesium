import Cartesian2 from "../../Core/Cartesian2.js";
import ClippingPolygonCollection from "../ClippingPolygonCollection.js";
import combine from "../../Core/combine.js";
import Rectangle from "../../Core/Rectangle.js";
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
 * <ul> TODO
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
    ShaderDestination.BOTH
  );

  if (clippingPolygons.inverse) {
    shaderBuilder.addDefine(
      "CLIPPING_INVERSE",
      undefined,
      ShaderDestination.BOTH
    );
  }

  shaderBuilder.addDefine(
    "CLIPPING_POLYGONS_LENGTH",
    clippingPolygons.length,
    ShaderDestination.BOTH
  );

  const textureResolution = ClippingPolygonCollection.getClipTextureResolution(
    clippingPolygons,
    context,
    textureResolutionScratch
  );

  shaderBuilder.addDefine(
    "CLIPPING_POLYGONS_TEXTURE_WIDTH",
    textureResolution.x,
    ShaderDestination.BOTH
  );

  shaderBuilder.addDefine(
    "CLIPPING_POLYGONS_TEXTURE_HEIGHT",
    textureResolution.y,
    ShaderDestination.FRAGMENT
  );

  shaderBuilder.addUniform(
    "sampler2D",
    "model_clipAmount",
    ShaderDestination.FRAGMENT
  );

  shaderBuilder.addUniform(
    "vec4",
    "model_clipRectangle",
    ShaderDestination.FRAGMENT
  );

  shaderBuilder.addFragmentLines(ModelClippingPolygonsStageFS);

  const packedRectangle = Rectangle.pack(clippingPolygons.rectangle, []);

  const uniformMap = {
    model_clippingPolygons: function () {
      return clippingPolygons.clipTexture;
    },
    model_clipRectangle: function () {
      return packedRectangle;
    },
  };

  renderResources.uniformMap = combine(uniformMap, renderResources.uniformMap);
};

export default ModelClippingPolygonsPipelineStage;
