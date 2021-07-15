import combine from "../../Core/combine.js";
import defaultValue from "../../Core/defaultValue.js";
import ContextLimits from "../../Renderer/ContextLimits.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import BatchTextureCommon from "../../Shaders/Model/BatchTextureCommon.js";

export default function BatchTextureStage() {}

BatchTextureStage.process = function (primitive, renderResources, frameState) {
  var shaderBuilder = renderResources.shaderBuilder;
  var batchTable = renderResources.model.batchTable;

  var vertexTextureFetch = false;
  if (ContextLimits.maximumVertexTextureImageUnits > 0) {
    vertexTextureFetch = true;
    shaderBuilder.addDefine("VTF_SUPPORTED");
  }

  // TODO: don't hard-code the feature ID
  shaderBuilder.addDefine(
    "BATCH_ID_ATTRIBUTE",
    "a_featureId",
    ShaderDestination.VERTEX
  );

  // TODO: Is this picking or styling or both?
  // TODO: HANDLE_TRANSLUCENT is related to content's classification type
  /*
  if (handleTranslucent) {
    shaderBuilder.addDefine("HANDLE_TRANSLUCENT");
    var isTranslucentDestination = (vertexTextureFetch) ? ShaderDestination.VERTEX : ShaderDestination.FRAGMENT;
    shaderBuilder.addUniform("bool", "model_isTranslucent", isTranslucentDestination);
  }
  */

  // HAS_PREMULTIPLIED_ALPHA (frag only) is false so don't do anything.

  shaderBuilder.addUniform("vec4", "model_textureStep");

  // If there are many features, the batch texture wraps onto multiple
  // rows.
  if (batchTable._batchTexture.textureDimensions.y > 1) {
    shaderBuilder.addDefine("MULTILINE_BATCH_TEXTURE");
    shaderBuilder.addUniform("vec2", "model_textureDimensions");
  }

  // TODO: How to consolidate uniforms between stages? style needs it too
  var batchTextureDestination = vertexTextureFetch
    ? ShaderDestination.VERTEX
    : ShaderDestination.FRAGMENT;
  shaderBuilder.addUniform(
    "sampler2D",
    "model_batchTexture",
    batchTextureDestination
  );

  shaderBuilder.addVarying("vec2", "model_featureSt");
  if (vertexTextureFetch) {
    shaderBuilder.addVarying("vec4", "model_featureColor");
  }

  shaderBuilder.addVertexLines([BatchTextureCommon]);
  shaderBuilder.addFragmentLines([BatchTextureCommon]);

  var batchTextureUniforms = {
    model_batchTexture: function () {
      return defaultValue(
        // add the pick texture and batch texture
        batchTable._batchTexture.batchTexture,
        batchTable._batchTexture.defaultTexture
      );
    },
    model_textureDimensions: function () {
      return batchTable._batchTexture.textureDimensions;
    },
    model_textureStep: function () {
      return batchTable._batchTexture.textureStep;
    },
  };

  renderResources.uniformMap = combine(
    batchTextureUniforms,
    renderResources.uniformMap
  );
};
