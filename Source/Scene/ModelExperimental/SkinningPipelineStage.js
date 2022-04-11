import combine from "../../Core/combine.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import SkinningStageVS from "../../Shaders/ModelExperimental/SkinningStageVS.js";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";

/**
 * The skinning pipeline stage processes the joint matrices of a skinned primitive.
 *
 * @namespace SkinningPipelineStage
 *
 * @private
 */

const SkinningPipelineStage = {};
SkinningPipelineStage.name = "SkinningPipelineStage"; // Helps with debugging

SkinningPipelineStage.FUNCTION_ID_GET_SKINNING_MATRIX = "getSkinningMatrix";
SkinningPipelineStage.FUNCTION_SIGNATURE_GET_SKINNING_MATRIX =
  "mat4 getSkinningMatrix()";

/**
 * This pipeline stage processes the joint matrices of a skinned primitive, adding
 * the relevant functions and uniforms to the shaders. The joint and weight attributes
 * themselves are processed in the geometry pipeline stage.
 *
 * Processes a primitive. This stage modifies the following parts of the render resources:
 * <ul>
 *  <li> adds the uniform declaration for the joint matrices in the vertex shader</li>
 *  <li> adds the function to compute the skinning matrix in the vertex shader</li>
 * </ul>
 *
 * @param {PrimitiveRenderResources} renderResources The render resources for this primitive.
 * @param {ModelComponents.Primitive} primitive The primitive.
 * @private
 */
SkinningPipelineStage.process = function (renderResources, primitive) {
  const shaderBuilder = renderResources.shaderBuilder;

  shaderBuilder.addDefine("HAS_SKINNING", undefined, ShaderDestination.VERTEX);
  addGetSkinningMatrixFunction(shaderBuilder, primitive);

  const runtimeNode = renderResources.runtimeNode;
  const jointMatrices = runtimeNode.computedJointMatrices;

  shaderBuilder.addUniform(
    "mat4",
    `u_jointMatrices[${jointMatrices.length}]`,
    ShaderDestination.VERTEX
  );

  shaderBuilder.addVertexLines([SkinningStageVS]);

  const uniformMap = {
    u_jointMatrices: function () {
      return runtimeNode.computedJointMatrices;
    },
  };

  renderResources.uniformMap = combine(uniformMap, renderResources.uniformMap);
};

function getMaximumAttributeSetIndex(primitive) {
  let setIndex = -1;
  const attributes = primitive.attributes;
  const length = attributes.length;
  for (let i = 0; i < length; i++) {
    const attribute = attributes[i];
    const isJointsOrWeights =
      attribute.semantic === VertexAttributeSemantic.JOINTS ||
      attribute.semantic === VertexAttributeSemantic.WEIGHTS;

    if (!isJointsOrWeights) {
      continue;
    }

    setIndex = Math.max(setIndex, attribute.setIndex);
  }

  return setIndex;
}

function addGetSkinningMatrixFunction(shaderBuilder, primitive) {
  shaderBuilder.addFunction(
    SkinningPipelineStage.FUNCTION_ID_GET_SKINNING_MATRIX,
    SkinningPipelineStage.FUNCTION_SIGNATURE_GET_SKINNING_MATRIX,
    ShaderDestination.VERTEX
  );

  const initialLine = "mat4 skinnedMatrix = mat4(0);";
  shaderBuilder.addFunctionLines(
    SkinningPipelineStage.FUNCTION_ID_GET_SKINNING_MATRIX,
    [initialLine]
  );

  let setIndex;
  let componentIndex;
  const componentStrings = ["x", "y", "z", "w"];
  const maximumSetIndex = getMaximumAttributeSetIndex(primitive);
  for (setIndex = 0; setIndex <= maximumSetIndex; setIndex++) {
    for (componentIndex = 0; componentIndex <= 3; componentIndex++) {
      const component = componentStrings[componentIndex];
      // Example: skinnedMatrix += a_weights_0.x * u_jointMatrices[int(a_joints_0.x)];
      const line = `skinnedMatrix += a_weights_${setIndex}.${component} * u_jointMatrices[int(a_joints_${setIndex}.${component})];`;
      shaderBuilder.addFunctionLines(
        SkinningPipelineStage.FUNCTION_ID_GET_SKINNING_MATRIX,
        [line]
      );
    }
  }

  const returnLine = "return skinnedMatrix;";
  shaderBuilder.addFunctionLines(
    SkinningPipelineStage.FUNCTION_ID_GET_SKINNING_MATRIX,
    [returnLine]
  );
}

export default SkinningPipelineStage;
