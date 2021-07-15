import defined from "../../Core/defined.js";
import CustomShaderStage from "./CustomShaderStage.js";
import LightingPipelineStage from "./LightingPipelineStage.js";
import MeshGeometryPipelineStage from "./MeshGeometryPipelineStage.js";
import PointGeometryPipelineStage from "./PointGeometryPipelineStage.js";
import PBRPipelineStage from "./PBRPipelineStage.js";
import PickingStage from "./PickingStage.js";
import BatchTextureStage from "./BatchTextureStage.js";
import PrimitiveType from "../../Core/PrimitiveType.js";

export default function ModelSceneMeshPrimitive(options) {
  this._primitive = options.primitive;
  this._pipelineStages = [];

  // LOOP through primitives
  initializeMeshPrimitive(this, options.allowPicking, options.hasFeatures);
}

function TechniquePipelineStage() {}
TechniquePipelineStage.process = function () {};

function hasPbrMaterials(primitive) {
  return defined(primitive.material);
}

function hasTechniques(primitive) {}

function initializeMeshPrimitive(scenePrimitive, allowPicking, hasFeatures) {
  var pipelineStages = scenePrimitive._pipelineStages;
  if (scenePrimitive._primitive.primitiveType === PrimitiveType.POINTS) {
    pipelineStages.push(PointGeometryPipelineStage);
  } else {
    pipelineStages.push(MeshGeometryPipelineStage);
  }

  if (hasFeatures) {
    pipelineStages.push(BatchTextureStage);
  }

  if (allowPicking) {
    pipelineStages.push(PickingStage);
  }

  /*
  if (customShader.insertBeforeMaterial) {
    primitive._pipelineStages.push(CustomShaderStage.Before);
  }
  */

  pipelineStages.push(CustomShaderStage);

  if (hasPbrMaterials(scenePrimitive._primitive)) {
    pipelineStages.push(PBRPipelineStage);
  } else if (hasTechniques(scenePrimitive._primitive)) {
    pipelineStages.push(TechniquePipelineStage);
  } else {
    throw new Error("only PBR materials and techniques are supported");
  }

  //pipelineStages.push(CustomShaderStage);

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
}
