import ShaderDestination from "../../Renderer/ShaderDestination.js";

export default function PBRPipelineStage() {}
PBRPipelineStage.process = function (primitive, renderResources, frameState) {
  var metallicRoughness = primitive.material.metallicRoughness;
  var baseColorTextureReader = metallicRoughness.baseColorTexture;

  var shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addDefine("USE_PBR_MATERIALS");
  shaderBuilder.addUniform(
    "sampler2D",
    "u_baseColorTexture",
    ShaderDestination.FRAGMENT
  );

  shaderBuilder.addVarying("vec2", "v_texCoord0");
  shaderBuilder.addVertexLines([
    "void pbrStage() {",
    "    v_texCoord0 = a_texCoord0;",
    "}",
  ]);

  shaderBuilder.addFragmentLines([
    "vec4 pbrStage() {",
    "    return texture2D(u_baseColorTexture, v_texCoord0);",
    "}",
  ]);

  renderResources.uniformMap.u_baseColorTexture = function () {
    return baseColorTextureReader.texture;
  };
};
