import defined from "../Core/defined.js";
import Matrix4 from "../Core/Matrix4";
import ModelExperimentalSceneMeshPrimitive from "./ModelExperimentalSceneMeshPrimitive.js";
import ModelExperimentalSceneNode from "./ModelExperimentalSceneNode.js";
import ModelExperimentalUtility from "./ModelExperimentalUtility";
import VertexArray from "../Renderer/VertexArray.js";
import DrawCommand from "../Renderer/DrawCommand.js";
import Pass from "../Renderer/Pass.js";
import RenderResources from "./RenderResources.js";
import Axis from "../Scene/Axis.js";
import RenderState from "../Renderer/RenderState.js";

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

  initialize(this);

  initialize(this);
}

function initialize(sceneGraph) {
  var rootNode = sceneGraph._modelComponents.scene.nodes[0];
  var modelMatrix = Matrix4.multiply(
    sceneGraph._model.modelMatrix,
    ModelExperimentalUtility.getNodeTransform(rootNode),
    new Matrix4()
  );

  Matrix4.multiplyTransformation(modelMatrix, Axis.Y_UP_TO_Z_UP, modelMatrix);

  traverseSceneGraph(sceneGraph, rootNode, modelMatrix);
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
  var sceneNode = new ModelExperimentalSceneNode();

  if (defined(node.primitives)) {
    for (i = 0; i < node.primitives.length; i++) {
      sceneNode.scenePrimitives.push(
        new ModelExperimentalSceneMeshPrimitive({
          primitive: node.primitives[i],
        })
      );
    }
  }
}

/**
 * Generates the draw commands for each primitive in the model.
 *
 * @param {FrameState} frameState
 */
ModelExperimentalSceneGraph.prototype.generateDrawCommands = function (
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

/**
 * Builds a DrawCommand for a glTF mesh primitive using its render resources.
 *
 * @param {RenderResources.MeshRenderResources} meshPrimitiveRenderResources
 * @param {FrameState} frameState
 * @returns {DrawCommand} The generated DrawCommand.
 */
function buildDrawCommand(meshPrimitiveRenderResources, frameState) {
  var shaderBuilder = meshPrimitiveRenderResources.shaderBuilder;
  shaderBuilder.addVertexLines([
    "void main()",
    "{",
    "    vec3 position = a_position;",
    "    gl_Position = czm_modelViewProjection * vec4(position, 1.0);",
    "}",
  ]);
  shaderBuilder.addFragmentLines([
    "void main()",
    "{",
    "    vec4 color = vec4(0.0, 0.0, 1.0, 1.0);",
    "    gl_FragColor = color;",
    "}",
  ]);

  var vertexArray = new VertexArray({
    context: frameState.context,
    indexBuffer: meshPrimitiveRenderResources.indices.buffer,
    attributes: meshPrimitiveRenderResources.attributes,
  });

  var renderState = RenderState.fromCache(
    meshPrimitiveRenderResources.renderStateOptions
  );

  var shaderProgram = shaderBuilder.buildShaderProgram(frameState.context);

  return new DrawCommand({
    boundingVolume: meshPrimitiveRenderResources.boundingSphere,
    modelMatrix: meshPrimitiveRenderResources.modelMatrix,
    uniformMap: meshPrimitiveRenderResources.uniformMap,
    renderState: renderState,
    vertexArray: vertexArray,
    shaderProgram: shaderProgram,
    cull: false,
    pass: Pass.OPAQUE,
    count: meshPrimitiveRenderResources.count,
    pickId: undefined,
    instanceCount: 0,
    primitiveType: meshPrimitiveRenderResources.primitiveType,
    debugShowBoundingVolume: true,
  });
}
