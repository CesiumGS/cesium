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
  return;
}
