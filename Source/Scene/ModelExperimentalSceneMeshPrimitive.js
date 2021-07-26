import MeshGeometryPipelineStage from "./MeshGeometryPipelineStage";

export default function ModelExperimentalSceneMeshPrimitive(options) {
  /**
   * @type {ModelComponents.Primitive}
   */
  this._primitive = options.primitive;

  this._pipelineStages = [];

  initialize(this);
}

function initialize(sceneMeshPrimitive) {
  var pipelineStages = sceneMeshPrimitive._pipelineStages;
  pipelineStages.push(MeshGeometryPipelineStage);
  return;
}
