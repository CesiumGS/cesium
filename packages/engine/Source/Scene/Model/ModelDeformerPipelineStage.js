import { AttributeType, ComponentDatatype, combine } from "@cesium/core";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import DeformerStageVS from "../../Shaders/Model/DeformerStageVS.js";

/**
 * Applies a primitive's {@link DeformerBinding}s to its positions in the
 * vertex shader. Each deformer binding (if there are multiple) deforms the rest position,
 * with each offset contributing to a total deformed position.
 *
 * @namespace ModelDeformerPipelineStage
 *
 * @private
 */
const ModelDeformerPipelineStage = {
  name: "ModelDeformerPipelineStage",

  FUNCTION_ID_GET_DEFORMED_POSITION: "getDeformedPosition",
  FUNCTION_SIGNATURE_GET_DEFORMED_POSITION:
    "vec3 getDeformedPosition(in vec3 positionMC)",
};

/**
 * Processes a primitive. This modifies the following parts of the render resources:
 * <ul>
 *  <li>adds the HAS_DEFORMERS define to the vertex shader</li>
 *  <li>adds each binding's vertex attributes and uniforms</li>
 *  <li>adds a function per binding, and getDeformedPosition, which adds each binding's offsets to the total deformed position</li>
 *  <li>adds the deformer stage to the vertex shader</li>
 * </ul>
 *
 * @param {PrimitiveRenderResources} renderResources The render resources for the primitive.
 *
 * @private
 */
ModelDeformerPipelineStage.process = function (renderResources) {
  const shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addDefine("HAS_DEFORMERS", undefined, ShaderDestination.VERTEX);

  const lines = ["vec3 deformedPosition = positionMC;"];
  let index = 0;
  for (const binding of renderResources.runtimePrimitive.deformerBindings) {
    const names = {};
    addVertexAttributes(renderResources, binding, index, names);
    addUniforms(renderResources, binding, index, names);

    const functionId = `deformer${index}`;
    shaderBuilder.addFunction(
      functionId,
      `vec3 ${functionId}(in vec3 positionMC)`,
      ShaderDestination.VERTEX,
    );

    shaderBuilder.addFunctionLines(functionId, binding.getShaderLines(names));
    lines.push(`deformedPosition += ${functionId}(positionMC) - positionMC;`);

    index++;
  }

  lines.push("return deformedPosition;");

  shaderBuilder.addFunction(
    ModelDeformerPipelineStage.FUNCTION_ID_GET_DEFORMED_POSITION,
    ModelDeformerPipelineStage.FUNCTION_SIGNATURE_GET_DEFORMED_POSITION,
    ShaderDestination.VERTEX,
  );

  shaderBuilder.addFunctionLines(
    ModelDeformerPipelineStage.FUNCTION_ID_GET_DEFORMED_POSITION,
    lines,
  );

  shaderBuilder.addVertexLines(DeformerStageVS);
};

function getSizeInBytes(attribute) {
  return (
    attribute.componentCount *
    ComponentDatatype.getSizeInBytes(attribute.componentDatatype)
  );
}

function addVertexAttributes(renderResources, binding, index, names) {
  const attributes = binding.vertexAttributes;
  const strideInBytes = attributes.reduce(
    (stride, attribute) => stride + getSizeInBytes(attribute),
    0,
  );

  let offsetInBytes = 0;
  for (const attribute of attributes) {
    const name = `a_deformer${index}_${attribute.name}`;

    renderResources.shaderBuilder.addAttribute(
      AttributeType.getGlslType(attribute.type),
      name,
    );

    renderResources.attributes.push({
      index: renderResources.attributeIndex++,
      vertexBuffer: binding.vertexBuffer,
      componentsPerAttribute: attribute.componentCount,
      componentDatatype: attribute.componentDatatype,
      normalize: false,
      offsetInBytes,
      strideInBytes,
    });

    names[attribute.name] = name;
    offsetInBytes += getSizeInBytes(attribute);
  }
}

function addUniforms(renderResources, binding, index, names) {
  const uniformMap = {};
  for (const [name, uniform] of Object.entries(binding.uniforms)) {
    const id = `u_deformer${index}_${name}`;

    renderResources.shaderBuilder.addUniform(
      uniform.type,
      id,
      ShaderDestination.VERTEX,
    );

    uniformMap[id] = uniform.value;
    names[name] = id;
  }

  renderResources.uniformMap = combine(uniformMap, renderResources.uniformMap);
}

export default ModelDeformerPipelineStage;
