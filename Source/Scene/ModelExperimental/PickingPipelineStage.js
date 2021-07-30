import BatchTextureCommon from "../../Shaders/ModelExperimental/BatchTextureCommon.js";
import combine from "../../Core/combine.js";
import defined from "../../Core/defined.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";

export default function PickingPipelineStage() {}

PickingPipelineStage.process = function (
  renderResources,
  primitive,
  frameState
) {
  var model = renderResources.model;
  var owner = model._pickObject;
  var pickId = frameState.context.createPickId(owner);

  if (defined(model._featureTable)) {
    processPickTexture(renderResources, model._featureTable);
  } else {
    processPickColor(renderResources, pickId);
  }
};

function processPickColor(renderResources, pickId) {
  var shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addUniform("vec4", "czm_pickColor");

  var pickingUniforms = {
    czm_pickColor: function () {
      return pickId.color;
    },
  };

  renderResources.uniformMap = combine(
    pickingUniforms,
    renderResources.uniformMap
  );
  renderResources.pickId = "czm_pickColor";
}

function processPickTexture(renderResources, featureTable) {
  var shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addDefine("FEATURE_PICKING");
  shaderBuilder.addUniform(
    "sampler2D",
    "u_pickTexture",
    ShaderDestination.FRAGMENT
  );
  shaderBuilder.addVertexLines([BatchTextureCommon]);
  shaderBuilder.addFragmentLines([BatchTextureCommon]);

  var batchTexture = featureTable._batchTexture;
  var pickingUniforms = {
    u_pickTexture: function () {
      return batchTexture.pickTexture;
    },
    u_textureStep: function () {
      return batchTexture.textureStep;
    },
    u_textureDimensions: function () {
      return batchTexture.textureDimensions;
    },
  };

  renderResources.uniformMap = combine(
    pickingUniforms,
    renderResources.uniformMap
  );
  renderResources.pickId = "texture2D(model_pickTexture, model_featureSt);";
}
