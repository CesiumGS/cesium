import Axis from "../../Scene/Axis.js";
import buildDrawCommand from "./buildDrawCommand.js";
import Check from "../../Core/Check.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import Matrix4 from "../../Core/Matrix4.js";
import ModelExperimentalSceneMeshPrimitive from "./ModelExperimentalSceneMeshPrimitive.js";
import ModelExperimentalSceneNode from "./ModelExperimentalSceneNode.js";
import ModelExperimentalUtility from "./ModelExperimentalUtility.js";
import RenderResources from "./RenderResources.js";

/**
 * An in memory representation of the scene graph for a {@link ModelExperimental}
 *
 * @param {Object} options An object containing the following options
 * @param {ModelExperimental} options.model The model this scene graph belongs to
 * @param {ModelComponents} options.modelComponents The model components describing the model
 * @param {Axis} [options.upAxis=Axis.Y] The upwards direction of the 3D model
 * @param {Axis} [options.forwardAxis=Axis.Z] The forwards direction of the 3D model
 *
 * @private
 */
export default function ModelExperimentalSceneGraph(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.model", options.model);
  Check.typeOf.object("options.modelComponents", options.modelComponents);
  //>>includeEnd('debug');

  /**
   * A reference to the {@link ModelExperimental} that owns this scene graph.
   *
   * @type {ModelExperimental}
   * @readonly
   *
   * @private
   */
  this._model = options.model;

  /**
   * The model components that represent the contents of the 3D model file.
   *
   * @type {ModelComponents}
   * @readonly
   *
   * @private
   */
  this._modelComponents = options.modelComponents;

  /**
   * Pipeline stages to apply across the model.
   *
   * @type {Object[]}
   * @readonly
   *
   * @private
   */
  this._pipelineStages = [];

  /**
   * The scene nodes that make up the scene graph
   *
   * @type {ModelExperimentalSceneNode[]}
   * @readonly
   *
   * @private
   */
  this._sceneNodes = [];

  /**
   * Once computed, the {@link DrawCommand}s that are used to render this
   * scene graph are stored here.
   *
   * @type {DrawCommand[]}
   * @readonly
   *
   * @private
   */
  this._drawCommands = [];

  /**
   * The up direction of the model. It will be used to compute a matrix
   * to orient models so Z is upwards
   *
   * @type {Axis}
   * @readonly
   *
   * @private
   */
  this._upAxis = defaultValue(options.upAxis, Axis.Y);
  /**
   * The forward direction of the model. It will be used to compute a matrix
   * to orient models so X is forwards.
   *
   * @type {Axis}
   * @readonly
   *
   * @private
   */
  this._forwardAxis = defaultValue(options.forwardAxis, Axis.Z);

  /**
   * The 4x4 transformation matrix that transforms the model from model to world coordinates.
   * When this is the identity matrix, the model is drawn in world coordinates, i.e., Earth's WGS84 coordinates.
   * Local reference frames can be used by providing a different transformation matrix, like that returned
   * by {@link Transforms.eastNorthUpToFixedFrame}.
   *
   * @type {Matrix4}
   *
   * @default {@link Matrix4.IDENTITY}
   *
   * @example
   * var origin = Cesium.Cartesian3.fromDegrees(-95.0, 40.0, 200000.0);
   * m.modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(origin);
   */
  this.modelMatrix = Matrix4.clone(
    defaultValue(options.modelMatrix, Matrix4.IDENTITY)
  );

  initialize(this);
}

function initialize(sceneGraph) {
  var modelMatrix = sceneGraph.modelMatrix;

  ModelExperimentalUtility.correctModelMatrix(
    modelMatrix,
    sceneGraph._upAxis,
    sceneGraph._forwardAxis
  );

  var rootNodes = sceneGraph._modelComponents.scene.nodes;
  for (var i = 0; i < rootNodes.length; i++) {
    var rootNode = sceneGraph._modelComponents.scene.nodes[i];
    var rootNodeModelMatrix = Matrix4.multiply(
      modelMatrix,
      ModelExperimentalUtility.getNodeTransform(rootNode),
      new Matrix4()
    );

    traverseSceneGraph(sceneGraph, rootNode, rootNodeModelMatrix);
  }
}

/**
 * Recursively traverse through the nodes in the scene graph, using depth-first
 * post-order traversal.
 *
 * @param {ModelSceneGraph} sceneGraph The scene graph
 * @param {ModelComponents.Node} node The current node
 * @param {Matrix4} modelMatrix The current computed model matrix for this node.
 *
 * @private
 */
function traverseSceneGraph(sceneGraph, node, modelMatrix) {
  // No processing needs to happen if node has no children and no mesh primitives.
  if (!defined(node.children) && !defined(node.primitives)) {
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

  // Process node and mesh primitives.
  var sceneNode = new ModelExperimentalSceneNode({
    node: node,
    modelMatrix: modelMatrix,
  });

  if (defined(node.primitives)) {
    for (i = 0; i < node.primitives.length; i++) {
      sceneNode.sceneMeshPrimitives.push(
        new ModelExperimentalSceneMeshPrimitive({
          primitive: node.primitives[i],
          model: sceneGraph._model,
        })
      );
    }
  }

  sceneGraph._sceneNodes.push(sceneNode);
}

/**
 * Generates the draw commands for each primitive in the model.
 *
 * @param {FrameState} frameState The current frame state. This is needed to
 * allocate GPU resources as needed.
 *
 * @private
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

    for (j = 0; j < sceneNode.sceneMeshPrimitives.length; j++) {
      var sceneMeshPrimitive = sceneNode.sceneMeshPrimitives[j];

      var meshPrimitiveRenderResources = new RenderResources.MeshPrimitiveRenderResources(
        nodeRenderResources,
        sceneMeshPrimitive
      );

      for (k = 0; k < sceneMeshPrimitive.pipelineStages.length; k++) {
        var primitivePipelineStage = sceneMeshPrimitive.pipelineStages[k];

        primitivePipelineStage.process(
          meshPrimitiveRenderResources,
          sceneMeshPrimitive.primitive
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
