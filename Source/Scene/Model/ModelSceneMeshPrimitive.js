import defined from "../../Core/defined.js";
import CustomShaderStage from "./CustomShaderStage.js";
import LightingPipelineStage from "./LightingPipelineStage.js";
import MeshGeometryPipelineStage from "./MeshGeometryPipelineStage.js";
import PointGeometryPipelineStage from "./PointGeometryPipelineStage.js";
//import PBRPipelineStage from "./PBRPipelineStage.js";
import PickingStage from "./PickingStage.js";
import BatchTextureStage from "./BatchTextureStage.js";
import PrimitiveType from "../../Core/PrimitiveType.js";
import CullingStage from "./CullingStage.js";

export default function ModelSceneMeshPrimitive(options) {
  this._primitive = options.primitive;
  this._pipelineStages = [];

  // Loop through primitives
  initializeMeshPrimitive(
    this,
    options.allowPicking,
    options.hasFeatures,
    options.hasCustomShader
  );
}

function TechniquePipelineStage() {}
TechniquePipelineStage.process = function () {};

function hasPbrMaterials(primitive) {
  return defined(primitive.material);
}

function hasTechniques(primitive) {}

function initializeMeshPrimitive(
  scenePrimitive,
  allowPicking,
  hasFeatures,
  hasCustomShader
) {
  var pipelineStages = scenePrimitive._pipelineStages;
  if (scenePrimitive._primitive.primitiveType === PrimitiveType.POINTS) {
    pipelineStages.push(PointGeometryPipelineStage);
  } else {
    pipelineStages.push(MeshGeometryPipelineStage);
  }

  pipelineStages.push(CullingStage);

  if (hasFeatures) {
    pipelineStages.push(BatchTextureStage);
  }

  if (allowPicking) {
    pipelineStages.push(PickingStage);
  }

  if (hasCustomShader) {
    pipelineStages.push(CustomShaderStage);
  }

  if (hasPbrMaterials(scenePrimitive._primitive)) {
    // TODO: Handle materials without textures or texcoords
    //pipelineStages.push(PBRPipelineStage);
  } else if (hasTechniques(scenePrimitive._primitive)) {
    pipelineStages.push(TechniquePipelineStage);
  } else {
    throw new Error("only PBR materials and techniques are supported");
  }

  pipelineStages.push(LightingPipelineStage);
}
