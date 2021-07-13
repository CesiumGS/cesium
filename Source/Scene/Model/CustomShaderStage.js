import combine from "../../Core/combine.js";
import CustomShader from "./CustomShader.js";

var CustomShaderStage = {};

function After() {}
After.process = function (primitive, primitiveResources, frameState) {
  // TODO: this would be passed in via the primitive resources
  var customShader = new CustomShader({
    uniforms: {
      u_time: {
        value: 0.8,
        // TODO: Use enums
        type: "float",
        // TODO: Destination?
      },
    },
    vertexShaderText: [
      "void vertexMain(/*VertexInput input, out VertexOutput output*/) {",
      // TODO: this won't work... how to make this simple?
      "    //output = input;",
      "}",
    ].join("\n"),
    fragmentShaderText: [
      "struct Material {",
      "    vec3 baseColor;",
      "};",
      "struct FragmentOutput {",
      "    Material material;",
      "};",
      "void fragmentMain(/*FragmentInput input,*/ out FragmentOutput fragmentOutput) {",
      "    //var wave = 0.5 + 0.5 * sin(u_time);",
      "    fragmentOutput.material.baseColor = czm_pickColor.rgb; /*vec3(0.0, 0.5 * u_time, u_time);*/",
      "}",
    ].join("\n"),
  });

  var shaderBuilder = primitiveResources.shaderBuilder;

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

  shaderBuilder.addDefine("USE_CUSTOM_SHADER_AFTER");

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

CustomShaderStage.After = After;

export default CustomShaderStage;
