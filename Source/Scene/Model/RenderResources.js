import ShaderBuilder from "../../Renderer/ShaderBuilder.js";
import VertexArray from "../../Renderer/VertexArray.js";
import BoundingSphere from "../../Core/BoundingSphere.js";
import DrawCommand from "../../Renderer/DrawCommand.js";
import Pass from "../../Renderer/Pass.js";
import RenderState from "../../Renderer/RenderState.js";
import Matrix4 from "../../Core/Matrix4.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import Model2Utility from "./Model2Utility.js";

var RenderResources = {};

function NodeRenderResources(sceneNode) {
  this.attributes = [];
  this.shaderBuilder = new ShaderBuilder();
  this.modelMatrix = sceneNode._modelMatrix;
}

function PrimitiveRenderResources(nodeRenderResources, primitive) {
  var modelMatrix = nodeRenderResources.modelMatrix;

  this.shaderBuilder = nodeRenderResources.shaderBuilder.clone();
  this.uniformMap = {};
  this.indices = undefined;
  this.indexCount = 0;
  this.instanceCount = 0;
  this.attributes = nodeRenderResources.attributes.slice();
  this.renderStateOptions = {};
  this.boundingSphere = createBoundingSphere(primitive, modelMatrix);
  this.modelMatrix = modelMatrix.clone();
}

function createBoundingSphere(primitive, modelMatrix) {
  var positionGltfAttribute = Model2Utility.getAttributeBySemantic(
    primitive,
    "POSITION"
  );
  var boundingSphere = BoundingSphere.fromCornerPoints(
    positionGltfAttribute.min,
    positionGltfAttribute.max
  );
  boundingSphere.center = Matrix4.getTranslation(modelMatrix, new Cartesian3());
  return boundingSphere;
}

PrimitiveRenderResources.prototype.buildDrawCommand = function (frameState) {
  var vertexArray = new VertexArray({
    context: frameState.context,
    indices: this.indices,
    attributes: this.attributes,
  });

  var renderState = RenderState.fromCache(this.renderStateOptions);

  var shaderProgram = this.shaderBuilder.buildShaderProgram(frameState.context);

  return new DrawCommand({
    boundingVolume: this.boundingSphere,
    modelMatrix: this.modelMatrix,
    uniformMap: this.uniformMap,
    renderState: renderState,
    vertexArray: vertexArray,
    shaderProgram: shaderProgram,
    pass: Pass.OPAQUE,
    count: this.indexCount,
    instanceCount: this.instanceCount,
  });

  // var command = new DrawCommand({
  //   boundingVolume: boundingSphere,
  //   cull: model.cull, // TODO
  //   modelMatrix: new Matrix4(),
  //   primitiveType: primitive.mode,
  //   vertexArray: vertexArray,
  //   count: count,
  //   offset: offset,
  //   shaderProgram: rendererPrograms[programId],
  //   castShadows: castShadows,
  //   receiveShadows: receiveShadows,
  //   uniformMap: uniformMap,
  //   renderState: renderState,
  //   owner: owner,
  //   pass: isTranslucent ? Pass.TRANSLUCENT : model.opaquePass,
  //   pickId: pickId,
  // });
};

RenderResources.NodeRenderResources = NodeRenderResources;
RenderResources.PrimitiveRenderResources = PrimitiveRenderResources;
export default RenderResources;
