import combine from "../../Core/combine.js";
import ModelClippingPolygonsStageVS from "../../Shaders/Model/ModelClippingPolygonsStageVS.js";
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

/**
 * Process a model for polygon clipping. This modifies the following parts of the render resources:
 *
 * <ul>
 *  <li>adds a define to both the vertex and fragment shaders to indicate that the model has clipping polygons</li>
 *  <li>adds the defines to both the vertex and fragment shaders for parameters related to clipping polygons, such as the number of polygons</li>
 *  <li>adds a function to the vertex shader to determine lookup uvs</li>
 *  <li>adds a function to the fragment shader to discard clipped regions</li>
 *  <li>adds the uniforms to the vertex and fragment shaders for the clipping extents texture and clipping distance respectively</li>
 *  <li>adds a varying for lookup uvs in the clipping texture</li>
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
  const shaderBuilder = renderResources.shaderBuilder;

  shaderBuilder.addDefine(
    "ENABLE_CLIPPING_POLYGONS",
    undefined,
    ShaderDestination.BOTH
  );

  if (clippingPolygons.inverse) {
    shaderBuilder.addDefine(
      "CLIPPING_INVERSE",
      undefined,
      ShaderDestination.FRAGMENT
    );
  }

  shaderBuilder.addDefine(
    "CLIPPING_POLYGON_REGIONS_LENGTH",
    clippingPolygons.extentsCount,
    ShaderDestination.BOTH
  );

  shaderBuilder.addUniform(
    "sampler2D",
    "model_clippingDistance",
    ShaderDestination.FRAGMENT
  );

  shaderBuilder.addUniform(
    "sampler2D",
    "model_clippingExtents",
    ShaderDestination.VERTEX
  );

  shaderBuilder.addVarying("vec2", "v_clippingPosition");
  shaderBuilder.addVarying("int", "v_regionIndex", "flat");
  shaderBuilder.addVertexLines(ModelClippingPolygonsStageVS);
  shaderBuilder.addFragmentLines(ModelClippingPolygonsStageFS);

  const uniformMap = {
    model_clippingDistance: function () {
      return clippingPolygons.clippingTexture;
    },
    model_clippingExtents: function () {
      return clippingPolygons.extentsTexture;
    },
  };

  renderResources.uniformMap = combine(uniformMap, renderResources.uniformMap);
};

export default ModelClippingPolygonsPipelineStage;
