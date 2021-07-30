import GeometryPipelineStage from "./GeometryPipelineStage.js";
import PickingPipelineStage from "./PickingPipelineStage.js";

export default function ModelExperimentalSceneMeshPrimitive(options) {
  /**
   * @type {ModelComponents.Primitive}
   */
  this._primitive = options.primitive;

  this._allowPicking = options.allowPicking;

  this._pipelineStages = [];

  initialize(this);
}

function initialize(sceneMeshPrimitive) {
  var pipelineStages = sceneMeshPrimitive._pipelineStages;
  pipelineStages.push(GeometryPipelineStage);

  if (sceneMeshPrimitive._allowPicking) {
    pipelineStages.push(PickingPipelineStage);
  }

  return;
}
