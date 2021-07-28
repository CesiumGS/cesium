import defined from "../Core/defined.js";
import InstancingPiplineStage from "./InstancingPipelineStage.js";

export default function ModelSceneNode(options) {
  /**
   * @type {ModelComponents.Node}
   */
  this._node = options.node;

  /**
   * @type {Matrix4}
   */
  this._modelMatrix = options.modelMatrix;

  /**
   * Pipeline stages to apply across the mesh primitives of this node.
   */
  this._pipelineStages = [];

  /**
   * @type {ModelExperimentalSceneMeshPrimitive}
   */
  this._sceneMeshPrimitives = [];

  initialize(this);
}

function initialize(sceneNode) {
  var node = sceneNode._node;
  var pipelineStages = sceneNode._pipelineStages;

  if (defined(node.instances)) {
    pipelineStages.push(InstancingPiplineStage);
  }

  return;
}
