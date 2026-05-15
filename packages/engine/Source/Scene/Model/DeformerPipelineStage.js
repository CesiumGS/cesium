import combine from "../../Core/combine.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import DeformerStageVS from "../../Shaders/Model/DeformerStageVS.js";
import Deformer from "../Deformer/Deformer.js";

/** @import PrimitiveRenderResources from "./PrimitiveRenderResources.js"; */
/** @import ModelComponents from "../ModelComponents.js"; */
/** @import DeformerBinding, {VertexAttributeDescription, UniformDescription, ShaderNameMap} from "../Deformer/DeformerBinding.js"; */

// Wires the runtime primitive's deformer bindings into the vertex shader.
// Inserted after morph/skinning, before geometryStage. Each deformer binding declares
// its attributes, uniforms, and GLSL body (with some suffixing modifications to avoid collisions).
const DeformerPipelineStage = {
  name: "DeformerPipelineStage",

  FUNCTION_ID_APPLY_DEFORMERS: "applyDeformers",
  FUNCTION_SIGNATURE_APPLY_DEFORMERS: "vec3 applyDeformers(in vec3 positionMC)",
};

/**
 * @param {PrimitiveRenderResources} renderResources
 * @param {ModelComponents.Primitive} primitive
 * @private
 */
DeformerPipelineStage.process = function (renderResources, primitive) {
  const runtimePrimitive = renderResources.runtimePrimitive;
  const deformerBindings = runtimePrimitive.deformerBindings;
  if (deformerBindings.size === 0) {
    return;
  }

  const shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addDefine("HAS_DEFORMERS", undefined, ShaderDestination.VERTEX);
  emitHelperFunctions(shaderBuilder);

  let deformerIndex = 0;
  for (const binding of deformerBindings) {
    processBinding(renderResources, binding, deformerIndex);
    deformerIndex++;
  }

  emitApplyDeformersFunction(shaderBuilder, deformerIndex);

  shaderBuilder.addVertexLines(DeformerStageVS);
};

/**
 * @param {PrimitiveRenderResources} renderResources
 * @param {DeformerBinding} binding
 * @param {number} deformerIndex
 */
function processBinding(renderResources, binding, deformerIndex) {
  const controlPointsName = wireCommonUniforms(
    renderResources,
    binding,
    deformerIndex,
  );
  const bindMatrixName = `u_deformerBinding_${deformerIndex}_bindMatrix`;

  const attributeNames = wireAttributes(
    renderResources,
    binding.getVertexAttributes(),
    deformerIndex,
  );
  const uniformNames = wireUniforms(
    renderResources,
    binding.getUniforms(),
    deformerIndex,
  );

  /** @type {ShaderNameMap} */
  const names = {
    controlPoints: controlPointsName,
    bindMatrix: bindMatrixName,
    attributes: attributeNames,
    uniforms: uniformNames,
  };
  const body = binding.getDeformerGlsl(names);

  emitDeformerFunction(renderResources.shaderBuilder, deformerIndex, body);
}

// Wires the control-points texture and bind matrix shared by every deformer.
// Returns the control-points shader identifier; the caller reconstructs the
// bind matrix identifier for symmetry with the names map.
function wireCommonUniforms(renderResources, binding, deformerIndex) {
  const shaderBuilder = renderResources.shaderBuilder;
  const controlPointsName = `u_deformerBinding_${deformerIndex}_controlPoints`;
  const bindMatrixName = `u_deformerBinding_${deformerIndex}_bindMatrix`;

  shaderBuilder.addUniform(
    "sampler2D",
    controlPointsName,
    ShaderDestination.VERTEX,
  );
  shaderBuilder.addUniform("mat4", bindMatrixName, ShaderDestination.VERTEX);

  const uniformMap = {
    [controlPointsName]: () => binding.getControlPointsTexture(),
    [bindMatrixName]: () => binding.getBindMatrix(),
  };
  renderResources.uniformMap = combine(uniformMap, renderResources.uniformMap);

  return controlPointsName;
}

/**
 * @param {PrimitiveRenderResources} renderResources
 * @param {VertexAttributeDescription[]} descriptions
 * @param {number} deformerIndex
 */
function wireAttributes(renderResources, descriptions, deformerIndex) {
  const shaderBuilder = renderResources.shaderBuilder;
  /** @type {Object<string, string>} */
  const names = {};
  for (const description of descriptions) {
    const shaderName = `a_deformerBinding_${deformerIndex}_${description.name}`;
    renderResources.attributes.push({
      index: renderResources.attributeIndex++,
      vertexBuffer: description.buffer,
      componentsPerAttribute: description.componentsPerAttribute,
      componentDatatype: description.componentDatatype,
      offsetInBytes: description.offsetInBytes,
      strideInBytes: description.strideInBytes,
      normalize: false,
    });
    shaderBuilder.addAttribute(description.glslType, shaderName);
    names[description.name] = shaderName;
  }
  return names;
}

/**
 * @param {PrimitiveRenderResources} renderResources
 * @param {UniformDescription[]} descriptions
 * @param {number} deformerIndex
 */
function wireUniforms(renderResources, descriptions, deformerIndex) {
  const shaderBuilder = renderResources.shaderBuilder;
  /** @type {Object<string, string>} */
  const names = {};
  /** @type {Object<string, () => any>} */
  const uniformMap = {};
  for (const description of descriptions) {
    const shaderName = `u_deformerBinding_${deformerIndex}_${description.name}`;
    shaderBuilder.addUniform(
      description.glslType,
      shaderName,
      ShaderDestination.VERTEX,
    );
    uniformMap[shaderName] = description.getValue;
    names[description.name] = shaderName;
  }
  renderResources.uniformMap = combine(uniformMap, renderResources.uniformMap);
  return names;
}

function emitApplyDeformersFunction(shaderBuilder, deformerCount) {
  shaderBuilder.addFunction(
    DeformerPipelineStage.FUNCTION_ID_APPLY_DEFORMERS,
    DeformerPipelineStage.FUNCTION_SIGNATURE_APPLY_DEFORMERS,
    ShaderDestination.VERTEX,
  );
  const body = ["vec3 deformedPosition = positionMC;"];
  for (let i = 0; i < deformerCount; ++i) {
    // Each deformer reads the previous deformer's output.
    body.push(`deformedPosition = getDeformedPosition_${i}(deformedPosition);`);
  }
  body.push("return deformedPosition;");
  shaderBuilder.addFunctionLines(
    DeformerPipelineStage.FUNCTION_ID_APPLY_DEFORMERS,
    body,
  );
}

function emitDeformerFunction(shaderBuilder, deformerIndex, body) {
  const functionId = `getDeformedPosition_${deformerIndex}`;
  const signature = `vec3 ${functionId}(in vec3 positionMC)`;
  shaderBuilder.addFunction(functionId, signature, ShaderDestination.VERTEX);
  shaderBuilder.addFunctionLines(functionId, body);
}

// Emits file-scope GLSL helpers shared by every binding.
function emitHelperFunctions(shaderBuilder) {
  for (const helper of Deformer.HELPER_FUNCTIONS) {
    shaderBuilder.addFunction(
      helper.name,
      helper.signature,
      ShaderDestination.VERTEX,
    );
    shaderBuilder.addFunctionLines(helper.name, helper.body);
  }
}

export default DeformerPipelineStage;
