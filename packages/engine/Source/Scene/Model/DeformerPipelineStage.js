import combine from "../../Core/combine.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import DeformerStageVS from "../../Shaders/Model/DeformerStageVS.js";
import Deformer from "../Deformer/Deformer.js";

/** @import PrimitiveRenderResources from "./PrimitiveRenderResources.js"; */
/** @import ModelComponents from "../ModelComponents.js"; */
/** @import DeformerBinding, { ShaderNameMap } from "../Deformer/DeformerBinding.js"; */
/** @import { VertexAttributeDescription, UniformDescription } from "../../Renderer/ShaderBuilder.js"; */

// Wires the runtime primitive's deformer bindings into the vertex shader.
// Inserted after morph/skinning, before geometryStage. Each deformer binding declares
// its own attributes, uniforms, and GLSL deformation function.
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
  defineHelperFunctions(shaderBuilder);

  /** @type {string[]} */
  const deformerFunctionNames = [];
  let deformerIndex = 0;
  for (const binding of deformerBindings) {
    processBinding(
      renderResources,
      binding,
      deformerIndex,
      deformerFunctionNames,
    );
    deformerIndex++;
  }

  applyDeformers(shaderBuilder, deformerFunctionNames);

  shaderBuilder.addVertexLines(DeformerStageVS);
};

/**
 * Wires the binding's resources, asks it for its GLSL function, and emits the
 * function. The emitted function's name is appended to <code>outFunctionNames</code>
 * so that <code>applyDeformers</code> can chain them in order.
 *
 * @param {PrimitiveRenderResources} renderResources
 * @param {DeformerBinding} binding
 * @param {number} deformerIndex
 * @param {string[]} outFunctionNames
 */
function processBinding(
  renderResources,
  binding,
  deformerIndex,
  outFunctionNames,
) {
  const deformerUniformNames = addDeformerUniforms(
    renderResources,
    binding,
    deformerIndex,
  );

  const attributeNames = addAttributes(
    renderResources,
    binding.getVertexAttributes(),
    deformerIndex,
  );
  const uniformNames = addBindingUniforms(
    renderResources,
    binding.getUniforms(),
    deformerIndex,
  );

  /** @type {ShaderNameMap} */
  const names = {
    controlPoints: deformerUniformNames.controlPoints,
    indices: deformerUniformNames.indices,
    bindMatrix: deformerUniformNames.bindMatrix,
    attributes: attributeNames,
    uniforms: uniformNames,
  };

  const definition = binding.getDeformerGlsl(names);
  const uniqueDeformerFxName = `${definition.name}_${deformerIndex}`;
  const signature = definition.signature.replace(
    definition.name,
    uniqueDeformerFxName,
  );

  const shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addFunction(
    uniqueDeformerFxName,
    signature,
    ShaderDestination.VERTEX,
  );
  shaderBuilder.addFunctionLines(uniqueDeformerFxName, definition.body);
  outFunctionNames.push(uniqueDeformerFxName);
}

/**
 * Adds uniforms specific to this deformer (control points texture, indices texture,
 * bind matrix) and returns the shader names it created.
 *
 * @param {PrimitiveRenderResources} renderResources
 * @param {DeformerBinding} binding
 * @param {number} deformerIndex
 * @returns {{ controlPoints: string, indices: string, bindMatrix: string }}
 */
function addDeformerUniforms(renderResources, binding, deformerIndex) {
  const shaderBuilder = renderResources.shaderBuilder;
  const controlPointsName = `u_deformerBinding_${deformerIndex}_controlPoints`;
  const indicesName = `u_deformerBinding_${deformerIndex}_indices`;
  const bindMatrixName = `u_deformerBinding_${deformerIndex}_bindMatrix`;

  shaderBuilder.addUniform(
    "sampler2D",
    controlPointsName,
    ShaderDestination.VERTEX,
  );
  shaderBuilder.addUniform(
    "highp usampler2D",
    indicesName,
    ShaderDestination.VERTEX,
  );
  shaderBuilder.addUniform("mat4", bindMatrixName, ShaderDestination.VERTEX);

  const uniformMap = {
    [controlPointsName]: () => binding.getControlPointsTexture(),
    [indicesName]: () => binding.getIndicesTexture(),
    [bindMatrixName]: () => binding.getBindMatrix(),
  };
  renderResources.uniformMap = combine(uniformMap, renderResources.uniformMap);

  return {
    controlPoints: controlPointsName,
    indices: indicesName,
    bindMatrix: bindMatrixName,
  };
}

/**
 * @param {PrimitiveRenderResources} renderResources
 * @param {VertexAttributeDescription[]} descriptions
 * @param {number} deformerIndex
 */
function addAttributes(renderResources, descriptions, deformerIndex) {
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
 * Add uniforms specific to a given deformer-deformable binding.
 * @param {PrimitiveRenderResources} renderResources
 * @param {UniformDescription[]} descriptions
 * @param {number} deformerIndex
 */
function addBindingUniforms(renderResources, descriptions, deformerIndex) {
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

/**
 * @param {object} shaderBuilder
 * @param {string[]} deformerFunctionNames In application order.
 */
function applyDeformers(shaderBuilder, deformerFunctionNames) {
  shaderBuilder.addFunction(
    DeformerPipelineStage.FUNCTION_ID_APPLY_DEFORMERS,
    DeformerPipelineStage.FUNCTION_SIGNATURE_APPLY_DEFORMERS,
    ShaderDestination.VERTEX,
  );

  // Each deformer reads the previous deformer's output.
  const body = ["vec3 deformedPosition = positionMC;"];
  for (const functionName of deformerFunctionNames) {
    body.push(`deformedPosition = ${functionName}(deformedPosition);`);
  }
  body.push("return deformedPosition;");

  shaderBuilder.addFunctionLines(
    DeformerPipelineStage.FUNCTION_ID_APPLY_DEFORMERS,
    body,
  );
}

// Defines file-scope GLSL helpers shared by every binding.
function defineHelperFunctions(shaderBuilder) {
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
