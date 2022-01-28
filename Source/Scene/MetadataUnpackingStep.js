const MetadataUnpackingStep = {};

MetadataUnpackingStep.unsignedToSigned = function (expression) {
  return "2.0 * (" + expression + ") - 1.0";
};

MetadataUnpackingStep.unnormalizeU8 = function (expression) {
  return "255.0 * (" + expression + ");";
};

MetadataUnpackingStep.unnormalizeI8 = function (expression) {
  return "255.0 * (" + expression + ") - 128.0";
};

MetadataUnpackingStep.cast = function (castType) {
  return function (expression) {
    return castType + "(" + expression + ")";
  };
};

export default MetadataUnpackingStep;
