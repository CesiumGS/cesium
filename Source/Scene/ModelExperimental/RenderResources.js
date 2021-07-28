import defined from "../../Core/defined.js";
import ShaderBuilder from "../../Renderer/ShaderBuilder.js";
import DepthFunction from "../DepthFunction.js";
import ModelExperimentalUtility from "./ModelExperimentalUtility.js";
import ModelLightingOptions from "./ModelLightingOptions.js";

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
  this.attributeIndex = 1; // 0 is reserved for POSITION.
  this.instanceCount = 0;
}

/**
 * @private
 */
function MeshPrimitiveRenderResources(nodeRenderResources, sceneMeshPrimitive) {
  // Properties inherited from NodeRenderResources.
  this.model = nodeRenderResources.model;
  this.sceneNode = nodeRenderResources.sceneNode;
  this.attributes = nodeRenderResources.attributes.slice();
  this.modelMatrix = nodeRenderResources.modelMatrix.clone();
  this.shaderBuilder = nodeRenderResources.shaderBuilder.clone();
  this.instanceCount = nodeRenderResources.instanceCount;
  this.attributeIndex = nodeRenderResources.attributeIndex;

  // Properties inherited from the mesh primitive.
  var primitive = sceneMeshPrimitive._primitive;
  this.count = defined(primitive.indices)
    ? primitive.indices.count
    : ModelExperimentalUtility.getAttributeBySemantic(primitive, "POSITION")
        .count;
  this.indices = primitive.indices;
  this.primitiveType = primitive.primitiveType;
  this.boundingSphere = ModelExperimentalUtility.createBoundingSphere(
    primitive,
    this.modelMatrix
  );

  // per-primitive properties
  this.uniformMap = {};
  this.lightingOptions = new ModelLightingOptions();
  this.renderStateOptions = {
    depthTest: {
      enabled: true,
      func: DepthFunction.LESS_OR_EQUAL,
    },
  };
}

RenderResources.ModelRenderResources = ModelRenderResources;
RenderResources.NodeRenderResources = NodeRenderResources;
RenderResources.MeshPrimitiveRenderResources = MeshPrimitiveRenderResources;
export default RenderResources;
