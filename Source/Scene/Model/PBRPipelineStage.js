import ShaderDestination from "../../Renderer/ShaderDestination.js";

function PBRPipelineStage() {}
PBRPipelineStage.process = function (primitive, renderResources, frameState) {

  var metallicRoughness = primitive.material.metallicRoughness;
  var baseColorTextureReader = metallicRoughness.baseColorTexture;

  var shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addUniform("sampler2D", "u_baseColorTexture", ShaderDestination.FRAGMENT);

  renderResources.uniformMap.u_baseColorTexture = function() {
    return baseColorTextureReader.texture;
  };
};