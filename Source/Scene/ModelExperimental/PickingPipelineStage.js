import Buffer from "../../Renderer/Buffer.js";
import BufferUsage from "../../Renderer/BufferUsage.js";
import Color from "../../Core/Color.js";
import ComponentDatatype from "../../Core/ComponentDatatype.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import ModelType from "./ModelType.js";
import ModelExperimentalUtility from "./ModelExperimentalUtility.js";

/**
 * The picking pipeline stage is responsible for handling picking of primitives.
 *
 * @namespace PickingPipelineStage
 * @private
 */
const PickingPipelineStage = {};
PickingPipelineStage.name = "PickingPipelineStage"; // Helps with debugging

/**
 * Process a primitive. This modifies the following parts of the render resources:
 * <ul>
 *  <li>adds attribute and varying declaration for the pick color vertex attribute in the vertex shader for instanced meshes</li>
 *  <li>adds declaration for the pick color uniform for non-instanced meshes</li>
 *  <li>adds defines in the shader for when picking is enabled</li>
 *  <li>creates the pick ID objects in the context</li>
 * </ul>
 * @param {PrimitiveRenderResources} renderResources The render resources for this primitive.
 * @param {ModelComponents.Primitive} primitive The primitive.
 * @param {FrameState} frameState The frame state.
 */
PickingPipelineStage.process = function (
  renderResources,
  primitive,
  frameState
) {
  const context = frameState.context;
  const runtimeNode = renderResources.runtimeNode;
  const shaderBuilder = renderResources.shaderBuilder;
  const model = renderResources.model;
  const instances = runtimeNode.node.instances;

  if (renderResources.hasPropertyTable) {
    processPickTexture(renderResources, primitive, instances, context);
  } else if (defined(instances)) {
    // For instanced meshes, a pick color vertex attribute is used.
    processInstancedPickIds(renderResources, context);
  } else {
    // For non-instanced meshes, a pick color uniform is used.
    const pickObject = buildPickObject(renderResources);

    const pickId = context.createPickId(pickObject);
    model._pipelineResources.push(pickId);
    model._pickIds.push(pickId);

    shaderBuilder.addUniform(
      "vec4",
      "czm_pickColor",
      ShaderDestination.FRAGMENT
    );

    const uniformMap = renderResources.uniformMap;
    uniformMap.czm_pickColor = function () {
      return pickId.color;
    };

    renderResources.pickId = "czm_pickColor";
  }
};

/**
 * @private
 */
function buildPickObject(renderResources, instanceId) {
  const model = renderResources.model;

  const detailPickObject = {
    model: model,
    node: renderResources.runtimeNode,
    primitive: renderResources.runtimePrimitive,
  };

  let pickObject;

  if (ModelType.is3DTiles(model.type)) {
    // For 3D Tiles, the pick object's content and primitive are set to the Cesium3DTileContent that owns the model
    // and the tileset it belongs to, respectively. The detail pick object is returned under the detail key.
    const content = model.content;
    pickObject = {
      content: content,
      primitive: content.tileset,
      detail: detailPickObject,
    };
  } else {
    // For models, the model itself is returned as the primitive, with the detail pick object under the detail key.
    pickObject = {
      primitive: model,
      detail: detailPickObject,
    };
  }

  pickObject.id = model.id;

  if (defined(instanceId)) {
    // For instanced models, an instanceId property is added to the pick object.
    pickObject.instanceId = instanceId;
  }

  return pickObject;
}

function processPickTexture(renderResources, primitive, instances) {
  const model = renderResources.model;
  let featureTableId;
  let featureIdAttribute;
  const featureIdLabel = model.featureIdLabel;
  const instanceFeatureIdLabel = model.instanceFeatureIdLabel;

  if (defined(model.featureTableId)) {
    // Extract the Feature Table ID from the Cesium3DTileContent.
    featureTableId = model.featureTableId;
  } else if (defined(instances)) {
    // Extract the Feature Table ID from the instanced Feature ID attributes.
    featureIdAttribute = ModelExperimentalUtility.getFeatureIdsByLabel(
      instances.featureIds,
      instanceFeatureIdLabel
    );
    featureTableId = featureIdAttribute.propertyTableId;
  } else {
    // Extract the Feature Table ID from the primitive Feature ID attributes.
    featureIdAttribute = ModelExperimentalUtility.getFeatureIdsByLabel(
      primitive.featureIds,
      featureIdLabel
    );
    featureTableId = featureIdAttribute.propertyTableId;
  }

  const featureTable = model.featureTables[featureTableId];

  const shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addUniform(
    "sampler2D",
    "model_pickTexture",
    ShaderDestination.FRAGMENT
  );

  const batchTexture = featureTable.batchTexture;
  renderResources.uniformMap.model_pickTexture = function () {
    return defaultValue(batchTexture.pickTexture, batchTexture.defaultTexture);
  };

  // The feature ID  is ignored if it is greater than the number of features.
  renderResources.pickId =
    "((selectedFeature.id < int(model_featuresLength)) ? texture2D(model_pickTexture, selectedFeature.st) : vec4(0.0))";
}

function processInstancedPickIds(renderResources, context) {
  const instanceCount = renderResources.instanceCount;
  const pickIds = new Array(instanceCount);
  const pickIdsTypedArray = new Uint8Array(instanceCount * 4);

  const model = renderResources.model;

  const pipelineResources = model._pipelineResources;
  for (let i = 0; i < instanceCount; i++) {
    const pickObject = buildPickObject(renderResources, i);

    const pickId = context.createPickId(pickObject);
    pipelineResources.push(pickId);
    pickIds[i] = pickId;

    const pickColor = pickId.color;
    pickIdsTypedArray[i * 4 + 0] = Color.floatToByte(pickColor.red);
    pickIdsTypedArray[i * 4 + 1] = Color.floatToByte(pickColor.green);
    pickIdsTypedArray[i * 4 + 2] = Color.floatToByte(pickColor.blue);
    pickIdsTypedArray[i * 4 + 3] = Color.floatToByte(pickColor.alpha);
  }

  model._pickIds = pickIds;

  const pickIdsBuffer = Buffer.createVertexBuffer({
    context: context,
    typedArray: pickIdsTypedArray,
    usage: BufferUsage.STATIC_DRAW,
  });
  // Destruction of resources allocated by the ModelExperimental
  // is handled by ModelExperimental.destroyPipelineResources().
  pickIdsBuffer.vertexArrayDestroyable = false;
  const hasCpuCopy = false;
  model.statistics.addBuffer(pickIdsBuffer, hasCpuCopy);
  pipelineResources.push(pickIdsBuffer);

  const pickIdsVertexAttribute = {
    index: renderResources.attributeIndex++,
    vertexBuffer: pickIdsBuffer,
    componentsPerAttribute: 4,
    componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
    normalize: true,
    offsetInBytes: 0,
    strideInBytes: 0,
    instanceDivisor: 1,
  };

  renderResources.attributes.push(pickIdsVertexAttribute);

  const shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addDefine("USE_PICKING", undefined, ShaderDestination.BOTH);
  shaderBuilder.addAttribute("vec4", "a_pickColor");
  shaderBuilder.addVarying("vec4", "v_pickColor");
  renderResources.pickId = "v_pickColor";
}

export default PickingPipelineStage;
