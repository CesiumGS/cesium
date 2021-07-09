import defined from "../../Core/defined.js";
import MeshGeometryPipelineStage from "./MeshGeometryPipelineStage.js";
import SolidColorPipelineStage from "./SolidColorPipelineStage.js";

export default function ModelSceneMeshPrimitive(options) {
  this._primitive = options.primitive;
  this._pipelineStages = [];

  // LOOP through primitives
  initializeMeshPrimitive(this);
}

function PBRPipelineStage() {}
PBRPipelineStage.process = function () {};
function IBLPipelineStage() {}
IBLPipelineStage.process = function () {};
function TechniquePipelineStage() {}
TechniquePipelineStage.process = function () {};
function LightingPipelineStage() {}
LightingPipelineStage.process = function () {};

function hasPbrMaterials(primitive) {
  return defined(primitive.material);
}

function hasTechniques(primitive) {}

function initializeMeshPrimitive(scenePrimitive) {
  // TODO: MeshGeometryPipelineStage vs PointGeometryPipelineStage?
  scenePrimitive._pipelineStages.push(MeshGeometryPipelineStage);

  /*
  if (customShader.insertBeforeMaterial) {
    primitive._pipelineStages.push(CustomShaderStage.Before);
  }
  */

  if (hasPbrMaterials(scenePrimitive._primitive)) {
    scenePrimitive._pipelineStages.push(PBRPipelineStage, IBLPipelineStage);
  } else if (hasTechniques(scenePrimitive._primitive)) {
    scenePrimitive._pipelineStages.push(TechniquePipelineStage);
  } else {
    throw new Error("only PBR materials and techniques are supported");
  }

  /*
  if (customShader.insertAfterMaterial) {
    primitive._pipelineStages.push(CustomShaderStage.After);
  }
  */

  scenePrimitive._pipelineStages.push(LightingPipelineStage);

  // TODO: remove this when done
  scenePrimitive._pipelineStages.push(SolidColorPipelineStage);
}
