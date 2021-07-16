import combine from "../../Core/combine.js";

export default function CustomShaderStage() {}

CustomShaderStage.process = function (
  primitive,
  primitiveResources,
  frameState
) {
  var shaderBuilder = primitiveResources.shaderBuilder;
  var customShader = primitiveResources.model.customShader;

  shaderBuilder.addDefine("USE_CUSTOM_SHADER_BEFORE");

  shaderBuilder.addVertexLines([
    customShader.vertexShaderText,
    "void customShaderStage() {",
    "    vertexMain();",
    "}",
  ]);

  shaderBuilder.addFragmentLines([
    customShader.fragmentShaderText,
    "Material customShaderStage() {",
    "    FragmentOutput fragmentOutput;",
    "    fragmentMain(/*input,*/ fragmentOutput);",
    "    return fragmentOutput.material;",
    "}",
  ]);

  var uniforms = customShader.uniforms;
  for (var uniformName in uniforms) {
    if (uniforms.hasOwnProperty(uniformName)) {
      var uniform = uniforms[uniformName];
      shaderBuilder.addUniform(uniform.type, uniformName);
    }
  }

  // TODO: Set the lighting settings to use UNLIT lighting

  primitiveResources.uniformMap = combine(
    primitiveResources.uniformMap,
    customShader.uniformMap
  );
};
