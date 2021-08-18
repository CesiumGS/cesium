var CustomShaderMode = {
  MODIFY_MATERIAL: "MODIFY_MATERIAL",
  REPLACE_MATERIAL: "REPLACE_MATERIAL",
};

CustomShaderMode.getDefineName = function (customShaderMode) {
  return "CUSTOM_SHADER_" + customShaderMode;
};

export default Object.freeze(CustomShaderMode);
