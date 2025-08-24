import Cartesian3 from "../../Core/Cartesian3.js";
import combine from "../../Core/combine.js";
import ComponentDatatype from "../../Core/ComponentDatatype.js";
import defined from "../../Core/defined.js";
import EncodedCartesian3 from "../../Core/EncodedCartesian3.js";
import Matrix4 from "../../Core/Matrix4.js";
import Buffer from "../../Renderer/Buffer.js";
import BufferUsage from "../../Renderer/BufferUsage.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import InstancingStageCommon from "../../Shaders/Model/InstancingStageCommon.js";
import RuntimeModelInstancingPipelineStageVS from "../../Shaders/Model/RuntimeModelInstancingPipelineStageVS.js";
import RuntimeModelInstancingPipelineStageFS from "../../Shaders/Model/RuntimeModelInstancingPipelineStageFS.js";
import ColorBlendMode from "../ColorBlendMode.js";

const nodeTransformScratch = new Matrix4();
const relativeScaledTransformScratch = new Matrix4();

/**
 * The runtime model instancing pipeline stage is responsible for handling GPU mesh instancing
 * specified through the API through the <code>ModelInstance</code> class.
 *
 * @namespace RuntimeModelInstancingPipelineStage
 * @private
 */
const RuntimeModelInstancingPipelineStage = {
  name: "RuntimeModelInstancingPipelineStage", // Helps with debugging
};

/**
 * Process a node. This modifies the following parts of the render resources:
 * <ul>
 *  <li> adds attribute declarations for the instancing vertex attributes in the vertex shader</li>
 *  <li> creates a buffer for the typed array containing the value for each attribute</li>
 * </ul>
 *
 * @param {NodeRenderResources} renderResources The render resources for this node.
 * @param {ModelComponents.Node} node The node.
 * @param {FrameState} frameState The frame state.
 */
RuntimeModelInstancingPipelineStage.process = function (
  renderResources,
  node,
  frameState,
) {
  const shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addDefine("HAS_INSTANCING");
  shaderBuilder.addDefine("HAS_INSTANCE_MATRICES");
  shaderBuilder.addDefine("USE_API_INSTANCING", undefined, ShaderDestination.VERTEX);
  shaderBuilder.addDefine("USE_API_INSTANCING", undefined, ShaderDestination.FRAGMENT);
  
  shaderBuilder.addVertexLines(InstancingStageCommon);
  shaderBuilder.addVertexLines(RuntimeModelInstancingPipelineStageVS);

  shaderBuilder.addVarying("vec4", "v_gex_instanceColor");
  shaderBuilder.addFragmentLines(RuntimeModelInstancingPipelineStageFS);

  const model = renderResources.model;
  const sceneGraph = model.sceneGraph;
  
  /**
   * @type {ModelInstance[]}
   */
  const modelInstances = sceneGraph.modelInstances._instances;

  const attributes = RuntimeModelInstancingPipelineStage._createAttributes(
    frameState,
    renderResources,
    modelInstances,
  );

  renderResources.instanceCount = modelInstances.length;
  renderResources.attributes.push.apply(renderResources.attributes, attributes);

  const uniformMap = RuntimeModelInstancingPipelineStage._createUniforms(
    renderResources,
    sceneGraph,
  );
  renderResources.uniformMap = combine(uniformMap, renderResources.uniformMap);
};

RuntimeModelInstancingPipelineStage._getTransformsTypedArray = function (
  modelInstances,
  model,
  frameState,
) {
  const elements = 18;
  const count = modelInstances.length;
  const transformsTypedArray = new Float32Array(count * elements);

  for (let i = 0; i < count; i++) {
    const modelInstance = modelInstances[i];
    if (!defined(modelInstance)) {
      continue;
    }

    const transform = modelInstance.getRelativeScaledTransform(
      model,
      frameState,
      relativeScaledTransformScratch,
    );
    const offset = elements * i;

    transformsTypedArray[offset + 0] = transform[0];
    transformsTypedArray[offset + 1] = transform[4];
    transformsTypedArray[offset + 2] = transform[8];
    transformsTypedArray[offset + 3] = transform[12];
    transformsTypedArray[offset + 4] = transform[1];
    transformsTypedArray[offset + 5] = transform[5];
    transformsTypedArray[offset + 6] = transform[9];
    transformsTypedArray[offset + 7] = transform[13];
    transformsTypedArray[offset + 8] = transform[2];
    transformsTypedArray[offset + 9] = transform[6];
    transformsTypedArray[offset + 10] = transform[10];
    transformsTypedArray[offset + 11] = transform[14];

    const translation = modelInstance.center ?? Cartesian3.ZERO;

    EncodedCartesian3.writeElements(
      translation,
      transformsTypedArray,
      offset + 12,
    );
  }

  return transformsTypedArray;
};

RuntimeModelInstancingPipelineStage._getColorsTypedArray = function (
  modelInstances
) {
  const colorsTypedArray = new Uint8Array(modelInstances.length * 4);

  for (let i = 0; i < modelInstances.length; i++) {
    const color = modelInstances[i]?.color;

    if (color === undefined) {
      continue;
    }

    const o = i * 4;

    colorsTypedArray[o + 0] = Math.round(color.red * 255);
    colorsTypedArray[o + 1] = Math.round(color.green * 255);
    colorsTypedArray[o + 2] = Math.round(color.blue * 255);
    colorsTypedArray[o + 3] = Math.round(color.alpha * 255);
  }

  return colorsTypedArray;
};

RuntimeModelInstancingPipelineStage._createAttributes = function (
  frameState,
  renderResources,
  modelInstances,
) {
  const context = frameState.context;
  const usage = BufferUsage.STATIC_DRAW;

  // Create typed array and buffer
  const transformsTypedArray =
    RuntimeModelInstancingPipelineStage._getTransformsTypedArray(
      modelInstances,
      renderResources.model,
      frameState,
    );
  const transformsBuffer = Buffer.createVertexBuffer({
    context,
    usage,
    typedArray: transformsTypedArray,
  });

  const colorsTypedArray = RuntimeModelInstancingPipelineStage._getColorsTypedArray(modelInstances);
  const colorsBuffer = Buffer.createVertexBuffer({
    context,
    usage: BufferUsage.DYNAMIC_DRAW,
    typedArray: colorsTypedArray,
  });
  
  renderResources.runtimeNode.instancingTransformsBuffer = transformsBuffer;
  renderResources.runtimeNode.instanceColorsBuffer = colorsBuffer;

  // Destruction of resources allocated by the Model
  // is handled by Model.destroy().
  transformsBuffer.vertexArrayDestroyable = false;
  colorsBuffer.vertexArrayDestroyable = false;

  // Add attribute declarations
  const shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addAttribute("vec4", `a_instancingTransformRow0`);
  shaderBuilder.addAttribute("vec4", `a_instancingTransformRow1`);
  shaderBuilder.addAttribute("vec4", `a_instancingTransformRow2`);

  shaderBuilder.addAttribute("vec3", `a_instancingPositionHigh`);
  shaderBuilder.addAttribute("vec3", `a_instancingPositionLow`);

  shaderBuilder.addAttribute("vec4", "a_gex_instanceColor");

  // Create attributes
  const vertexSizeInFloats = 18;
  const componentByteSize = ComponentDatatype.getSizeInBytes(
    ComponentDatatype.FLOAT,
  );
  const strideInBytes = componentByteSize * vertexSizeInFloats;

  const attributes = [
    {
      index: renderResources.attributeIndex++,
      vertexBuffer: transformsBuffer,
      componentsPerAttribute: 4,
      componentDatatype: ComponentDatatype.FLOAT,
      normalize: false,
      offsetInBytes: 0,
      strideInBytes: strideInBytes,
      instanceDivisor: 1,
    },
    {
      index: renderResources.attributeIndex++,
      vertexBuffer: transformsBuffer,
      componentsPerAttribute: 4,
      componentDatatype: ComponentDatatype.FLOAT,
      normalize: false,
      offsetInBytes: componentByteSize * 4,
      strideInBytes: strideInBytes,
      instanceDivisor: 1,
    },
    {
      index: renderResources.attributeIndex++,
      vertexBuffer: transformsBuffer,
      componentsPerAttribute: 4,
      componentDatatype: ComponentDatatype.FLOAT,
      normalize: false,
      offsetInBytes: componentByteSize * 8,
      strideInBytes: strideInBytes,
      instanceDivisor: 1,
    },
    {
      index: renderResources.attributeIndex++,
      vertexBuffer: transformsBuffer,
      componentsPerAttribute: 3,
      componentDatatype: ComponentDatatype.FLOAT,
      normalize: false,
      offsetInBytes: componentByteSize * 12,
      strideInBytes: strideInBytes,
      instanceDivisor: 1,
    },
    {
      index: renderResources.attributeIndex++,
      vertexBuffer: transformsBuffer,
      componentsPerAttribute: 3,
      componentDatatype: ComponentDatatype.FLOAT,
      normalize: false,
      offsetInBytes: componentByteSize * 15,
      strideInBytes: strideInBytes,
      instanceDivisor: 1,
    },
    {
      index: renderResources.attributeIndex++,
      vertexBuffer: colorsBuffer,
      componentsPerAttribute: 4,
      componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
      normalize: true,
      offsetInBytes: 0,
      strideInBytes: 4,
      instanceDivisor: 1,
    }
  ];

  return attributes;
};

RuntimeModelInstancingPipelineStage._createUniforms = function (
  renderResources,
  sceneGraph,
) {
  const shaderBuilder = renderResources.shaderBuilder;

  shaderBuilder.addUniform(
    "mat4",
    "u_instance_nodeTransform",
    ShaderDestination.VERTEX,
  );
  
  shaderBuilder.addUniform(
    "float",
    "gex_instanceColorBlend",
    ShaderDestination.FRAGMENT,
  );

  const runtimeNode = renderResources.runtimeNode;

  const uniformMap = {
    u_instance_nodeTransform: () => {
      const transform = Matrix4.multiplyByUniformScale(
        // The transform for the scene graph computed by multiplying the
        // components transform by the the axisCorrectionMatrix
        sceneGraph.rootTransform,
        sceneGraph._computedModelScale,
        nodeTransformScratch,
      );

      return Matrix4.multiplyTransformation(
        transform,
        // This transforms from the node's local space to the model's scene graph space.
        runtimeNode.computedTransform,
        nodeTransformScratch,
      );
    },

    gex_instanceColorBlend: () => {
      return ColorBlendMode.getColorBlend(renderResources.model.colorBlendMode, renderResources.model.colorBlendAmount);
    }
  };
  
  return uniformMap;
};

export default RuntimeModelInstancingPipelineStage;
