import Buffer from "../../Renderer/Buffer.js";
import BufferUsage from "../../Renderer/BufferUsage.js";
import Color from "../../Core/Color.js";
import combine from "../../Core/combine.js";
import ComponentDatatype from "../../Core/ComponentDatatype.js";
import defined from "../../Core/defined.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";

/**
 * The picking pipeline stage is responsible for handling picking of primitives.
 *
 * @namespace PickingPipelineStage
 * @private
 */
var PickingPipelineStage = {};
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
  var context = frameState.context;
  var runtimeNode = renderResources.runtimeNode;
  var shaderBuilder = renderResources.shaderBuilder;
  var model = renderResources.model;
  var instances = runtimeNode.node.instances;

  if (renderResources.hasFeatureIds) {
    processPickTexture(renderResources, primitive, instances, context);
  } else if (defined(instances)) {
    // For instanced meshes, a pick color vertex attribute is used.
    processInstancedPickIds(renderResources, instances, context);
  } else {
    // For non-instanced meshes, a pick color uniform is used.
    var pickObject = buildPickObject(renderResources);

    var pickId = context.createPickId(pickObject);
    model._resources.push(pickId);
    shaderBuilder.addUniform(
      "vec4",
      "czm_pickColor",
      ShaderDestination.FRAGMENT
    );

    var uniformMap = renderResources.uniformMap;
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
  var model = renderResources.model;

  var detailPickObject = {
    model: model,
    node: renderResources.runtimeNode,
    primitive: renderResources.runtimePrimitive,
  };

  var content = model.content;
  var pickObject;

  if (defined(content)) {
    // For 3D Tiles, the pick object's content and primitive are set to the Cesium3DTileContent that owns the model
    // and the tileset it belongs to, respectively. The detail pick object is returned under the detail key.
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

  if (defined(instanceId)) {
    // For instanced models, an instanceId property is added to the pick object.
    pickObject.instanceId = instanceId;
  }

  return pickObject;
}

function processPickTexture(renderResources, primitive, instances) {
  var model = renderResources.model;
  var featureTableId;
  var featureIdAttribute;
  var featureIdAttributeIndex = model.featureIdAttributeIndex;

  if (defined(instances)) {
    // Extract the Feature Table ID from the instanced Feature ID attributes.
    featureIdAttribute = instances.featureIdAttributes[featureIdAttributeIndex];
    featureTableId = featureIdAttribute.featureTableId;
  } else if (primitive.featureIdTextures.length > 0) {
    // Extract the Feature Table ID from the instanced Feature ID textures.
    var featureIdTextureIndex = model.featureIdTextureIndex;
    var featureIdTexture = primitive.featureIdTextures[featureIdTextureIndex];
    featureTableId = featureIdTexture.featureTableId;
  } else {
    // Extract the Feature Table ID from the primitive Feature ID attributes.
    featureIdAttribute = primitive.featureIdAttributes[featureIdAttributeIndex];
    featureTableId = featureIdAttribute.featureTableId;
  }

  var featureTable;

  var content = model.content;
  if (defined(content)) {
    featureTable = content.featureTables[featureTableId];
  } else {
    featureTable = model.featureTables[featureTableId];
  }

  var shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addUniform(
    "sampler2D",
    "model_pickTexture",
    ShaderDestination.FRAGMENT
  );

  var pickingUniforms = {
    model_pickTexture: function () {
      return featureTable.batchTexture.pickTexture;
    },
  };

  renderResources.uniformMap = combine(
    pickingUniforms,
    renderResources.uniformMap
  );

  // The feature ID  is ignored if it is greater than the number of features.
  renderResources.pickId =
    "((featureId < model_featuresLength) ? texture2D(model_pickTexture, featureSt) : vec4(0.0))";
}

function processInstancedPickIds(renderResources, instances, context) {
  var instanceCount = renderResources.instanceCount;
  var pickIds = new Array(instanceCount);
  var pickIdsTypedArray = new Uint8Array(instanceCount * 4);

  var model = renderResources.model;

  var modelResources = model._resources;
  for (var i = 0; i < instanceCount; i++) {
    var pickObject = buildPickObject(renderResources, i);

    var pickId = context.createPickId(pickObject);
    modelResources.push(pickId);
    pickIds[i] = pickId;

    var pickColor = pickId.color;
    pickIdsTypedArray[i * 4 + 0] = Color.floatToByte(pickColor.red);
    pickIdsTypedArray[i * 4 + 1] = Color.floatToByte(pickColor.green);
    pickIdsTypedArray[i * 4 + 2] = Color.floatToByte(pickColor.blue);
    pickIdsTypedArray[i * 4 + 3] = Color.floatToByte(pickColor.alpha);
  }

  var pickIdsBuffer = Buffer.createVertexBuffer({
    context: context,
    typedArray: pickIdsTypedArray,
    usage: BufferUsage.STATIC_DRAW,
  });
  // Destruction of resources allocated by the ModelExperimental is handled by ModelExperimental.destroy().
  pickIdsBuffer.vertexArrayDestroyable = false;
  modelResources.push(pickIdsBuffer);

  var pickIdsVertexAttribute = {
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

  var shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addDefine("USE_PICKING", undefined, ShaderDestination.BOTH);
  shaderBuilder.addAttribute("vec4", "a_pickColor");
  shaderBuilder.addVarying("vec4", "v_pickColor");
  renderResources.pickId = "v_pickColor";
}

export default PickingPipelineStage;
