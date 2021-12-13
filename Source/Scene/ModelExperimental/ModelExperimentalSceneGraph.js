import buildDrawCommands from "./buildDrawCommands.js";
import BoundingSphere from "../../Core/BoundingSphere.js";
import Check from "../../Core/Check.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import Matrix4 from "../../Core/Matrix4.js";
import CustomShaderPipelineStage from "./CustomShaderPipelineStage.js";
import LightingPipelineStage from "./LightingPipelineStage.js";
import ModelColorPipelineStage from "./ModelColorPipelineStage.js";
import ModelExperimentalPrimitive from "./ModelExperimentalPrimitive.js";
import ModelExperimentalNode from "./ModelExperimentalNode.js";
import ModelExperimentalUtility from "./ModelExperimentalUtility.js";
import ModelRenderResources from "./ModelRenderResources.js";
import NodeRenderResources from "./NodeRenderResources.js";
import PrimitiveRenderResources from "./PrimitiveRenderResources.js";

/**
 * An in memory representation of the scene graph for a {@link ModelExperimental}
 *
 * @param {Object} options An object containing the following options
 * @param {ModelExperimental} options.model The model this scene graph belongs to
 * @param {ModelComponents} options.modelComponents The model components describing the model
 *
 * @alias ModelExperimentalSceneGraph
 * @constructor
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
   * The runtime nodes that make up the scene graph
   *
   * @type {ModelExperimentalNode[]}
   * @readonly
   *
   * @private
   */
  this._runtimeNodes = [];

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
   * The bounding sphere containing all the primitives in the scene graph.
   *
   * @type {BoundingSphere}
   * @readonly
   *
   * @private
   */
  this._boundingSphere = undefined;

  /**
   * The array of bounding spheres of all the primitives in the scene graph.
   *
   * @type {BoundingSphere[]}
   * @readonly
   *
   * @private
   */
  this._boundingSpheres = [];

  initialize(this);
}

function initialize(sceneGraph) {
  var modelMatrix = Matrix4.clone(sceneGraph._model.modelMatrix);
  var scene = sceneGraph._modelComponents.scene;

  ModelExperimentalUtility.correctModelMatrix(
    modelMatrix,
    scene.upAxis,
    scene.forwardAxis
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
  var runtimeNode = new ModelExperimentalNode({
    node: node,
    modelMatrix: modelMatrix,
  });

  if (defined(node.primitives)) {
    for (i = 0; i < node.primitives.length; i++) {
      runtimeNode.runtimePrimitives.push(
        new ModelExperimentalPrimitive({
          primitive: node.primitives[i],
          node: node,
          model: sceneGraph._model,
        })
      );
    }
  }

  sceneGraph._runtimeNodes.push(runtimeNode);
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
  var modelRenderResources = new ModelRenderResources(this._model);

  var modelPipelineStages = [];
  var model = this._model;
  if (defined(model.color)) {
    modelPipelineStages.push(ModelColorPipelineStage);
  }

  var i, j, k;
  for (i = 0; i < modelPipelineStages.length; i++) {
    var modelPipelineStage = modelPipelineStages[i];
    modelPipelineStage.process(modelRenderResources, model, frameState);
  }

  for (i = 0; i < this._runtimeNodes.length; i++) {
    var runtimeNode = this._runtimeNodes[i];

    var nodeRenderResources = new NodeRenderResources(
      modelRenderResources,
      runtimeNode
    );

    for (j = 0; j < runtimeNode.pipelineStages.length; j++) {
      var nodePipelineStage = runtimeNode.pipelineStages[j];

      nodePipelineStage.process(
        nodeRenderResources,
        runtimeNode.node,
        frameState
      );
    }

    for (j = 0; j < runtimeNode.runtimePrimitives.length; j++) {
      var runtimePrimitive = runtimeNode.runtimePrimitives[j];

      // The pipeline stage array is copied because we don't want dynamic stages to be added to the primitive's default stages.
      var primitivePipelineStages = runtimePrimitive.pipelineStages.slice();

      if (defined(model.customShader)) {
        // The custom shader stage needs to go before the lighting stage.
        var lightingStageIndex = primitivePipelineStages.indexOf(
          LightingPipelineStage
        );
        primitivePipelineStages.splice(
          lightingStageIndex,
          0,
          CustomShaderPipelineStage
        );
      }

      var primitiveRenderResources = new PrimitiveRenderResources(
        nodeRenderResources,
        runtimePrimitive
      );

      for (k = 0; k < primitivePipelineStages.length; k++) {
        var primitivePipelineStage = primitivePipelineStages[k];

        primitivePipelineStage.process(
          primitiveRenderResources,
          runtimePrimitive.primitive,
          frameState
        );
      }

      this._boundingSpheres.push(primitiveRenderResources.boundingSphere);

      var drawCommands = buildDrawCommands(
        primitiveRenderResources,
        frameState
      );
      this._drawCommands.push.apply(this._drawCommands, drawCommands);
    }
  }
  this._boundingSphere = BoundingSphere.fromBoundingSpheres(
    this._boundingSpheres
  );
};
