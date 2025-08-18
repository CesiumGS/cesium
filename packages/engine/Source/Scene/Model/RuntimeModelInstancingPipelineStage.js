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
import SceneMode from "../SceneMode.js";

const nodeTransformScratch = new Matrix4();
const relativeScaledTransformScratch = new Matrix4();
const scratchCartesian3 = new Cartesian3();

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
  shaderBuilder.addDefine(
    "USE_API_INSTANCING",
    undefined,
    ShaderDestination.VERTEX,
  );
  shaderBuilder.addVertexLines(InstancingStageCommon);
  shaderBuilder.addVertexLines(RuntimeModelInstancingPipelineStageVS);

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

  const useBoundingSphere2D =
    !frameState.scene3DOnly && model.sceneGraph._projectTo2D;
  const useModelMatrix2D =
    frameState.mode !== SceneMode.SCENE3D && !useBoundingSphere2D;

  const modelTranslation = Matrix4.getTranslation(
    model.modelMatrix,
    scratchCartesian3,
  );
  let earthCenteredInstances = false;
  if (Cartesian3.equals(modelTranslation, Cartesian3.ZERO)) {
    earthCenteredInstances = true;
  }

  for (let i = 0; i < count; i++) {
    const modelInstance = modelInstances[i];
    if (!defined(modelInstance)) {
      continue;
    }

    const transform = modelInstance.getRelativeScaledTransform(
      model,
      frameState,
      useModelMatrix2D,
      earthCenteredInstances,
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

    let translation = modelInstance.center ?? Cartesian3.ZERO;
    if (useModelMatrix2D && earthCenteredInstances) {
      translation = modelInstance.getCenter2D(frameState.mapProjection);
    }

    EncodedCartesian3.writeElements(
      translation,
      transformsTypedArray,
      offset + 12,
    );
  }

  return transformsTypedArray;
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

  renderResources.runtimeNode.instancingTransformsBuffer = transformsBuffer;

  // Destruction of resources allocated by the Model
  // is handled by Model.destroy().
  transformsBuffer.vertexArrayDestroyable = false;

  // Add attribute declarations
  const shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addAttribute("vec4", `a_instancingTransformRow0`);
  shaderBuilder.addAttribute("vec4", `a_instancingTransformRow1`);
  shaderBuilder.addAttribute("vec4", `a_instancingTransformRow2`);

  shaderBuilder.addAttribute("vec3", `a_instancingPositionHigh`);
  shaderBuilder.addAttribute("vec3", `a_instancingPositionLow`);

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
  };

  return uniformMap;
};

export default RuntimeModelInstancingPipelineStage;
