import buildDrawCommands from "./buildDrawCommands.js";
import BoundingSphere from "../../Core/BoundingSphere.js";
import Check from "../../Core/Check.js";
import clone from "../../Core/clone.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import Matrix4 from "../../Core/Matrix4.js";
import ModelColorPipelineStage from "./ModelColorPipelineStage.js";
import ModelExperimentalPrimitive from "./ModelExperimentalPrimitive.js";
import ModelExperimentalNode from "./ModelExperimentalNode.js";
import ModelExperimentalUtility from "./ModelExperimentalUtility.js";
import ModelRenderResources from "./ModelRenderResources.js";
import NodeRenderResources from "./NodeRenderResources.js";
import PrimitiveRenderResources from "./PrimitiveRenderResources.js";
import RenderState from "../../Renderer/RenderState.js";
import ShadowMode from "../ShadowMode.js";

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
   * Update stages to apply across the model.
   *
   * @type {Object[]}
   * @readonly
   *
   * @private
   */
  this._updateStages = [];

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
   * The indices of the root nodes in the runtime nodes array.
   *
   * @type {Number[]}
   * @readonly
   *
   * @private
   */
  this._rootNodes = [];

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
   * Pipeline stages to apply to this model. This
   * is an array of classes, each with a static method called
   * <code>process()</code>
   *
   * @type {Object[]}
   * @readonly
   *
   * @private
   */
  this.modelPipelineStages = [];

  this._boundingSphere = undefined;
  this._computedModelMatrix = Matrix4.clone(this._model.modelMatrix);

  initialize(this);
}

Object.defineProperties(ModelExperimentalSceneGraph.prototype, {
  /**
   * The model components this scene graph represents.
   *
   * @type {ModelComponents}
   * @readonly
   *
   * @private
   */
  components: {
    get: function () {
      return this._modelComponents;
    },
  },

  /**
   * The axis-corrected model matrix.
   *
   * @type {Matrix4}
   * @readonly
   *
   * @private
   */
  computedModelMatrix: {
    get: function () {
      return this._computedModelMatrix;
    },
  },
  /**
   * The bounding sphere containing all the primitives in the scene graph.
   *
   * @type {BoundingSphere}
   * @readonly
   *
   * @private
   */
  boundingSphere: {
    get: function () {
      return this._boundingSphere;
    },
  },
});

function initialize(sceneGraph) {
  const components = sceneGraph._modelComponents;
  const scene = components.scene;
  const model = sceneGraph._model;

  Matrix4.multiplyTransformation(
    model.modelMatrix,
    components.transform,
    sceneGraph._computedModelMatrix
  );

  ModelExperimentalUtility.correctModelMatrix(
    sceneGraph._computedModelMatrix,
    components.upAxis,
    components.forwardAxis
  );

  Matrix4.multiplyByUniformScale(
    sceneGraph._computedModelMatrix,
    model._computedScale,
    sceneGraph._computedModelMatrix
  );

  const rootNodes = scene.nodes;
  for (let i = 0; i < rootNodes.length; i++) {
    const rootNode = scene.nodes[i];

    const rootNodeIndex = traverseSceneGraph(
      sceneGraph,
      rootNode,
      Matrix4.IDENTITY
    );

    sceneGraph._rootNodes.push(rootNodeIndex);
  }
}

/**
 * Recursively traverse through the nodes in the scene graph, using depth-first
 * post-order traversal.
 *
 * @param {ModelSceneGraph} sceneGraph The scene graph
 * @param {ModelComponents.Node} node The current node
 * @param {Matrix4} transformToRoot The computed model space transform of this node's ancestors.
 *
 * @returns {Number} The index of this node in the runtimeNodes array.
 *
 * @private
 */
function traverseSceneGraph(sceneGraph, node, transformToRoot) {
  // The indices of the children of this node in the runtimeNodes array.
  const childrenIndices = [];
  const transform = ModelExperimentalUtility.getNodeTransform(node);

  // Traverse through scene graph.
  let i;
  if (defined(node.children)) {
    for (i = 0; i < node.children.length; i++) {
      const childNode = node.children[i];
      const childNodeTransformToRoot = Matrix4.multiply(
        transformToRoot,
        transform,
        new Matrix4()
      );

      const childIndex = traverseSceneGraph(
        sceneGraph,
        childNode,
        childNodeTransformToRoot
      );
      childrenIndices.push(childIndex);
    }
  }

  // Process node and mesh primitives.
  const runtimeNode = new ModelExperimentalNode({
    node: node,
    transform: transform,
    transformToRoot: transformToRoot,
    children: childrenIndices,
    sceneGraph: sceneGraph,
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

  // The position of the runtime node in the array.
  return sceneGraph._runtimeNodes.length - 1;
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
  const model = this._model;
  const modelRenderResources = new ModelRenderResources(model);

  this.configurePipeline();
  const modelPipelineStages = this.modelPipelineStages;

  let i, j, k;
  for (i = 0; i < modelPipelineStages.length; i++) {
    const modelPipelineStage = modelPipelineStages[i];
    modelPipelineStage.process(modelRenderResources, model, frameState);
  }

  const boundingSpheres = [];
  for (i = 0; i < this._runtimeNodes.length; i++) {
    const runtimeNode = this._runtimeNodes[i];
    runtimeNode.configurePipeline();
    const nodePipelineStages = runtimeNode.pipelineStages;

    const nodeRenderResources = new NodeRenderResources(
      modelRenderResources,
      runtimeNode
    );

    for (j = 0; j < nodePipelineStages.length; j++) {
      const nodePipelineStage = nodePipelineStages[j];

      nodePipelineStage.process(
        nodeRenderResources,
        runtimeNode.node,
        frameState
      );
    }

    for (j = 0; j < runtimeNode.runtimePrimitives.length; j++) {
      const runtimePrimitive = runtimeNode.runtimePrimitives[j];

      runtimePrimitive.configurePipeline();
      const primitivePipelineStages = runtimePrimitive.pipelineStages;

      const primitiveRenderResources = new PrimitiveRenderResources(
        nodeRenderResources,
        runtimePrimitive
      );

      for (k = 0; k < primitivePipelineStages.length; k++) {
        const primitivePipelineStage = primitivePipelineStages[k];

        primitivePipelineStage.process(
          primitiveRenderResources,
          runtimePrimitive.primitive,
          frameState
        );
      }

      runtimePrimitive.boundingSphere = BoundingSphere.clone(
        primitiveRenderResources.boundingSphere
      );

      boundingSpheres.push(runtimePrimitive.boundingSphere);

      const drawCommands = buildDrawCommands(
        primitiveRenderResources,
        frameState
      );

      runtimePrimitive.drawCommands = drawCommands;
    }
  }

  this._boundingSphere = BoundingSphere.fromBoundingSpheres(boundingSpheres);

  BoundingSphere.transform(
    this._boundingSphere,
    model.modelMatrix,
    model._boundingSphere
  );

  model._initialRadius = model._boundingSphere.radius;
  model._boundingSphere.radius *= model._clampedScale;
};

/**
 * Configure the model pipeline stages. If the pipeline needs to be re-run, call
 * this method again to ensure the correct sequence of pipeline stages are
 * used.
 *
 * @private
 */
ModelExperimentalSceneGraph.prototype.configurePipeline = function () {
  const modelPipelineStages = this.modelPipelineStages;
  modelPipelineStages.length = 0;

  const model = this._model;
  if (defined(model.color)) {
    modelPipelineStages.push(ModelColorPipelineStage);
  }
};

ModelExperimentalSceneGraph.prototype.update = function (frameState) {
  let i, j, k;

  for (i = 0; i < this._runtimeNodes.length; i++) {
    const runtimeNode = this._runtimeNodes[i];

    for (j = 0; j < runtimeNode.updateStages.length; j++) {
      const nodeUpdateStage = runtimeNode.updateStages[j];
      nodeUpdateStage.update(runtimeNode, this, frameState);
    }

    for (j = 0; j < runtimeNode.runtimePrimitives.length; j++) {
      const runtimePrimitive = runtimeNode.runtimePrimitives[j];
      for (k = 0; k < runtimePrimitive.updateStages.length; k++) {
        const stage = runtimePrimitive.updateStages[k];
        stage.update(runtimePrimitive);
      }
    }
  }
};

ModelExperimentalSceneGraph.prototype.updateModelMatrix = function () {
  const model = this._model;

  Matrix4.multiplyTransformation(
    model.modelMatrix,
    this._modelComponents.transform,
    this._computedModelMatrix
  );

  ModelExperimentalUtility.correctModelMatrix(
    this._computedModelMatrix,
    this._modelComponents.upAxis,
    this._modelComponents.forwardAxis
  );

  Matrix4.multiplyByUniformScale(
    this._computedModelMatrix,
    model._computedScale,
    this._computedModelMatrix
  );

  const rootNodes = this._rootNodes;
  // update new transforms here
  for (let i = 0; i < rootNodes.length; i++) {
    const node = this._runtimeNodes[rootNodes[i]];
    // mark root nodes dirty here,
    node._transformDirty = true;
    // children will be affected recursively in the update stage

    //node.updateModelMatrix();
  }
};

function forEachRuntimePrimitive(sceneGraph, callback) {
  for (let i = 0; i < sceneGraph._runtimeNodes.length; i++) {
    const runtimeNode = sceneGraph._runtimeNodes[i];
    for (let j = 0; j < runtimeNode.runtimePrimitives.length; j++) {
      const runtimePrimitive = runtimeNode.runtimePrimitives[j];
      callback(runtimePrimitive);
    }
  }
}

/**
 * Traverses through all draw commands and changes the back-face culling setting.
 *
 * @param {Boolean} backFaceCulling The new value for the back-face culling setting.
 *
 * @private
 */
ModelExperimentalSceneGraph.prototype.updateBackFaceCulling = function (
  backFaceCulling
) {
  const model = this._model;
  forEachRuntimePrimitive(this, function (runtimePrimitive) {
    for (let k = 0; k < runtimePrimitive.drawCommands.length; k++) {
      const drawCommand = runtimePrimitive.drawCommands[k];
      const renderState = clone(drawCommand.renderState, true);
      const doubleSided = runtimePrimitive.primitive.material.doubleSided;
      const translucent = defined(model.color) && model.color.alpha < 1.0;
      renderState.cull.enabled =
        backFaceCulling && !doubleSided && !translucent;
      drawCommand.renderState = RenderState.fromCache(renderState);
    }
  });
};

/**
 * Traverses through all draw commands and changes the shadow settings.
 *
 * @param {ShadowMode} shadowMode The new shadow settings.
 *
 * @private
 */
ModelExperimentalSceneGraph.prototype.updateShadows = function (shadowMode) {
  const model = this._model;
  const castShadows = ShadowMode.castShadows(model.shadows);
  const receiveShadows = ShadowMode.receiveShadows(model.shadows);
  forEachRuntimePrimitive(this, function (runtimePrimitive) {
    for (let k = 0; k < runtimePrimitive.drawCommands.length; k++) {
      const drawCommand = runtimePrimitive.drawCommands[k];
      drawCommand.castShadows = castShadows;
      drawCommand.receiveShadows = receiveShadows;
    }
  });
};

/**
 * Returns an array of draw commands, obtained by traversing through the scene graph and collecting
 * the draw commands associated with each primitive.
 *
 * @private
 */
ModelExperimentalSceneGraph.prototype.getDrawCommands = function () {
  const drawCommands = [];
  forEachRuntimePrimitive(this, function (runtimePrimitive) {
    drawCommands.push.apply(drawCommands, runtimePrimitive.drawCommands);
  });
  return drawCommands;
};
