import BoundingSphere from "../../Core/BoundingSphere.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import Check from "../../Core/Check.js";
import Frozen from "../../Core/Frozen.js";
import defined from "../../Core/defined.js";
import Matrix4 from "../../Core/Matrix4.js";
import Transforms from "../../Core/Transforms.js";
import SceneMode from "../SceneMode.js";
import SplitDirection from "../SplitDirection.js";
import TilesetPipelineStage from "./TilesetPipelineStage.js";
import AtmospherePipelineStage from "./AtmospherePipelineStage.js";
import ImageBasedLightingPipelineStage from "./ImageBasedLightingPipelineStage.js";
import ModelArticulation from "./ModelArticulation.js";
import ModelColorPipelineStage from "./ModelColorPipelineStage.js";
import ModelClippingPlanesPipelineStage from "./ModelClippingPlanesPipelineStage.js";
import ModelClippingPolygonsPipelineStage from "./ModelClippingPolygonsPipelineStage.js";
import ModelNode from "./ModelNode.js";
import ModelRuntimeNode from "./ModelRuntimeNode.js";
import ModelRuntimePrimitive from "./ModelRuntimePrimitive.js";
import ModelSkin from "./ModelSkin.js";
import ModelUtility from "./ModelUtility.js";
import ModelRenderResources from "./ModelRenderResources.js";
import ModelSilhouettePipelineStage from "./ModelSilhouettePipelineStage.js";
import ModelSplitterPipelineStage from "./ModelSplitterPipelineStage.js";
import ModelType from "./ModelType.js";
import NodeRenderResources from "./NodeRenderResources.js";
import PrimitiveRenderResources from "./PrimitiveRenderResources.js";
import ModelDrawCommands from "./ModelDrawCommands.js";

/**
 * An in memory representation of the scene graph for a {@link Model}
 *
 * @param {object} options An object containing the following options
 * @param {ModelInstance[]} [options.modelInstances] The API-level model instances
 *
 * @alias ModelSceneGraph
 * @constructor
 *
 * @private
 */
function ModelSceneGraph(options) {
  options = options ?? Frozen.EMPTY_OBJECT;

  /**
   * The model components that represent the contents of the 3D model file.
   *
   * @type {ModelComponents}
   * @readonly
   *
   * @private
   */
  this._components = undefined;

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
   * @type {ModelRuntimeNode[]}
   * @readonly
   *
   * @private
   */
  this._runtimeNodes = [];

  /**
   * The indices of the root nodes in the runtime nodes array.
   *
   * @type {number[]}
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
   * @type {number[]}
   * @readonly
   *
   * @private
   */
  this._skinnedNodes = [];

  /**
   * The runtime skins that affect nodes in the scene graph.
   *
   * @type {ModelSkin[]}
   * @readonly
   *
   * @private
   */
  this._runtimeSkins = [];

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

  this._modelInstances = options.modelInstances ?? [];

  // An un-transformed boundingSphere in world space
  this._rootBoundingSphere = new BoundingSphere();
  this._rootTransform = Matrix4.clone(Matrix4.IDENTITY);

  // The scene graph's bounding sphere is model space, so that
  // the model's bounding sphere can be recomputed when given a
  // new model matrix.
  this._boundingSphere = undefined;

  // The 2D bounding sphere is in world space. This is checked
  // by the draw commands to see if the model is over the IDL,
  // and if so, renders the primitives using extra commands.
  this._projectTo2D = false;
  this._boundingSphere2D = undefined;

  this._computedModelMatrix = Matrix4.clone(Matrix4.IDENTITY);
  this._computedModelMatrix2D = Matrix4.clone(Matrix4.IDENTITY);

  this._axisCorrectionMatrix = Matrix4.clone(Matrix4.IDENTITY);

  // Store articulations from the AGI_articulations extension
  // by name in a dictionary for easy retrieval.
  this._runtimeArticulations = {};
}

Object.defineProperties(ModelSceneGraph.prototype, {
  /**
   * TODO
   */
  projectTo2D: {
    get: function () {
      return this._projectTo2D;
    },
  },

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

  // TODO: Should model.modelMatrix really be stored in this class? Or should it live only at the model level?
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
   * The bounding sphere containing all the primitives in the scene graph
   * in model space.
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

  /**
   * TODO
   */
  rootBoundingSphere: {
    get: function () {
      return this._rootBoundingSphere;
    },
  },

  /**
   * TODO
   */
  rootTransform: {
    get: function () {
      return this._rootTransform;
    },
  },

  modelInstances: {
    get: function () {
      return this._modelInstances;
    },
    set: function (value) {
      this._modelInstancess = value;
    },
  },

  hasInstances: {
    get: function () {
      return this._modelInstances && this._modelInstances.length > 0;
    },
  },
});

// TODO: Doc
ModelSceneGraph.prototype.initialize = function (model, components) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("model", model);
  Check.typeOf.object("modelComponents", components);
  //>>includeEnd('debug');

  this._components = components;

  this._axisCorrectionMatrix = ModelUtility.getAxisCorrectionMatrix(
    components.upAxis,
    components.forwardAxis,
    this._axisCorrectionMatrix,
  );

  this._projectTo2D = model._projectTo2D;
  // TODO: 2DBoundingSphere?

  // If the model has a height reference that modifies the model matrix,
  // it will be accounted for in updateModelMatrix.
  const modelMatrix = model.modelMatrix;
  this._rootTransform = computeRootTransform(this, this._rootTransform);
  this._computedModelMatrix = computeModelMatrix(
    modelMatrix,
    this._rootTransform,
    this._computedModelMatrix,
  );

  const articulations = components.articulations;
  const articulationsLength = articulations.length;

  const runtimeArticulations = this._runtimeArticulations;
  for (let i = 0; i < articulationsLength; i++) {
    const articulation = articulations[i];
    const runtimeArticulation = new ModelArticulation({
      articulation: articulation,
      sceneGraph: this,
    });

    const name = runtimeArticulation.name;
    runtimeArticulations[name] = runtimeArticulation;
  }

  const nodes = components.nodes;
  const nodesLength = nodes.length;

  // Set this array to be the same size as the nodes array in
  // the model file. This is so the node indices remain the same. However,
  // only nodes reachable from the scene's root node will be populated, the
  // rest will be undefined
  this._runtimeNodes.length = nodesLength;

  const scene = components.scene;
  const rootNodes = scene.nodes;
  const rootNodesLength = rootNodes.length;
  const transformToRoot = Matrix4.IDENTITY;
  for (let i = 0; i < rootNodesLength; i++) {
    const rootNode = scene.nodes[i];

    const rootNodeIndex = traverseAndCreateSceneGraph(
      this,
      model,
      rootNode,
      transformToRoot,
    );

    this._rootNodes.push(rootNodeIndex);
  }

  // Handle skins after all runtime nodes are created
  const skins = components.skins;
  const runtimeSkins = this._runtimeSkins;

  const skinsLength = skins.length;
  for (let i = 0; i < skinsLength; i++) {
    const skin = skins[i];
    runtimeSkins.push(
      new ModelSkin({
        skin: skin,
        sceneGraph: this,
      }),
    );
  }

  const skinnedNodes = this._skinnedNodes;
  const skinnedNodesLength = skinnedNodes.length;
  for (let i = 0; i < skinnedNodesLength; i++) {
    const skinnedNodeIndex = skinnedNodes[i];
    const skinnedNode = this._runtimeNodes[skinnedNodeIndex];

    // Use the index of the skin in the model components to find
    // the corresponding runtime skin.
    const skin = nodes[skinnedNodeIndex].skin;
    const skinIndex = skin.index;

    skinnedNode._runtimeSkin = runtimeSkins[skinIndex];
    skinnedNode.updateJointMatrices();
  }

  // Ensure articulations are applied with their initial values to their target nodes.
  this.applyArticulations();
};

/**
 * TODO
 * @param {*} sceneGraph
 * @param {*} result
 * @returns
 */
function computeRootTransform(sceneGraph, result) {
  const components = sceneGraph._components;
  const axisCorrectionMatrix = sceneGraph._axisCorrectionMatrix;

  const transform = Matrix4.multiplyTransformation(
    components.transform,
    axisCorrectionMatrix,
    result,
  );

  return transform;
}

/**
 * TODO
 * @param {Matrix4} modelMatrix
 * @param {Matrix4} rootTransform
 * @param {Matrix4} result
 * @returns {Matrix4}
 */
function computeModelMatrix(modelMatrix, rootTransform, result) {
  // TODO: include model scaling
  // modelMatrix = Matrix4.multiplyByUniformScale(
  //   modelMatrix,
  //   computedModelScale,
  //   result,
  // );

  const transform = Matrix4.multiplyTransformation(
    modelMatrix,
    rootTransform,
    result,
  );

  return transform;
}

const scratchComputedTranslation = new Cartesian3();

function computeModelMatrix2D(sceneGraph, frameState) {
  const computedModelMatrix = sceneGraph._computedModelMatrix;
  const translation = Matrix4.getTranslation(
    computedModelMatrix,
    scratchComputedTranslation,
  );

  if (!Cartesian3.equals(translation, Cartesian3.ZERO)) {
    sceneGraph._computedModelMatrix2D = Transforms.basisTo2D(
      frameState.mapProjection,
      computedModelMatrix,
      sceneGraph._computedModelMatrix2D,
    );
  } else {
    const center = sceneGraph.boundingSphere.center;
    const to2D = Transforms.ellipsoidTo2DModelMatrix(
      frameState.mapProjection,
      center,
      sceneGraph._computedModelMatrix2D,
    );
    sceneGraph._computedModelMatrix2D = Matrix4.multiply(
      to2D,
      computedModelMatrix,
      sceneGraph._computedModelMatrix2D,
    );
  }

  sceneGraph._boundingSphere2D = BoundingSphere.transform(
    sceneGraph._boundingSphere,
    sceneGraph._computedModelMatrix2D,
    sceneGraph._boundingSphere2D,
  );
}

// TODO: A private member function would be cleaner and easier to test.
/**
 * Recursively traverse through the nodes in the scene graph to create
 * their runtime versions, using a post-order depth-first traversal.
 *
 * @param {ModelSceneGraph} sceneGraph The scene graph
 * @param {Model} model The model for which the scene graph applies
 * @param {ModelComponents.Node} node The current node
 * @param {Matrix4} transformToRoot The transforms of this node's ancestors.
 * @returns {number} The index of this node in the runtimeNodes array.
 *
 * @private
 */
function traverseAndCreateSceneGraph(sceneGraph, model, node, transformToRoot) {
  // The indices of the children of this node in the runtimeNodes array.
  const childrenIndices = [];
  const transform = ModelUtility.getNodeTransform(node);

  // Traverse through scene graph.
  const childrenLength = node.children.length;
  for (let i = 0; i < childrenLength; i++) {
    const childNode = node.children[i];
    const childNodeTransformToRoot = Matrix4.multiplyTransformation(
      transformToRoot,
      transform,
      new Matrix4(),
    );

    const childIndex = traverseAndCreateSceneGraph(
      sceneGraph,
      model,
      childNode,
      childNodeTransformToRoot,
    );
    childrenIndices.push(childIndex);
  }

  // Process node and mesh primitives.
  const runtimeNode = new ModelRuntimeNode({
    node: node,
    transform: transform,
    transformToRoot: transformToRoot,
    children: childrenIndices,
    sceneGraph: sceneGraph,
  });

  const primitivesLength = node.primitives.length;
  for (let i = 0; i < primitivesLength; i++) {
    runtimeNode.runtimePrimitives.push(
      new ModelRuntimePrimitive({
        primitive: node.primitives[i],
        node: node,
        model: model,
      }),
    );
  }

  const index = node.index;
  sceneGraph._runtimeNodes[index] = runtimeNode;
  if (defined(node.skin)) {
    sceneGraph._skinnedNodes.push(index);
  }

  // Create and store the public version of the runtime node.
  const name = node.name;
  if (defined(name)) {
    const publicNode = new ModelNode(model, runtimeNode);
    // TODO: Why does `_nodesByName` live on the model and not here?
    model._nodesByName[name] = publicNode;
  }

  return index;
}

const scratchModelPositionMin = new Cartesian3();
const scratchModelPositionMax = new Cartesian3();
const scratchPrimitivePositionMin = new Cartesian3();
const scratchPrimitivePositionMax = new Cartesian3();

/**
 * Generates the {@link ModelDrawCommand} for each primitive in the model.
 * If the model is used for classification, a {@link ClassificationModelDrawCommand}
 * is generated for each primitive instead.
 * @param {Model} model TODO
 * @param {FrameState} frameState The current frame state. This is needed to
 * allocate GPU resources as needed.
 *
 * @private
 */
ModelSceneGraph.prototype.buildDrawCommands = function (model, frameState) {
  const modelRenderResources = this.buildRenderResources(model, frameState);
  this.computeBoundingVolumes(modelRenderResources);
  this.createDrawCommands(modelRenderResources, frameState);
};

/**
 * Generates the {@link ModelRenderResources} for the model.
 *
 * This will traverse the model, nodes and primitives of the scene graph,
 * and perform the following tasks:
 *
 * - configure the pipeline stages by calling `configurePipeline`,
 *   `runtimeNode.configurePipeline`, and `runtimePrimitive.configurePipeline`
 * - create the `ModelRenderResources`, `NodeRenderResources`, and
 *   `PrimitiveRenderResources`
 * - Process the render resources with the respective pipelines
 *
 * @param {FrameState} frameState The current frame state. This is needed to
 * allocate GPU resources as needed.
 * @returns {ModelRenderResources} The model render resources
 *
 * @private
 */
ModelSceneGraph.prototype.buildRenderResources = function (model, frameState) {
  const modelRenderResources = new ModelRenderResources(model);

  // Reset the memory counts before running the pipeline
  model.statistics.clear();

  this.configurePipeline(model, frameState);
  const modelPipelineStages = this.modelPipelineStages;

  for (let i = 0; i < modelPipelineStages.length; i++) {
    const modelPipelineStage = modelPipelineStages[i];
    modelPipelineStage.process(modelRenderResources, model, frameState);
  }

  for (let i = 0; i < this._runtimeNodes.length; i++) {
    const runtimeNode = this._runtimeNodes[i];

    // If a node in the model was unreachable from the scene graph, there will
    // be no corresponding runtime node and therefore should be skipped.
    if (!defined(runtimeNode)) {
      continue;
    }

    // If any transforms are dirty, update them now before using the computed transform
    if (runtimeNode.isComputedTransformDirty) {
      this.updateRuntimeNodeTransforms(
        runtimeNode,
        runtimeNode.transformToRoot,
      );
    }

    runtimeNode.configurePipeline();
    const nodePipelineStages = runtimeNode.pipelineStages;

    const nodeRenderResources = new NodeRenderResources(
      modelRenderResources,
      runtimeNode,
    );
    modelRenderResources.nodeRenderResources[i] = nodeRenderResources;

    for (let j = 0; j < nodePipelineStages.length; j++) {
      const nodePipelineStage = nodePipelineStages[j];

      nodePipelineStage.process(
        nodeRenderResources,
        runtimeNode.node,
        frameState,
      );
    }

    for (let j = 0; j < runtimeNode.runtimePrimitives.length; j++) {
      const runtimePrimitive = runtimeNode.runtimePrimitives[j];

      runtimePrimitive.configurePipeline(frameState);
      const primitivePipelineStages = runtimePrimitive.pipelineStages;

      const primitiveRenderResources = new PrimitiveRenderResources(
        nodeRenderResources,
        runtimePrimitive,
      );
      nodeRenderResources.primitiveRenderResources[j] =
        primitiveRenderResources;

      for (let k = 0; k < primitivePipelineStages.length; k++) {
        const primitivePipelineStage = primitivePipelineStages[k];
        primitivePipelineStage.process(
          primitiveRenderResources,
          runtimePrimitive.primitive,
          frameState,
        );
      }
    }
  }
  return modelRenderResources;
};

/**
 * Computes the bounding volumes for the scene graph and the model.
 *
 * This will traverse the model, nodes and primitives of the scene graph,
 * and compute the bounding volumes. Specifically, it will compute
 *
 * - this._boundingSphere
 * - model._boundingSphere
 *
 * With the latter being modified as of
 *
 * - model._initialRadius = model._boundingSphere.radius;
 * - model._boundingSphere.radius *= model._clampedScale;
 *
 * NOTE: This contains some bugs. See https://github.com/CesiumGS/cesium/issues/12108
 *
 * @param {ModelRenderResources} modelRenderResources The model render resources
 *
 * @private
 */
ModelSceneGraph.prototype.computeBoundingVolumes = function (
  modelRenderResources,
) {
  const scenePositionMin = Cartesian3.fromElements(
    Number.MAX_VALUE,
    Number.MAX_VALUE,
    Number.MAX_VALUE,
    scratchModelPositionMin,
  );
  const scenePositionMax = Cartesian3.fromElements(
    -Number.MAX_VALUE,
    -Number.MAX_VALUE,
    -Number.MAX_VALUE,
    scratchModelPositionMax,
  );

  for (let i = 0; i < this._runtimeNodes.length; i++) {
    const runtimeNode = this._runtimeNodes[i];

    // If a node in the model was unreachable from the scene graph, there will
    // be no corresponding runtime node and therefore should be skipped.
    if (!defined(runtimeNode)) {
      continue;
    }

    const nodeRenderResources = modelRenderResources.nodeRenderResources[i];
    const nodeTransform = runtimeNode.computedTransform;
    for (let j = 0; j < runtimeNode.runtimePrimitives.length; j++) {
      const runtimePrimitive = runtimeNode.runtimePrimitives[j];

      const primitiveRenderResources =
        nodeRenderResources.primitiveRenderResources[j];

      runtimePrimitive.boundingSphere = BoundingSphere.clone(
        primitiveRenderResources.boundingSphere,
        new BoundingSphere(),
      );

      const primitivePositionMin = Matrix4.multiplyByPoint(
        nodeTransform,
        primitiveRenderResources.positionMin,
        scratchPrimitivePositionMin,
      );
      const primitivePositionMax = Matrix4.multiplyByPoint(
        nodeTransform,
        primitiveRenderResources.positionMax,
        scratchPrimitivePositionMax,
      );

      Cartesian3.minimumByComponent(
        scenePositionMin,
        primitivePositionMin,
        scenePositionMin,
      );
      Cartesian3.maximumByComponent(
        scenePositionMax,
        primitivePositionMax,
        scenePositionMax,
      );
    }
  }

  let boundingSphere = this._rootBoundingSphere;
  boundingSphere = BoundingSphere.fromCornerPoints(
    scenePositionMin,
    scenePositionMax,
    boundingSphere,
  );

  boundingSphere = BoundingSphere.transformWithoutScale(
    boundingSphere,
    this._axisCorrectionMatrix,
    boundingSphere,
  );

  boundingSphere = BoundingSphere.transform(
    boundingSphere,
    this._components.transform,
    boundingSphere,
  );

  this._rootBoundingSphere = boundingSphere;
  this._boundingSphere = BoundingSphere.clone(boundingSphere);
};

/**
 * Creates the draw commands for the primitives in the scene graph.
 *
 * This will traverse the model, nodes and primitives of the scene graph,
 * and create the respective draw commands for the primitives, storing
 * them as the `runtimePrimitive.drawCommand`, respectively.
 *
 * @param {ModelRenderResources} modelRenderResources The model render resources
 *
 * @private
 */
ModelSceneGraph.prototype.createDrawCommands = function (
  modelRenderResources,
  frameState,
) {
  for (let i = 0; i < this._runtimeNodes.length; i++) {
    const runtimeNode = this._runtimeNodes[i];

    // If a node in the model was unreachable from the scene graph, there will
    // be no corresponding runtime node and therefore should be skipped.
    if (!defined(runtimeNode)) {
      continue;
    }

    const nodeRenderResources = modelRenderResources.nodeRenderResources[i];

    for (let j = 0; j < runtimeNode.runtimePrimitives.length; j++) {
      const runtimePrimitive = runtimeNode.runtimePrimitives[j];

      const primitiveRenderResources =
        nodeRenderResources.primitiveRenderResources[j];

      const drawCommand = ModelDrawCommands.buildModelDrawCommand(
        primitiveRenderResources,
        frameState,
      );
      runtimePrimitive.drawCommand = drawCommand;
    }
  }
};

/**
 * Configure the model pipeline stages. If the pipeline needs to be re-run, call
 * this method again to ensure the correct sequence of pipeline stages are
 * used.
 * @param {Model} model TODO
 * @param {FrameState} frameState
 * @private
 */
ModelSceneGraph.prototype.configurePipeline = function (model, frameState) {
  const modelPipelineStages = this.modelPipelineStages;
  modelPipelineStages.length = 0;

  const fogRenderable = frameState.fog.enabled && frameState.fog.renderable;

  if (defined(model.color)) {
    modelPipelineStages.push(ModelColorPipelineStage);
  }

  // Skip these pipeline stages for classification models.
  if (defined(model.classificationType)) {
    return;
  }

  if (model.imageBasedLighting.enabled) {
    modelPipelineStages.push(ImageBasedLightingPipelineStage);
  }

  if (model.isClippingEnabled()) {
    modelPipelineStages.push(ModelClippingPlanesPipelineStage);
  }

  if (model.isClippingPolygonsEnabled()) {
    modelPipelineStages.push(ModelClippingPolygonsPipelineStage);
  }

  if (model.hasSilhouette(frameState)) {
    modelPipelineStages.push(ModelSilhouettePipelineStage);
  }

  if (
    defined(model.splitDirection) &&
    model.splitDirection !== SplitDirection.NONE
  ) {
    modelPipelineStages.push(ModelSplitterPipelineStage);
  }

  if (ModelType.is3DTiles(model.type)) {
    modelPipelineStages.push(TilesetPipelineStage);
  }

  if (fogRenderable) {
    modelPipelineStages.push(AtmospherePipelineStage);
  }
};

ModelSceneGraph.prototype.update = function (frameState, updateForAnimations) {
  let i, j, k;

  for (i = 0; i < this._runtimeNodes.length; i++) {
    const runtimeNode = this._runtimeNodes[i];

    // If a node in the model was unreachable from the scene graph, there will
    // be no corresponding runtime node and therefore should be skipped.
    if (!defined(runtimeNode)) {
      continue;
    }

    for (j = 0; j < runtimeNode.updateStages.length; j++) {
      const nodeUpdateStage = runtimeNode.updateStages[j];
      nodeUpdateStage.update(runtimeNode, this, frameState);
    }

    const disableAnimations =
      frameState.mode !== SceneMode.SCENE3D && this._projectTo2D;
    if (updateForAnimations && !disableAnimations) {
      this.updateJointMatrices();
    }

    for (j = 0; j < runtimeNode.runtimePrimitives.length; j++) {
      const runtimePrimitive = runtimeNode.runtimePrimitives[j];
      for (k = 0; k < runtimePrimitive.updateStages.length; k++) {
        const stage = runtimePrimitive.updateStages[k];
        stage.update(runtimePrimitive, this);
      }
    }
  }
};

ModelSceneGraph.prototype.updateModelMatrix = function (
  modelMatrix,
  frameState,
) {
  this._rootTransform = computeRootTransform(this, this._rootTransform);
  this._computedModelMatrix = computeModelMatrix(
    modelMatrix,
    this._rootTransform,
    this._computedModelMatrix,
  );

  if (frameState.mode !== SceneMode.SCENE3D) {
    computeModelMatrix2D(this, frameState);
  }

  // Mark all root nodes as dirty. Any and all children will be
  // affected recursively in ModelMatrixUpdateStage.
  const rootNodes = this._rootNodes;
  for (let i = 0; i < rootNodes.length; i++) {
    const node = this._runtimeNodes[rootNodes[i]];
    // TODO: Is this really the flag that needs to be set? Or is the bounding sphere what is actually dirty
    // drawCommandsDirty?
    node._isComputedTransformDirty = true;
  }
};

/**
 * Recursively updates the <code>transformToRoot</code> and <code>computedTransform</code> properties for each node in the hierarchy, starting at the specified root node.
 * @param {RuntimeNode} runtimeNode The runtime node to update. Children's <code>transformToRoot</code> and <code>computedTransform</code> properties will be recursively updated.
 * @param {Matrix4} transformToRoot The new transform to root to be applied to this node
 */
ModelSceneGraph.prototype.updateRuntimeNodeTransforms = function (
  runtimeNode,
  transformToRoot,
) {
  transformToRoot = runtimeNode.updateComputedTransform(transformToRoot);

  for (const index of runtimeNode.children) {
    const childRuntimeNode = this._runtimeNodes[index];
    this.updateRuntimeNodeTransforms(childRuntimeNode, transformToRoot);
  }
};

/**
 * Updates the joint matrices for the skins and nodes of the model.
 *
 * @private
 */
ModelSceneGraph.prototype.updateJointMatrices = function () {
  const skinnedNodes = this._skinnedNodes;
  const length = skinnedNodes.length;

  for (let i = 0; i < length; i++) {
    const nodeIndex = skinnedNodes[i];
    const runtimeNode = this._runtimeNodes[nodeIndex];
    runtimeNode.updateJointMatrices();
  }
};

/**
 * A callback to be applied once at each runtime primitive in the
 * scene graph
 * @callback traverseSceneGraphCallback
 *
 * @param {ModelRuntimePrimitive} runtimePrimitive The runtime primitive for the current step of the traversal
 * @param {object} [options] A dictionary of additional options to be passed to the callback, or undefined if the callback does not need any additional information.
 *
 * @private
 */

/**
 * Recursively traverse through the runtime nodes in the scene graph
 * using a post-order depth-first traversal to perform a callback on
 * their runtime primitives.
 *
 * @param {ModelSceneGraph} sceneGraph The scene graph.
 * @param {ModelRuntimeNode} runtimeNode The current runtime node.
 * @param {boolean} visibleNodesOnly Whether to only traverse nodes that are visible.
 * @param {traverseSceneGraphCallback} callback The callback to perform on the runtime primitives of the node.
 * @param {object} [callbackOptions] A dictionary of additional options to be passed to the callback, if needed.
 *
 * @private
 */
function traverseSceneGraph(
  sceneGraph,
  runtimeNode,
  visibleNodesOnly,
  callback,
  callbackOptions,
) {
  if (visibleNodesOnly && !runtimeNode.show) {
    return;
  }

  const childrenLength = runtimeNode.children.length;
  for (let i = 0; i < childrenLength; i++) {
    const childRuntimeNode = runtimeNode.getChild(i);
    traverseSceneGraph(
      sceneGraph,
      childRuntimeNode,
      visibleNodesOnly,
      callback,
      callbackOptions,
    );
  }

  const runtimePrimitives = runtimeNode.runtimePrimitives;
  const runtimePrimitivesLength = runtimePrimitives.length;
  for (let j = 0; j < runtimePrimitivesLength; j++) {
    const runtimePrimitive = runtimePrimitives[j];
    callback(runtimePrimitive, callbackOptions);
  }
}

function forEachRuntimePrimitive(
  sceneGraph,
  visibleNodesOnly,
  callback,
  callbackOptions,
) {
  const rootNodes = sceneGraph._rootNodes;
  const rootNodesLength = rootNodes.length;
  for (let i = 0; i < rootNodesLength; i++) {
    const rootNodeIndex = rootNodes[i];
    const runtimeNode = sceneGraph._runtimeNodes[rootNodeIndex];
    traverseSceneGraph(
      sceneGraph,
      runtimeNode,
      visibleNodesOnly,
      callback,
      callbackOptions,
    );
  }
}

const scratchBackFaceCullingOptions = {
  backFaceCulling: undefined,
};

/**
 * Traverses through all draw commands and changes the back-face culling setting.
 *
 * @param {boolean} backFaceCulling The new value for the back-face culling setting.
 *
 * @private
 */
ModelSceneGraph.prototype.updateBackFaceCulling = function (backFaceCulling) {
  const backFaceCullingOptions = scratchBackFaceCullingOptions;
  backFaceCullingOptions.backFaceCulling = backFaceCulling;
  forEachRuntimePrimitive(
    this,
    false,
    updatePrimitiveBackFaceCulling,
    backFaceCullingOptions,
  );
};

// Callback is defined here to avoid allocating a closure in the render loop
function updatePrimitiveBackFaceCulling(runtimePrimitive, options) {
  const drawCommand = runtimePrimitive.drawCommand;
  drawCommand.backFaceCulling = options.backFaceCulling;
}

const scratchShadowOptions = {
  shadowMode: undefined,
};

/**
 * Traverses through all draw commands and changes the shadow settings.
 *
 * @param {ShadowMode} shadowMode The new shadow settings.
 *
 * @private
 */
ModelSceneGraph.prototype.updateShadows = function (shadowMode) {
  const shadowOptions = scratchShadowOptions;
  shadowOptions.shadowMode = shadowMode;
  forEachRuntimePrimitive(this, false, updatePrimitiveShadows, shadowOptions);
};

// Callback is defined here to avoid allocating a closure in the render loop
function updatePrimitiveShadows(runtimePrimitive, options) {
  const drawCommand = runtimePrimitive.drawCommand;
  drawCommand.shadows = options.shadowMode;
}

const scratchShowBoundingVolumeOptions = {
  debugShowBoundingVolume: undefined,
};

/**
 * Traverses through all draw commands and changes whether to show the debug bounding volume.
 *
 * @param {boolean} debugShowBoundingVolume The new value for showing the debug bounding volume.
 *
 * @private
 */
ModelSceneGraph.prototype.updateShowBoundingVolume = function (
  debugShowBoundingVolume,
) {
  const showBoundingVolumeOptions = scratchShowBoundingVolumeOptions;
  showBoundingVolumeOptions.debugShowBoundingVolume = debugShowBoundingVolume;

  forEachRuntimePrimitive(
    this,
    false,
    updatePrimitiveShowBoundingVolume,
    showBoundingVolumeOptions,
  );
};

// Callback is defined here to avoid allocating a closure in the render loop
function updatePrimitiveShowBoundingVolume(runtimePrimitive, options) {
  const drawCommand = runtimePrimitive.drawCommand;
  drawCommand.debugShowBoundingVolume = options.debugShowBoundingVolume;
}

const scratchSilhouetteCommands = [];
const scratchPushDrawCommandOptions = {
  frameState: undefined,
  hasSilhouette: undefined,
};

/**
 * Traverses through the scene graph and pushes the draw commands associated
 * with each primitive to the frame state's command list.
 *
 * @param {FrameState} frameState The frame state.
 *
 * @private
 */
ModelSceneGraph.prototype.pushDrawCommands = function (model, frameState) {
  // If a model has silhouettes, the commands that draw the silhouettes for
  // each primitive can only be invoked after the entire model has drawn.
  // Otherwise, the silhouette may draw on top of the model. This requires
  // gathering the original commands and the silhouette commands separately.
  const silhouetteCommands = scratchSilhouetteCommands;
  silhouetteCommands.length = 0;

  // Since this function is called each frame, the options object is
  // preallocated in a scratch variable
  const pushDrawCommandOptions = scratchPushDrawCommandOptions;
  pushDrawCommandOptions.hasSilhouette = model.hasSilhouette(frameState);
  pushDrawCommandOptions.frameState = frameState;

  forEachRuntimePrimitive(
    this,
    true,
    pushPrimitiveDrawCommands,
    pushDrawCommandOptions,
  );

  frameState.commandList.push.apply(frameState.commandList, silhouetteCommands);
};

// Callback is defined here to avoid allocating a closure in the render loop
function pushPrimitiveDrawCommands(runtimePrimitive, options) {
  const frameState = options.frameState;
  const hasSilhouette = options.hasSilhouette;

  const passes = frameState.passes;
  const silhouetteCommands = scratchSilhouetteCommands;
  const primitiveDrawCommand = runtimePrimitive.drawCommand;
  primitiveDrawCommand.pushCommands(frameState, frameState.commandList);

  // If a model has silhouettes, the commands that draw the silhouettes for
  // each primitive can only be invoked after the entire model has drawn.
  // Otherwise, the silhouette may draw on top of the model. This requires
  // gathering the original commands and the silhouette commands separately.
  if (hasSilhouette && !passes.pick) {
    primitiveDrawCommand.pushSilhouetteCommands(frameState, silhouetteCommands);
  }
}

/**
 * Sets the current value of an articulation stage.
 *
 * @param {string} articulationStageKey The name of the articulation, a space, and the name of the stage.
 * @param {number} value The numeric value of this stage of the articulation.
 *
 * @private
 */
ModelSceneGraph.prototype.setArticulationStage = function (
  articulationStageKey,
  value,
) {
  const names = articulationStageKey.split(" ");
  if (names.length !== 2) {
    return;
  }

  const articulationName = names[0];
  const stageName = names[1];

  const runtimeArticulation = this._runtimeArticulations[articulationName];
  if (defined(runtimeArticulation)) {
    runtimeArticulation.setArticulationStage(stageName, value);
  }
};

/**
 * Applies any modified articulation stages to the matrix of each node that participates
 * in any articulation.  Note that this will overwrite any nodeTransformations on participating nodes.
 *
 * @private
 */
ModelSceneGraph.prototype.applyArticulations = function () {
  const runtimeArticulations = this._runtimeArticulations;
  for (const articulationName in runtimeArticulations) {
    if (runtimeArticulations.hasOwnProperty(articulationName)) {
      const articulation = runtimeArticulations[articulationName];
      articulation.apply();
    }
  }
};

export default ModelSceneGraph;
