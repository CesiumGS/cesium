import ShaderBuilder from "../Renderer/ShaderBuilder";
import DepthFunction from "./DepthFunction";
import ModelExperimentalUtility from "./ModelExperimentalUtility";

/**
 * Resources assigned at each level of a glTF (model, node, primitive)
 * that are required to generate draw commands.
 *
 * @private
 */
var RenderResources = {};

/**
 * @private
 */
function ModelRenderResources(model) {
  this.shaderBuilder = new ShaderBuilder();
  this.model = model;
}

/**
 * @private
 */
function NodeRenderResources(modelRenderResources, sceneNode) {
  // Properties inherited from the ModelRenderResources.
  this.model = modelRenderResources.model;
  this.shaderBuilder = modelRenderResources.shaderBuilder.clone();

  // Properties inherited from the scene node.
  this.sceneNode = sceneNode;
  this.modelMatrix = sceneNode._modelMatrix;

  this.attributes = [];
}

/**
 * @private
 */
function PrimitiveRenderResources(nodeRenderResources, primitive) {
  // Properties inherited from NodeRenderResources.
  this.model = nodeRenderResources.model;
  this.sceneNode = nodeRenderResources.sceneNode;
  this.attributes = nodeRenderResources.attributes.slice();
  this.modelMatrix = nodeRenderResources.modelMatrix.clone();
  this.shaderBuilder = nodeRenderResources.shaderBuilder.clone();

  // Properties inherited from the mesh primitive.
  this.count = primitive.indices.count;
  this.indices = primitive.indices;
  this.primitiveType = primitive.primitiveType;
  this.boundingSphere = ModelExperimentalUtility.createBoundingSphere(
    primitive,
    this.modelMatrix
  );

  // Static properties.
  this.renderStateOptions = {
    depthTest: {
      enabled: true,
      func: DepthFunction.LESS_OR_EQUAL,
    },
  };
}

RenderResources.ModelRenderResources = ModelRenderResources;
RenderResources.NodeRenderResources = NodeRenderResources;
RenderResources.PrimitiveRenderResources = PrimitiveRenderResources;
export default RenderResources;
