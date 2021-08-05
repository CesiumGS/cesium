var CustomShaderMode = {
  REPLACE_MATERIAL: "REPLACE_MATERIAL",
  BEFORE_MATERIAL: "BEFORE_MATERIAL",
  MODIFY_MATERIAL: "MODIFY_MATERIAL",
  AFTER_LIGHTING: "AFTER_LIGHTING",
};

CustomShaderMode.getDefineName = function (customShaderMode) {
  return "CUSTOM_SHADER_" + customShaderMode;
};

export default Object.freeze(CustomShaderMode);
