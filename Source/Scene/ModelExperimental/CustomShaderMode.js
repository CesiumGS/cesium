var CustomShaderMode = {
  BEFORE_MATERIAL: "BEFORE_MATERIAL",
  MODIFY_MATERIAL: "MODIFY_MATERIAL",
};

CustomShaderMode.getDefineName = function (customShaderMode) {
  return "CUSTOM_SHADER_" + customShaderMode;
};

export default Object.freeze(CustomShaderMode);
