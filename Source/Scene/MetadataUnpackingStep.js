const MetadataUnpackingStep = {};

MetadataUnpackingStep.unsignedToSigned = function (expression) {
  return "2.0 * (" + expression + ") - 1.0";
};

export default MetadataUnpackingStep;
