import defined from "../../Core/defined.js";
import Cartesian4 from "../../Core/Cartesian4.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";
import ModelExperimentalUtility from "./ModelExperimentalUtility.js";

/**
 * The dequantization stage generates shader code to dequantize attributes
 * in the vertex shader
 *
 * @namespace DequantizationPipelineStage
 *
 * @private
 */
const DequantizationPipelineStage = {};
DequantizationPipelineStage.name = "DequantizationPipelineStage"; // Helps with debugging

DequantizationPipelineStage.FUNCTION_ID_DEQUANTIZATION_STAGE_VS =
  "dequantizationStage";
DequantizationPipelineStage.FUNCTION_SIGNATURE_DEQUANTIZATION_STAGE_VS =
  "void dequantizationStage(inout ProcessedAttributes attributes)";

/**
 * Process a primitive with quantized attributes. This stage modifies the
 * following parts of the render resources:
 * <ul>
 *  <li>generates dequantization function and adds it to the shader</li>
 *  <li>adds any uniforms needed for dequantization to the shader and uniform map</li>
 * </ul>
 *
 * @param {PrimitiveRenderResources} renderResources The render resources for this primitive.
 * @param {ModelComponents.Primitive} primitive The primitive
 * @param {FrameState} frameState The frame state.
 *
 * @private
 */
DequantizationPipelineStage.process = function (
  renderResources,
  primitive,
  frameState
) {
  const shaderBuilder = renderResources.shaderBuilder;
  const model = renderResources.model;
  const useClassification = defined(model.classificationType);

  shaderBuilder.addDefine(
    "USE_DEQUANTIZATION",
    undefined,
    ShaderDestination.VERTEX
  );

  shaderBuilder.addFunction(
    DequantizationPipelineStage.FUNCTION_ID_DEQUANTIZATION_STAGE_VS,
    DequantizationPipelineStage.FUNCTION_SIGNATURE_DEQUANTIZATION_STAGE_VS,
    ShaderDestination.VERTEX
  );

  const attributes = primitive.attributes;
  for (let i = 0; i < attributes.length; i++) {
    const attribute = attributes[i];
    const quantization = attribute.quantization;
    if (!defined(quantization)) {
      // Non-quantized attributes were already handled in GeometryPipelineStage
      continue;
    }

    // Only the position attribute should be handled for classification models.
    const isPositionAttribute =
      attribute.semantic === VertexAttributeSemantic.POSITION;
    if (useClassification && !isPositionAttribute) {
      continue;
    }

    const attributeInfo = ModelExperimentalUtility.getAttributeInfo(attribute);
    updateDequantizationFunction(shaderBuilder, attributeInfo);
    addDequantizationUniforms(renderResources, attributeInfo);
  }
};

function addDequantizationUniforms(renderResources, attributeInfo) {
  const shaderBuilder = renderResources.shaderBuilder;
  const uniformMap = renderResources.uniformMap;
  const variableName = attributeInfo.variableName;
  const quantization = attributeInfo.attribute.quantization;

  if (quantization.octEncoded) {
    const normalizationRange = `model_normalizationRange_${variableName}`;
    shaderBuilder.addUniform(
      "float",
      normalizationRange,
      ShaderDestination.VERTEX
    );
    uniformMap[normalizationRange] = function () {
      return quantization.normalizationRange;
    };
  } else {
    const offset = `model_quantizedVolumeOffset_${variableName}`;
    const stepSize = `model_quantizedVolumeStepSize_${variableName}`;
    const glslType = attributeInfo.glslType;
    shaderBuilder.addUniform(glslType, offset, ShaderDestination.VERTEX);
    shaderBuilder.addUniform(glslType, stepSize, ShaderDestination.VERTEX);

    let quantizedVolumeOffset = quantization.quantizedVolumeOffset;
    let quantizedVolumeStepSize = quantization.quantizedVolumeStepSize;

    // COLOR_n is promoted to a vec4 in the shader, so the alpha value
    // defaults to 1. For correctness, the quantization uniforms must be
    // promoted to vec4s. The alpha values are chosen so the alpha
    // dequantization is the identity, i.e. 0.0 + 1.0 * color.a
    if (/^color_\d+$/.test(variableName)) {
      quantizedVolumeOffset = promoteToVec4(quantizedVolumeOffset, 0);
      quantizedVolumeStepSize = promoteToVec4(quantizedVolumeStepSize, 1);
    }

    uniformMap[offset] = function () {
      return quantizedVolumeOffset;
    };

    uniformMap[stepSize] = function () {
      return quantizedVolumeStepSize;
    };
  }
}

function promoteToVec4(value, defaultAlpha) {
  if (value instanceof Cartesian4) {
    return value;
  }

  return new Cartesian4(value.x, value.y, value.z, defaultAlpha);
}

function updateDequantizationFunction(shaderBuilder, attributeInfo) {
  const variableName = attributeInfo.variableName;
  const quantization = attributeInfo.attribute.quantization;

  let line;
  if (quantization.octEncoded) {
    line = generateOctDecodeLine(variableName, quantization);
  } else {
    line = generateDequantizeLine(variableName);
  }

  shaderBuilder.addFunctionLines(
    DequantizationPipelineStage.FUNCTION_ID_DEQUANTIZATION_STAGE_VS,
    [line]
  );
}

function generateOctDecodeLine(variableName, quantization) {
  const structField = `attributes.${variableName}`;

  const quantizedAttribute = `a_quantized_${variableName}`;
  const normalizationRange = `model_normalizationRange_${variableName}`;

  // Draco stores things as .zxy instead of xyz, so be explicit about the
  // swizzle to avoid confusion
  const swizzle = quantization.octEncodedZXY ? ".zxy" : ".xyz";

  // This generates lines such as:
  // attributes.normal = czm_octDecode(a_quantized_normal, model_normalizationRange_normal).zxy;
  return `${structField} = czm_octDecode(${quantizedAttribute}, ${normalizationRange})${swizzle};`;
}

function generateDequantizeLine(variableName) {
  const structField = `attributes.${variableName}`;
  const quantizedAttribute = `a_quantized_${variableName}`;
  const offset = `model_quantizedVolumeOffset_${variableName}`;
  const stepSize = `model_quantizedVolumeStepSize_${variableName}`;

  // This generates lines such as:
  // attributes.texCoord_0 = model_quantizedVolumeOffset_texCoord_0 + a_quantized_texCoord_0 * model_quantizedVolumeStepSize;
  return `${structField} = ${offset} + ${quantizedAttribute} * ${stepSize};`;
}

export default DequantizationPipelineStage;
