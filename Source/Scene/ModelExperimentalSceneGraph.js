import defined from "../Core/defined.js";
import Matrix4 from "../Core/Matrix4.js";
import ModelExperimentalSceneMeshPrimitive from "./ModelExperimentalSceneMeshPrimitive.js";
import ModelExperimentalSceneNode from "./ModelExperimentalSceneNode.js";
import ModelExperimentalUtility from "./ModelExperimentalUtility.js";
import buildDrawCommand from "./buildDrawCommand.js";
import defaultValue from "../Core/defaultValue.js";
import RenderResources from "./RenderResources.js";
import Axis from "../Scene/Axis.js";

export default function ModelExperimentalSceneGraph(options) {
  /**
   * @type {ModelExperimental}
   */
  this._model = options.model;

  /**
   * @type {ModelComponents}
   */
  this._modelComponents = options.modelComponents;

  /**
   * Pipeline stages to apply across the model.
   */
  this._pipelineStages = [];

  /**
   * @type {ModelExperimentalSceneNode[]}
   */
  this._sceneNodes = [];

  /**
   * @type {DrawCommand[]}
   */
  this._drawCommands = [];

  this._upAxis = defaultValue(options.upAxis, Axis.Y);
  this._forwardAxis = defaultValue(options.forwardAxis, Axis.Z);

  initialize(this);
}

function initialize(sceneGraph) {
  var modelMatrix = sceneGraph._model.modelMatrix;

  ModelExperimentalUtility.correctModelMatrix(
    modelMatrix,
    sceneGraph._upAxis,
    sceneGraph._forwardAxis
  );

  var rootNode = sceneGraph._modelComponents.scene.nodes[0];
  var rootNodeModelMatrix = Matrix4.multiply(
    modelMatrix,
    ModelExperimentalUtility.getNodeTransform(rootNode),
    new Matrix4()
  );

  traverseSceneGraph(sceneGraph, rootNode, rootNodeModelMatrix);
}

/**
 * Recursively traverse through the nodes in the glTF scene graph, using depth-first
 * post-order traversal.
 *
 * @param {ModelSceneGraph} sceneGraph
 * @param {ModelComponents.Node} node
 * @param {Matrix4} modelMatrix
 * @returns
 */
function traverseSceneGraph(sceneGraph, node, modelMatrix) {
  // No processing needs to happen if node has no children and no mesh primitives.
  if (!defined(node.children) && !defined(node.primitves)) {
    return;
  }

  // Traverse through scene graph.
  var i;
  if (defined(node.children)) {
    for (i = 0; i < node.children.length; i++) {
      var childNode = node.children[i];
      var childNodeModelMatrix = Matrix4.multiply(
        modelMatrix,
        ModelExperimentalUtility.getNodeTransform(childNode),
        new Matrix4()
      );

      traverseSceneGraph(sceneGraph, childNode, childNodeModelMatrix);
    }
  }

  // Process node and mesh primtives.
  var sceneNode = new ModelExperimentalSceneNode({
    node: node,
    modelMatrix: modelMatrix,
  });

  if (defined(node.primitives)) {
    for (i = 0; i < node.primitives.length; i++) {
      sceneNode._sceneMeshPrimitives.push(
        new ModelExperimentalSceneMeshPrimitive({
          primitive: node.primitives[i],
        })
      );
    }
  }

  sceneGraph._sceneNodes.push(sceneNode);
}

/**
 * Generates the draw commands for each primitive in the model.
 *
 * @param {FrameState} frameState
 */
ModelExperimentalSceneGraph.prototype.buildDrawCommands = function (
  frameState
) {
  var modelRenderResources = new RenderResources.ModelRenderResources(
    this._model
  );

  var i, j, k;
  for (i = 0; i < this._sceneNodes.length; i++) {
    var sceneNode = this._sceneNodes[i];

    var nodeRenderResources = new RenderResources.NodeRenderResources(
      modelRenderResources,
      sceneNode
    );

    for (j = 0; j < sceneNode._sceneMeshPrimitives.length; j++) {
      var sceneMeshPrimitive = sceneNode._sceneMeshPrimitives[j];

      var meshPrimitiveRenderResources = new RenderResources.MeshPrimitiveRenderResources(
        nodeRenderResources,
        sceneMeshPrimitive
      );

      for (k = 0; k < sceneMeshPrimitive._pipelineStages.length; k++) {
        var primitivePipelineStage = sceneMeshPrimitive._pipelineStages[i];

        primitivePipelineStage.process(
          meshPrimitiveRenderResources,
          sceneMeshPrimitive._primitive
        );
      }

      var drawCommand = buildDrawCommand(
        meshPrimitiveRenderResources,
        frameState
      );
      this._drawCommands.push(drawCommand);
    }
  }
};
