import ShaderBuilder from "../../Renderer/ShaderBuilder.js";
//import VertexArray from "../../Renderer/VertexArray.js";
import BoundingSphere from "../../Core/BoundingSphere.js";
//import DrawCommand from "../../Renderer/DrawCommand.js";
//import Pass from "../../Renderer/Pass.js";
//import RenderState from "../../Renderer/RenderState.js";
import Matrix4 from "../../Core/Matrix4.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import Model2Utility from "./Model2Utility.js";

var RenderResources = {};

function NodeRenderResources(sceneNode) {
  this.attributes = [];
  this.shaderBuilder = new ShaderBuilder();
  this.modelMatrix = sceneNode._modelMatrix;
  this.instanceCount = 0;
}

function PrimitiveRenderResources(nodeRenderResources, primitive) {
  var modelMatrix = nodeRenderResources.modelMatrix;

  this.shaderBuilder = nodeRenderResources.shaderBuilder.clone();
  this.uniformMap = {};
  this.indices = primitive.indices;
  this.indexCount = 0;
  this.instanceCount = nodeRenderResources.instanceCount;
  this.attributes = nodeRenderResources.attributes.slice();
  this.renderStateOptions = {};
  this.boundingSphere = createBoundingSphere(primitive, modelMatrix);
  this.modelMatrix = modelMatrix.clone();
  this.primitiveType = primitive.primitiveType;
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

RenderResources.NodeRenderResources = NodeRenderResources;
RenderResources.PrimitiveRenderResources = PrimitiveRenderResources;
export default RenderResources;
