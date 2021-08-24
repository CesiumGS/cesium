import Color from "../../Core/Color.js";
import ComponentDatatype from "../../Core/ComponentDatatype.js";
import defined from "../../Core/defined.js";
import Buffer from "../../Renderer/Buffer.js";
import BufferUsage from "../../Renderer/BufferUsage.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";

var PickingPipelineStage = {};

PickingPipelineStage.process = function (
  renderResources,
  primitive,
  frameState
) {
  var context = frameState.context;
  var runtimeNode = renderResources.runtimeNode;
  var shaderBuilder = renderResources.shaderBuilder;

  shaderBuilder.addDefine("ALLOWS_PICKING");

  if (defined(runtimeNode.node.instances)) {
    processInstancedPickIds(renderResources, context);
  } else {
    var pickObject = {
      model: renderResources.model,
      node: renderResources.runtimeNode,
      primitive: renderResources.runtimePrimitive,
    };

    var pickId = context.createPickId(pickObject);
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

function processInstancedPickIds(renderResources, context) {
  var instanceCount = renderResources.instanceCount;
  var pickIds = new Array(instanceCount);
  var pickIdsTypedArray = new Uint8Array(instanceCount * 4);

  for (var i = 0; i < instanceCount; i++) {
    var pickObject = {
      model: renderResources.model,
      node: renderResources.runtimeNode,
      primitive: renderResources.runtimePrimitive,
      instance: {
        id: i,
      },
    };

    var pickId = context.createPickId(pickObject);
    var pickColor = pickId.color;

    pickIds[i] = pickId;

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
  pickIdsBuffer.vertexArrayDestroyable = false;
  renderResources.model._resources.push(pickIdsBuffer);

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
