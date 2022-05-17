import buildDrawCommands from "./buildDrawCommands.js";
import BoundingSphere from "../../Core/BoundingSphere.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import Check from "../../Core/Check.js";
import clone from "../../Core/clone.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import ImageBasedLightingPipelineStage from "./ImageBasedLightingPipelineStage.js";
import Matrix4 from "../../Core/Matrix4.js";
import ModelColorPipelineStage from "./ModelColorPipelineStage.js";
import ModelClippingPlanesPipelineStage from "./ModelClippingPlanesPipelineStage.js";
import ModelExperimentalPrimitive from "./ModelExperimentalPrimitive.js";
import ModelExperimentalNode from "./ModelExperimentalNode.js";
import ModelExperimentalSkin from "./ModelExperimentalSkin.js";
import ModelExperimentalUtility from "./ModelExperimentalUtility.js";
import ModelRenderResources from "./ModelRenderResources.js";
import ModelSplitterPipelineStage from "./ModelSplitterPipelineStage.js";
import NodeRenderResources from "./NodeRenderResources.js";
import PrimitiveRenderResources from "./PrimitiveRenderResources.js";
import RenderState from "../../Renderer/RenderState.js";
import ShadowMode from "../ShadowMode.js";
import SplitDirection from "../SplitDirection.js";

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
  const components = options.modelComponents;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.model", options.model);
  Check.typeOf.object("options.modelComponents", components);
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
  this._components = components;

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
   * The indices of the skinned nodes in the runtime nodes array. These refer
   * to the nodes that will be manipulated by their skin, as opposed to the nodes
   * acting as joints for the skin.
   *
   * @type {Number[]}
   * @readonly
   *
   * @private
   */
  this._skinnedNodes = [];

  /**
   * The runtime skins that affect nodes in the scene graph.
   *
   * @type {ModelExperimentalSkin[]}
   * @readonly
   *
   * @private
   */
  this._runtimeSkins = [];

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
  this._computedModelMatrix = Matrix4.clone(Matrix4.IDENTITY);

  this._axisCorrectionMatrix = ModelExperimentalUtility.getAxisCorrectionMatrix(
    components.upAxis,
    components.forwardAxis,
    new Matrix4()
  );

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
      return this._components;
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
   * A matrix to correct from y-up in some model formats (e.g. glTF) to the
   * z-up coordinate system Cesium uses.
   *
   * @type {Matrix4}
   * @readonly
   *
   * @private
   */
  axisCorrectionMatrix: {
    get: function () {
      return this._axisCorrectionMatrix;
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
  const components = sceneGraph._components;
  const scene = components.scene;

  computeModelMatrix(sceneGraph);

  const nodes = components.nodes;
  const nodesLength = nodes.length;

  // Initialize this array to be the same size as the nodes array in the model's file.
  // This is so nodes can be stored by their index in the file, for future ease of access.
  sceneGraph._runtimeNodes = new Array(nodesLength);

  const rootNodes = scene.nodes;
  const rootNodesLength = rootNodes.length;
  const transformToRoot = Matrix4.IDENTITY;
  for (let i = 0; i < rootNodesLength; i++) {
    const rootNode = scene.nodes[i];

    const rootNodeIndex = traverseSceneGraph(
      sceneGraph,
      rootNode,
      transformToRoot
    );

    sceneGraph._rootNodes.push(rootNodeIndex);
  }

  // Handle skins after all runtime nodes are created
  const skins = components.skins;
  const runtimeSkins = sceneGraph._runtimeSkins;

  const skinsLength = skins.length;
  for (let i = 0; i < skinsLength; i++) {
    const skin = skins[i];
    runtimeSkins.push(
      new ModelExperimentalSkin({
        skin: skin,
        sceneGraph: sceneGraph,
      })
    );
  }

  const skinnedNodes = sceneGraph._skinnedNodes;
  const skinnedNodesLength = skinnedNodes.length;
  for (let i = 0; i < skinnedNodesLength; i++) {
    const skinnedNodeIndex = skinnedNodes[i];
    const skinnedNode = sceneGraph._runtimeNodes[skinnedNodeIndex];

    // Use the index of the skin in the model components to find
    // the corresponding runtime skin.
    const skin = nodes[skinnedNodeIndex].skin;
    const skinIndex = skin.index;

    skinnedNode._runtimeSkin = runtimeSkins[skinIndex];
    skinnedNode.updateJointMatrices();
  }
}

function computeModelMatrix(sceneGraph) {
  const components = sceneGraph._components;
  const model = sceneGraph._model;

  sceneGraph._computedModelMatrix = Matrix4.multiplyTransformation(
    model.modelMatrix,
    components.transform,
    sceneGraph._computedModelMatrix
  );

  sceneGraph._computedModelMatrix = Matrix4.multiplyTransformation(
    sceneGraph._computedModelMatrix,
    sceneGraph._axisCorrectionMatrix,
    sceneGraph._computedModelMatrix
  );

  sceneGraph._computedModelMatrix = Matrix4.multiplyByUniformScale(
    sceneGraph._computedModelMatrix,
    model.computedScale,
    sceneGraph._computedModelMatrix
  );
}

/**
 * Recursively traverse through the nodes in the scene graph, using depth-first
 * post-order traversal.
 *
 * @param {ModelSceneGraph} sceneGraph The scene graph
 * @param {ModelComponents.Node} node The current node
 * @param {Matrix4} transformToRoot The transforms of this node's ancestors.
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
  const childrenLength = node.children.length;
  for (let i = 0; i < childrenLength; i++) {
    const childNode = node.children[i];
    const childNodeTransformToRoot = Matrix4.multiplyTransformation(
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

  // Process node and mesh primitives.
  const runtimeNode = new ModelExperimentalNode({
    node: node,
    transform: transform,
    transformToRoot: transformToRoot,
    children: childrenIndices,
    sceneGraph: sceneGraph,
  });

  const primitivesLength = node.primitives.length;
  for (let i = 0; i < primitivesLength; i++) {
    runtimeNode.runtimePrimitives.push(
      new ModelExperimentalPrimitive({
        primitive: node.primitives[i],
        node: node,
        model: sceneGraph._model,
      })
    );
  }

  const index = node.index;
  sceneGraph._runtimeNodes[index] = runtimeNode;
  if (defined(node.skin)) {
    sceneGraph._skinnedNodes.push(index);
  }

  return index;
}

const scratchModelPositionMin = new Cartesian3();
const scratchModelPositionMax = new Cartesian3();
const scratchPrimitivePositionMin = new Cartesian3();
const scratchPrimitivePositionMax = new Cartesian3();
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

  // Reset the memory counts before running the pipeline
  model.statistics.clear();

  this.configurePipeline();
  const modelPipelineStages = this.modelPipelineStages;

  let i, j, k;
  for (i = 0; i < modelPipelineStages.length; i++) {
    const modelPipelineStage = modelPipelineStages[i];
    modelPipelineStage.process(modelRenderResources, model, frameState);
  }

  const modelPositionMin = Cartesian3.fromElements(
    Number.MAX_VALUE,
    Number.MAX_VALUE,
    Number.MAX_VALUE,
    scratchModelPositionMin
  );
  const modelPositionMax = Cartesian3.fromElements(
    -Number.MAX_VALUE,
    -Number.MAX_VALUE,
    -Number.MAX_VALUE,
    scratchModelPositionMax
  );

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

    const nodeTransform = runtimeNode.computedTransform;
    for (j = 0; j < runtimeNode.runtimePrimitives.length; j++) {
      const runtimePrimitive = runtimeNode.runtimePrimitives[j];

      runtimePrimitive.configurePipeline(frameState);
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
        primitiveRenderResources.boundingSphere,
        new BoundingSphere()
      );

      const primitivePositionMin = Matrix4.multiplyByPoint(
        nodeTransform,
        primitiveRenderResources.positionMin,
        scratchPrimitivePositionMin
      );
      const primitivePositionMax = Matrix4.multiplyByPoint(
        nodeTransform,
        primitiveRenderResources.positionMax,
        scratchPrimitivePositionMax
      );

      Cartesian3.minimumByComponent(
        modelPositionMin,
        primitivePositionMin,
        modelPositionMin
      );
      Cartesian3.maximumByComponent(
        modelPositionMax,
        primitivePositionMax,
        modelPositionMax
      );

      const drawCommands = buildDrawCommands(
        primitiveRenderResources,
        frameState
      );

      runtimePrimitive.drawCommands = drawCommands;
    }
  }

  this._boundingSphere = BoundingSphere.fromCornerPoints(
    modelPositionMin,
    modelPositionMax,
    new BoundingSphere()
  );

  this._boundingSphere = BoundingSphere.transformWithoutScale(
    this._boundingSphere,
    this._axisCorrectionMatrix,
    this._boundingSphere
  );

  model._boundingSphere = BoundingSphere.transform(
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

  if (model.imageBasedLighting.enabled) {
    modelPipelineStages.push(ImageBasedLightingPipelineStage);
  }

  if (model.isClippingEnabled()) {
    modelPipelineStages.push(ModelClippingPlanesPipelineStage);
  }

  if (
    defined(model.splitDirection) &&
    model.splitDirection !== SplitDirection.NONE
  ) {
    modelPipelineStages.push(ModelSplitterPipelineStage);
  }
};

ModelExperimentalSceneGraph.prototype.update = function (
  frameState,
  updateForAnimations
) {
  let i, j, k;

  for (i = 0; i < this._runtimeNodes.length; i++) {
    const runtimeNode = this._runtimeNodes[i];

    for (j = 0; j < runtimeNode.updateStages.length; j++) {
      const nodeUpdateStage = runtimeNode.updateStages[j];
      nodeUpdateStage.update(runtimeNode, this, frameState);
    }

    if (updateForAnimations) {
      this.updateJointMatrices();
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
  computeModelMatrix(this);

  // Mark all root nodes as dirty. Any and all children will be
  // affected recursively in the update stage.
  const rootNodes = this._rootNodes;
  for (let i = 0; i < rootNodes.length; i++) {
    const node = this._runtimeNodes[rootNodes[i]];
    node._transformDirty = true;
  }
};

/**
 * Updates the joint matrices for the skins and nodes of the model.
 *
 * @private
 */
ModelExperimentalSceneGraph.prototype.updateJointMatrices = function () {
  const skinnedNodes = this._skinnedNodes;
  const length = skinnedNodes.length;

  for (let i = 0; i < length; i++) {
    const nodeIndex = skinnedNodes[i];
    const runtimeNode = this._runtimeNodes[nodeIndex];
    runtimeNode.updateJointMatrices();
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
