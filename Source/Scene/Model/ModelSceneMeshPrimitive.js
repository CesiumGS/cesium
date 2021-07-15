import defined from "../../Core/defined.js";
import CustomShaderStage from "./CustomShaderStage.js";
import MeshGeometryPipelineStage from "./MeshGeometryPipelineStage.js";
import PointGeometryPipelineStage from "./PointGeometryPipelineStage.js";
import PickingStage from "./PickingStage.js";
//import SolidColorPipelineStage from "./SolidColorPipelineStage.js";
import PrimitiveType from "../../Core/PrimitiveType.js";

export default function ModelSceneMeshPrimitive(options) {
  this._primitive = options.primitive;
  this._pipelineStages = [];

  // LOOP through primitives
  initializeMeshPrimitive(this, options.allowPicking);
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

function initializeMeshPrimitive(scenePrimitive, allowPicking) {
  var pipelineStages = scenePrimitive._pipelineStages;
  if (scenePrimitive._primitive.primitiveType === PrimitiveType.POINTS) {
    pipelineStages.push(PointGeometryPipelineStage);
  } else {
    pipelineStages.push(MeshGeometryPipelineStage);
  }

  if (allowPicking) {
    pipelineStages.push(PickingStage);
  }

  /*
  if (customShader.insertBeforeMaterial) {
    primitive._pipelineStages.push(CustomShaderStage.Before);
  }
  */

  if (hasPbrMaterials(scenePrimitive._primitive)) {
    pipelineStages.push(PBRPipelineStage, IBLPipelineStage);
  } else if (hasTechniques(scenePrimitive._primitive)) {
    pipelineStages.push(TechniquePipelineStage);
  } else {
    throw new Error("only PBR materials and techniques are supported");
  }

  pipelineStages.push(CustomShaderStage.After);

  /*
  if (customShader.insertAfterMaterial) {
    primitive._pipelineStages.push(CustomShaderStage.After);
  }
  */

  pipelineStages.push(LightingPipelineStage);
  // OPTION 2
  /*
  if (hasStyle) {
    pipelineStages.push(CPUStylingStage);
  }
  */

  // TODO: remove this when done
  //pipelineStages.push(SolidColorPipelineStage);
}
