import GeometryPipelineStage from "./GeometryPipelineStage.js";
import LightingPipelineStage from "./LightingPipelineStage.js";
import MaterialPipelineStage from "./MaterialPipelineStage.js";

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
  pipelineStages.push(GeometryPipelineStage);
  pipelineStages.push(MaterialPipelineStage);
  pipelineStages.push(LightingPipelineStage);
  return;
}
