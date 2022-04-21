import AttributeType from "../AttributeType.js";
import combine from "../../Core/combine.js";
import defined from "../../Core/defined.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import MorphTargetsStageVS from "../../Shaders/ModelExperimental/MorphTargetsStageVS.js";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";

/**
 * The morph targets pipeline stage processes the morph targets and weights of a primitive.
 *
 * @namespace MorphTargetsPipelineStage
 *
 * @private
 */

const MorphTargetsPipelineStage = {};
MorphTargetsPipelineStage.name = "MorphTargetsPipelineStage"; // Helps with debugging
MorphTargetsPipelineStage.FUNCTION_ID_GET_MORPHED_POSITION =
  "getMorphedPosition";
MorphTargetsPipelineStage.FUNCTION_SIGNATURE_GET_MORPHED_POSITION =
  "vec3 getMorphedPosition(in vec3 position)";
MorphTargetsPipelineStage.FUNCTION_ID_GET_MORPHED_NORMAL = "getMorphedNormal";
MorphTargetsPipelineStage.FUNCTION_SIGNATURE_GET_MORPHED_NORMAL =
  "vec3 getMorphedNormal(in vec3 normal)";
MorphTargetsPipelineStage.FUNCTION_ID_GET_MORPHED_TANGENT = "getMorphedTangent";
MorphTargetsPipelineStage.FUNCTION_SIGNATURE_GET_MORPHED_TANGENT =
  "vec3 getMorphedTangent(in vec3 tangent)";

/**
 * This pipeline stage processes the morph targets and weights of a primitive,
 * adding the relevant attribute declarations and functions to the shaders.
 *
 * Processes a primitive. This stage modifies the following parts of the render resources:
 * <ul>
 *  <li> adds attribute declarations for the morph targets in the vertex shader
 *  <li> adds the uniform declaration for the morph weights in the vertex shader
 *  <li> adds functions to apply the morphs in the vertex shader
 * </ul>
 *
 * @param {PrimitiveRenderResources} renderResources The render resources for this primitive.
 * @param {ModelComponents.Primitive} primitive The primitive.
 *
 * @private
 */
MorphTargetsPipelineStage.process = function (renderResources, primitive) {
  const shaderBuilder = renderResources.shaderBuilder;

  shaderBuilder.addDefine(
    "HAS_MORPH_TARGETS",
    undefined,
    ShaderDestination.VERTEX
  );

  addGetMorphedAttributeFunctionDeclarations(shaderBuilder);

  for (let i = 0; i < primitive.morphTargets.length; i++) {
    const morphTarget = primitive.morphTargets[i];
    const attributes = morphTarget.attributes;

    for (let j = 0; j < attributes.length; j++) {
      const attribute = attributes[j];
      const semantic = attribute.semantic;

      // Cesium only supports morph targets for positions, normals, and tangents
      if (
        semantic !== VertexAttributeSemantic.POSITION &&
        semantic !== VertexAttributeSemantic.NORMAL &&
        semantic !== VertexAttributeSemantic.TANGENT
      ) {
        continue;
      }

      processMorphTargetAttribute(
        renderResources,
        attribute,
        renderResources.attributeIndex,
        i
      );
      renderResources.attributeIndex++;
    }
  }

  addGetMorphedAttributeFunctionReturns(shaderBuilder);

  const weights = renderResources.runtimeNode.morphWeights;
  const numWeights = weights.length;
  shaderBuilder.addUniform(
    "float",
    `u_morphWeights[${numWeights}]`,
    ShaderDestination.VERTEX
  );

  shaderBuilder.addVertexLines([MorphTargetsStageVS]);

  const uniformMap = {
    u_morphWeights: function () {
      return renderResources.runtimeNode.morphWeights;
    },
  };

  renderResources.uniformMap = combine(uniformMap, renderResources.uniformMap);
};

const scratchAttributeInfo = {
  attributeString: undefined,
  functionId: undefined,
};

function processMorphTargetAttribute(
  renderResources,
  attribute,
  attributeIndex,
  morphTargetIndex
) {
  const shaderBuilder = renderResources.shaderBuilder;

  addMorphTargetAttributeToRenderResources(
    renderResources,
    attribute,
    attributeIndex
  );

  const attributeInfo = getMorphTargetAttributeInfo(
    attribute,
    scratchAttributeInfo
  );

  addMorphTargetAttributeDeclarationAndFunctionLine(
    shaderBuilder,
    attributeInfo,
    morphTargetIndex
  );
}

function addMorphTargetAttributeToRenderResources(
  renderResources,
  attribute,
  attributeIndex
) {
  const vertexAttribute = {
    index: attributeIndex,
    value: defined(attribute.buffer) ? undefined : attribute.constant,
    vertexBuffer: attribute.buffer,
    componentsPerAttribute: AttributeType.getNumberOfComponents(attribute.type),
    componentDatatype: attribute.componentDatatype,
    offsetInBytes: attribute.byteOffset,
    strideInBytes: attribute.byteStride,
    normalize: attribute.normalized,
  };

  renderResources.attributes.push(vertexAttribute);
}

function getMorphTargetAttributeInfo(attribute, result) {
  const semantic = attribute.semantic;
  switch (semantic) {
    case VertexAttributeSemantic.POSITION:
      result.attributeString = "Position";
      result.functionId =
        MorphTargetsPipelineStage.FUNCTION_ID_GET_MORPHED_POSITION;
      break;
    case VertexAttributeSemantic.NORMAL:
      result.attributeString = "Normal";
      result.functionId =
        MorphTargetsPipelineStage.FUNCTION_ID_GET_MORPHED_NORMAL;
      break;
    case VertexAttributeSemantic.TANGENT:
      result.attributeString = "Tangent";
      result.functionId =
        MorphTargetsPipelineStage.FUNCTION_ID_GET_MORPHED_TANGENT;
      break;
    default:
      break;
  }
  return result;
}

function addMorphTargetAttributeDeclarationAndFunctionLine(
  shaderBuilder,
  attributeInfo,
  morphTargetIndex
) {
  const attributeString = attributeInfo.attributeString;
  const attributeName = `a_target${attributeString}_${morphTargetIndex}`;
  const line = `morphed${attributeString} += u_morphWeights[${morphTargetIndex}] * a_target${attributeString}_${morphTargetIndex};`;
  shaderBuilder.addAttribute("vec3", attributeName);
  shaderBuilder.addFunctionLines(attributeInfo.functionId, [line]);
}

function addGetMorphedAttributeFunctionDeclarations(shaderBuilder) {
  shaderBuilder.addFunction(
    MorphTargetsPipelineStage.FUNCTION_ID_GET_MORPHED_POSITION,
    MorphTargetsPipelineStage.FUNCTION_SIGNATURE_GET_MORPHED_POSITION,
    ShaderDestination.VERTEX
  );

  const positionLine = "vec3 morphedPosition = position;";
  shaderBuilder.addFunctionLines(
    MorphTargetsPipelineStage.FUNCTION_ID_GET_MORPHED_POSITION,
    [positionLine]
  );

  shaderBuilder.addFunction(
    MorphTargetsPipelineStage.FUNCTION_ID_GET_MORPHED_NORMAL,
    MorphTargetsPipelineStage.FUNCTION_SIGNATURE_GET_MORPHED_NORMAL,
    ShaderDestination.VERTEX
  );

  const normalLine = "vec3 morphedNormal = normal;";
  shaderBuilder.addFunctionLines(
    MorphTargetsPipelineStage.FUNCTION_ID_GET_MORPHED_NORMAL,
    [normalLine]
  );

  shaderBuilder.addFunction(
    MorphTargetsPipelineStage.FUNCTION_ID_GET_MORPHED_TANGENT,
    MorphTargetsPipelineStage.FUNCTION_SIGNATURE_GET_MORPHED_TANGENT,
    ShaderDestination.VERTEX
  );

  const tangentLine = "vec3 morphedTangent = tangent;";
  shaderBuilder.addFunctionLines(
    MorphTargetsPipelineStage.FUNCTION_ID_GET_MORPHED_TANGENT,
    [tangentLine]
  );
}

function addGetMorphedAttributeFunctionReturns(shaderBuilder) {
  const positionLine = "return morphedPosition;";
  shaderBuilder.addFunctionLines(
    MorphTargetsPipelineStage.FUNCTION_ID_GET_MORPHED_POSITION,
    [positionLine]
  );

  const normalLine = "return morphedNormal;";
  shaderBuilder.addFunctionLines(
    MorphTargetsPipelineStage.FUNCTION_ID_GET_MORPHED_NORMAL,
    [normalLine]
  );

  const tangentLine = "return morphedTangent;";
  shaderBuilder.addFunctionLines(
    MorphTargetsPipelineStage.FUNCTION_ID_GET_MORPHED_TANGENT,
    [tangentLine]
  );
}

export default MorphTargetsPipelineStage;
