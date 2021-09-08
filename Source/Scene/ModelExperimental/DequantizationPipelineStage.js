import defined from "../../Core/defined.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import ModelExperimentalUtility from "./ModelExperimentalUtility.js";

/**
 * The dequantization stage generates shader code to dequantize properties
 * in the fragment shader
 *
 * @namespace DequantizationPipelineStage
 *
 * @private
 */
var DequantizationPipelineStage = {};
DequantizationPipelineStage.name = "DequantizationPipelineStage"; // Helps with debugging

DequantizationPipelineStage.process = function (
  renderResources,
  primitive,
  frameState
) {
  var attributes = primitive.attributes;
  var dequantizationLines = generateDequantizationLines(attributes);

  var shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addDefine(
    "USE_DEQUANTIZATION",
    undefined,
    ShaderDestination.VERTEX
  );

  shaderBuilder.addVertexLines(
    [].concat([
      "void dequantizationStage(inout Attributes attributes)",
      "{",
      dequantizationLines,
      "}",
    ])
  );
};

function generateDequantizationLines(attributes) {
  var dequantizationLines = [];
  for (var i = 0; i < attributes.length; i++) {
    var attribute = attributes[i];
    var quantization = attribute.quantization;
    if (!defined(quantization)) {
      // non-quantized attributes were already handled in GeometryPipelineStage
      continue;
    }

    var attributeInfo = ModelExperimentalUtility.getAttributeInfo(attribute);
    var variableName = attributeInfo.variableName;

    var line;
    if (quantization.octEncoded) {
      line = generateOctDecodeLine(variableName);
    } else {
      line = generateDequantizeLine(variableName);
    }

    dequantizationLines.push(line);
  }

  return dequantizationLines;
}

function generateOctDecodeLine(variableName) {
  var structField = "attributes." + variableName;
  var encodedAttribute = "a_encoded_" + variableName;
  var decodeRange = "model_decode_" + variableName;
  return (
    structField +
    " = czm_octDecode(" +
    encodedAttribute +
    ", " +
    decodeRange +
    ").zxy;"
  );
}

function generateDequantizeLine(variableName) {
  var structField = "attributes." + variableName;
  var encodedAttribute = "a_encoded_" + variableName;
  var minimumValue = "model_decode_" + variableName + "_min";
  var normConstant = "model_decode_" + variableName + "norm_constant";
  return (
    structField +
    " = " +
    minimumValue +
    " + " +
    encodedAttribute +
    " * " +
    normConstant +
    ";"
  );
}
