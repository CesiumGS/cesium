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
    var pickObject = {
      model: model,
      node: renderResources.runtimeNode,
      primitive: renderResources.runtimePrimitive,
    };

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

function processPickTexture(renderResources, primitive, instances) {
  var model = renderResources.model;
  var featureIdAttribute;
  var featureIdAttributeIndex = model.featureIdAttributeIndex;

  if (defined(instances)) {
    featureIdAttribute = instances.featureIdAttributes[featureIdAttributeIndex];
  } else if (primitive.featureIdTextures.length > 0) {
    var featureIdTextureIndex = model.featureIdTextureIndex;
    featureIdAttribute = primitive.featureIdTextures[featureIdTextureIndex];
  } else {
    featureIdAttribute = primitive.featureIdAttributes[featureIdAttributeIndex];
  }

  var featureTable = model.featureTables[featureIdAttribute.featureTableId];

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
    var pickObject = {
      model: renderResources.model,
      node: renderResources.runtimeNode,
      primitive: renderResources.runtimePrimitive,
      instanceId: i,
    };

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
  shaderBuilder.addAttribute("vec4", "a_pickColor");
  shaderBuilder.addVarying("vec4", "v_pickColor");
  renderResources.pickId = "v_pickColor";
}

export default PickingPipelineStage;
