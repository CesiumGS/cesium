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

const nodeTransformScratch = new Matrix4();

/**
 * The instancing pipeline stage is responsible for handling GPU mesh instancing at the node
 * level for model instances specified using <code>ModelInstance</code>
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
 *  <li> creates buffers for the typed arrays of each attribute, if they do not yet exist
 *  <li> adds attribute declarations for the instancing vertex attributes in the vertex shader</li>
 *  <li> sets the instancing translation min and max to compute an accurate bounding volume</li>
 * </ul>
 *
 * If the scene is in either 2D or CV mode, this stage also:
 * <ul>
 *  <li> adds additional attributes for the transformation attributes projected to 2D
 *  <li> adds a flag to the shader to use the 2D instanced attributes
 *  <li> adds a uniform for the view model matrix in 2D
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
  shaderBuilder.addDefine(
    "USE_API_INSTANCING",
    undefined,
    ShaderDestination.VERTEX,
  );
  shaderBuilder.addVertexLines(InstancingStageCommon);
  shaderBuilder.addVertexLines(RuntimeModelInstancingPipelineStageVS);

  const model = renderResources.model;
  const sceneGraph = model.sceneGraph;

  console.log(
    "RuntimeModelInstancingPipelineStage sceneGraph.rootTransform ",
    sceneGraph.rootTransform,
  );
  console.log(
    "RuntimeModelInstancingPipelineStage runtimeNode.computedTransform ",
    renderResources.runtimeNode.computedTransform,
  );

  /**
   * @type {ModelInstance[]}
   */
  const modelInstances = sceneGraph.modelInstances;

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
) {
  const elements = 18;
  const count = modelInstances.length;
  const transformsTypedArray = new Float32Array(count * elements);

  for (let i = 0; i < count; i++) {
    const modelInstance = modelInstances[i];
    if (!defined(modelInstance)) {
      continue;
    }

    const transform = modelInstance.relativeTransform ?? Matrix4.IDENTITY;
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
  //   shaderBuilder.addUniform(
  //     "mat4",
  //     "u_instance_modifiedModelView",
  //     ShaderDestination.VERTEX,
  //   );
  shaderBuilder.addUniform(
    "mat4",
    "u_instance_nodeTransform",
    ShaderDestination.VERTEX,
  );

  const runtimeNode = renderResources.runtimeNode;

  const uniformMap = {
    u_instance_nodeTransform: () => {
      return Matrix4.multiplyTransformation(
        // The transform for the scene graph computed by multiplying the
        // components transform by the the axisCorrectionMatrix
        sceneGraph.rootTransform,
        // This transforms from the node's local space to the model's scene graph space.
        runtimeNode.computedTransform,
        nodeTransformScratch,
      );
    },
  };

  return uniformMap;
};

export default RuntimeModelInstancingPipelineStage;
