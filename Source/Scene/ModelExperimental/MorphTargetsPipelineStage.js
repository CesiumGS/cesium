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

  const numWeights = primitive.morphWeights.length;
  shaderBuilder.addUniform(
    "float",
    `u_morphWeights[${numWeights}]`,
    ShaderDestination.VERTEX
  );

  shaderBuilder.addVertexLines([MorphTargetsStageVS]);

  const uniformMap = {
    u_morphWeights: function () {
      return primitive.morphWeights;
    },
  };

  renderResources.uniformMap = combine(uniformMap, renderResources.uniformMap);
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

  addMorphTargetAttributeDeclaration(
    shaderBuilder,
    attribute,
    morphTargetIndex
  );

  updateGetMorphedAttributeFunction(shaderBuilder, attribute, morphTargetIndex);
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

function addMorphTargetAttributeDeclaration(
  shaderBuilder,
  attribute,
  morphTargetIndex
) {
  const semantic = attribute.semantic;
  let attributeName;
  switch (semantic) {
    case VertexAttributeSemantic.POSITION:
      attributeName = `a_targetPosition_${morphTargetIndex}`;
      break;
    case VertexAttributeSemantic.NORMAL:
      attributeName = `a_targetNormal_${morphTargetIndex}`;
      break;
    case VertexAttributeSemantic.TANGENT:
      attributeName = `a_targetTangent_${morphTargetIndex}`;
      break;
    default:
      return;
  }

  shaderBuilder.addAttribute("vec3", attributeName);
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

function updateGetMorphedAttributeFunction(
  shaderBuilder,
  attribute,
  morphTargetIndex
) {
  let functionId;
  let line;
  const semantic = attribute.semantic;
  switch (semantic) {
    case VertexAttributeSemantic.POSITION:
      functionId = MorphTargetsPipelineStage.FUNCTION_ID_GET_MORPHED_POSITION;
      line = `morphedPosition += u_morphWeights[${morphTargetIndex}] * a_targetPosition_${morphTargetIndex};`;
      break;
    case VertexAttributeSemantic.NORMAL:
      functionId = MorphTargetsPipelineStage.FUNCTION_ID_GET_MORPHED_NORMAL;
      line = `morphedNormal += u_morphWeights[${morphTargetIndex}] * a_targetNormal_${morphTargetIndex};`;
      break;
    case VertexAttributeSemantic.TANGENT:
      functionId = MorphTargetsPipelineStage.FUNCTION_ID_GET_MORPHED_TANGENT;
      line = `morphedTangent += u_morphWeights[${morphTargetIndex}] * a_targetTangent_${morphTargetIndex};`;
      break;
    default:
      return;
  }

  shaderBuilder.addFunctionLines(functionId, [line]);
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
