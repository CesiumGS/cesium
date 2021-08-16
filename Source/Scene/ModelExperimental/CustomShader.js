import defaultValue from "../../Core/defaultValue.js";
import CustomShaderMode from "./CustomShaderMode.js";

export default function CustomShader(options) {
  this.mode = defaultValue(options.model, CustomShaderMode.MODIFY_MATERIAL);
  this.lightingModel = options.lightingModel;
  this.uniforms = options.uniforms;
  this.varyings = options.varyings;
  this.vertexShaderText = options.vertexShaderText;
  this.fragmentShaderText = options.fragmentShaderText;
  this.uniformMap = buildUniformMap(this);
}

function buildUniformMap(customShader) {
  var uniformMap = {};
  for (var uniformName in customShader.uniforms) {
    if (customShader.uniforms.hasOwnProperty(uniformName)) {
      uniformMap[uniformName] = createUniformFunction(
        customShader,
        uniformName
      );
    }
  }
  return uniformMap;
}

function createUniformFunction(customShader, uniformName) {
  return function () {
    return customShader.uniforms[uniformName].value;
  };
}

CustomShader.prototype.setUniform = function (uniformName, value) {
  this.uniforms[uniformName].value = value;
};
