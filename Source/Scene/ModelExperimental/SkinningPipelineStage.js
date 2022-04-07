import combine from "../../Core/combine.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import SkinningStageVS from "../../Shaders/ModelExperimental/SkinningStageVS.js";

/**
 * The skinning pipeline stage processes the joint matrices of a skinned node.
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
 * This pipeline stage processes the joint matrices of a skinned node, adding the relevant functions
 * and uniforms to the shaders. The joint and weight attributes of the primitive itself will be
 * processed in the geometry pipeline stage.
 *
 * Processes a node. This stage modifies the following parts of the render resources:
 * <ul>
 *  <li> adds the uniform declaration for the joint matrices in the vertex shader
 *  <li> adds the function to compute the skinning matrix in the vertex shader
 * </ul>
 *
 * @param {NodeRenderResources} renderResources The render resources for this node.
 * @param {ModelComponents.Node} node The node.
 * @param {FrameState} frameState The frame state.
 * @private
 */

SkinningPipelineStage.process = function (renderResources, node, frameState) {
  const shaderBuilder = renderResources.shaderBuilder;

  shaderBuilder.addDefine("HAS_SKINNING", undefined, ShaderDestination.VERTEX);

  addGetSkinningMatrixFunction(shaderBuilder, node);

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
      return jointMatrices;
    },
  };

  renderResources.uniformMap = combine(uniformMap, renderResources.uniformMap);
};

function addGetSkinningMatrixFunction(shaderBuilder, node) {
  shaderBuilder.addFunction(
    SkinningPipelineStage.FUNCTION_ID_GET_SKINNING_MATRIX,
    SkinningPipelineStage.FUNCTION_SIGNATURE_GET_SKINNING_MATRIX,
    ShaderDestination.VERTEX
  );

  const initialLine = "mat4 skinnedMatrix = mat4(0);";
  shaderBuilder.addFunction(
    SkinningPipelineStage.FUNCTION_ID_GET_SKINNING_MATRIX,
    [initialLine]
  );

  let attributeIndex = 0;
  let componentIndex = 0;
  const componentStrings = ["x", "y", "z", "w"];
  const length = node.skin.joints.length;
  for (let i = 0; i < length; i++) {
    const component = componentStrings[componentIndex];
    const line = `skinnedMatrix += a_weights_${attributeIndex}.${component} * u_jointMatrices[int(a_joints_${attributeIndex}.${component})];`;
    shaderBuilder.addFunction(
      SkinningPipelineStage.FUNCTION_ID_GET_SKINNING_MATRIX,
      [line]
    );

    if (componentIndex === 3) {
      componentIndex = 0;
      attributeIndex++;
    } else {
      componentIndex++;
    }
  }

  const returnLine = "return skinnedMatrix;";
  shaderBuilder.addFunction(
    SkinningPipelineStage.FUNCTION_ID_GET_SKINNING_MATRIX,
    [returnLine]
  );
}

export default SkinningPipelineStage;
