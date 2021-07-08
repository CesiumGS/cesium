import defined from "../Core/defined.js";
import Matrix4 from "../Core/Matrix4.js";

export default function ModelSceneGraph(options) {
  this._modelComponents = options.modelComponents;
  this._pipelineStages = [];

  initialize(this);
}

function initialize(sceneGraph) {
  // Build the scene graph
  
  // Instancing
  // Picking
  // Geometry
  // Metadata Layout
  // Metadata Packing
  // Custom Shaders (Configurable)
  // PBR
  // IBL
  // OR KHR Techniques
}

ModelSceneGraph.prototype.createDrawCommands = function (frameState) {
  // Traverse scene graph
}

function ModelSceneGraphNode() {
  this._modelMatrix = undefined;
  // TODO: Dynamic model matrix should be stored separately
  this._pipelineStages = [];

  initializeNode(this);
}

function initializeNode(node) {
  if (defined(node.instances)) {
    node._pipelineStages.push(InstancingPipelineStage);
  }
}

function ModelSceneGraphMeshPrimitive(mesh) {
  this._pipelineStages = [];

  // LOOP through primitives
  for (var i = 0; i < mesh.primitives.length; i++) {
    initializeMeshPrimitive(this, mesh.primitives[i]);
  }
}

function hasPbrMaterials(mesh) {

}

function hasTechniques(mesh) {

}

/**
 * Interface
 * 
 * TODO: Do we need another one for pipelines
 */
function PrimitivePipelineStage() {

}

PrimitivePipelineStage.process = function(primitive, renderResources) {
  // not implemented
}

function initializeMeshPrimitive(mesh, primitive) {
  primitive._pipelineStages.push(GeometryPipelineStage);

  /*
  if (customShader.insertBeforeMaterial) {
    primitive._pipelineStages.push(CustomShaderStage.Before);
  }
  */

  if (hasPbrMaterials(mesh)) {
    primitive._pipelineStages.push(PBRPipelineStage, IBLPipelineStage);
  } else if (hasTechniques(mesh)) {
    primitive._pipelineStages.push(TechniquePipelineStage);
  } else {
    throw new Error("only PBR materials and techniques are supported");
  }

  /*
  if (customShader.insertAfterMaterial) {
    primitive._pipelineStages.push(CustomShaderStage.After);
  }
  */

  primitive._pipelineStages.push(LightingPipelineStage);
}

/// TODO: Move to Utility
function getNodeTransform(m) {}

// 1. propagate model matrices
// 2. build the pipeline stages as we go
// 3. Build internal representation of nodes
function traverseModelComponents(model, node, modelMatrix) {
  if (!defined(node.children) && !defined(node.primitives)) {
    return;
  }

  // process children recursively
  if (defined(node.children)) {
    for (var i = 0; i < node.children.length; i++) {
      var childNode = node.children[i];
      var childMatrix = Matrix4.multiply(
        modelMatrix,
        getNodeTransform(childNode),
        new Matrix4()
      );

      traverseModelComponents(model, childNode, childMatrix);
    }
  }

  // process this node
  if (defined(node.primitives)) {
    
  }
}