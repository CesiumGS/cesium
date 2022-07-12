import Cartesian3 from "../../Core/Cartesian3.js";
import Check from "../../Core/Check.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import DeveloperError from "../../Core/DeveloperError.js";
import Matrix4 from "../../Core/Matrix4.js";
import InstancingPipelineStage from "./InstancingPipelineStage.js";
import ModelMatrixUpdateStage from "./ModelMatrixUpdateStage.js";
import TranslationRotationScale from "../../Core/TranslationRotationScale.js";
import Quaternion from "../../Core/Quaternion.js";
import NodeStatisticsPipelineStage from "./NodeStatisticsPipelineStage.js";

/**
 * An in-memory representation of a node as part of the {@link ModelExperimentalSceneGraph}.
 *
 * @param {Object} options An object containing the following options:
 * @param {ModelComponents.Node} options.node The corresponding node components from the 3D model.
 * @param {Matrix4} options.transform The transform of this node, excluding transforms from the node's ancestors or children.
 * @param {Matrix4} options.transformToRoot The product of the transforms of all the node's ancestors, excluding the node's own transform.
 * @param {ModelExperimentalSceneGraph} options.sceneGraph The scene graph this node belongs to.
 * @param {Number[]} options.children The indices of the children of this node in the runtime nodes array of the scene graph.
 *
 * @alias ModelExperimentalRuntimeNode
 * @constructor
 *
 * @private
 */
export default function ModelExperimentalRuntimeNode(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  const node = options.node;
  const transform = options.transform;
  const transformToRoot = options.transformToRoot;
  const sceneGraph = options.sceneGraph;
  const children = options.children;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.node", node);
  Check.typeOf.object("options.transform", transform);
  Check.typeOf.object("options.transformToRoot", transformToRoot);
  Check.typeOf.object("options.sceneGraph", sceneGraph);
  Check.typeOf.object("options.children", children);
  //>>includeEnd('debug');

  this._node = node;
  this._name = node.name;
  this._id = node.index;
  this._sceneGraph = sceneGraph;
  this._children = children;

  this._originalTransform = Matrix4.clone(transform, this._originalTransform);
  this._transform = Matrix4.clone(transform, this._transform);
  this._transformToRoot = Matrix4.clone(transformToRoot, this._transformToRoot);

  this._computedTransform = new Matrix4(); // Computed in initialize()
  this._transformDirty = false;

  // Used for animation
  this._transformParameters = undefined;
  this._morphWeights = [];

  // Will be set by the scene graph after the skins have been created
  this._runtimeSkin = undefined;
  this._computedJointMatrices = [];

  /**
   * Whether or not to show this node and its children. This can be toggled
   * by the user through {@link ModelExperimentalNode}.
   *
   * @type {Boolean}
   *
   * @default true
   *
   * @private
   */
  this.show = true;

  /**
   * Whether or not this node is animated by the user. This is set by the
   * corresponding {@link ModelExperimentalNode} when the user supplies their
   * own transform. If this is true, the node will ignore animations in the
   * model's asset.
   *
   * @type {Boolean}
   *
   * @private
   */
  this.userAnimated = false;

  /**
   * Pipeline stages to apply across all the mesh primitives of this node.
   * This is an array of classes, each with a static method called
   * <code>process()</code>.
   *
   * @type {Object[]}
   * @readonly
   *
   * @private
   */
  this.pipelineStages = [];

  /**
   * The mesh primitives that belong to this node.
   *
   * @type {ModelExperimentalRuntimePrimitive[]}
   * @readonly
   *
   * @private
   */
  this.runtimePrimitives = [];

  /**
   * Update stages to apply to this node.
   *
   * @private
   */
  this.updateStages = [];

  /**
   * A buffer containing the instanced transforms projected to 2D world
   * coordinates. Used for rendering in 2D / CV mode. The memory is managed
   * by ModelExperimental; this is just a reference.
   *
   * @type {Buffer}
   * @readonly
   *
   * @private
   */
  this.instancingTransformsBuffer2D = undefined;

  /**
   * A buffer containing the instanced translation values for the node if
   * it is instanced. Used for rendering in 2D / CV mode. The memory is
   * managed by ModelExperimental; this is just a reference.
   *
   * @type {Buffer}
   * @readonly
   *
   * @private
   */
  this.instancingTranslationBuffer2D = undefined;

  initialize(this);
}

Object.defineProperties(ModelExperimentalRuntimeNode.prototype, {
  /**
   * The internal node this runtime node represents.
   *
   * @memberof ModelExperimentalRuntimeNode.prototype
   * @type {ModelComponents.Node}
   * @readonly
   *
   * @private
   */
  node: {
    get: function () {
      return this._node;
    },
  },
  /**
   * The scene graph this node belongs to.
   *
   * @memberof ModelExperimentalRuntimeNode.prototype
   * @type {ModelExperimentalSceneGraph}
   * @readonly
   *
   * @private
   */
  sceneGraph: {
    get: function () {
      return this._sceneGraph;
    },
  },

  /**
   * The indices of the children of this node in the scene graph.
   *
   * @memberof ModelExperimentalRuntimeNode.prototype
   * @type {Number[]}
   * @readonly
   *
   * @private
   */
  children: {
    get: function () {
      return this._children;
    },
  },

  /**
   * The node's local space transform. This can be changed externally via
   * the corresponding ModelExperimentalNode, such that animation can be
   * driven by another source, not just an animation in the model's asset.
   *
   * @memberof ModelExperimentalRuntimeNode.prototype
   * @type {Matrix4}
   *
   * @private
   */
  transform: {
    get: function () {
      return this._transform;
    },
    set: function (value) {
      this._transformDirty = true;
      this._transform = Matrix4.clone(value, this._transform);
    },
  },

  /**
   * The transforms of all the node's ancestors, not including this node's
   * transform.
   *
   * @see ModelExperimentalRuntimeNode#computedTransform
   *
   * @memberof ModelExperimentalRuntimeNode.prototype
   * @type {Matrix4}
   * @readonly
   *
   * @private
   */
  transformToRoot: {
    get: function () {
      return this._transformToRoot;
    },
  },

  /**
   * A transform from the node's local space to the model's scene graph space.
   * This is the product of transformToRoot * transform.
   *
   * @memberof ModelExperimentalRuntimeNode.prototype
   * @type {Matrix4}
   * @readonly
   *
   * @private
   */
  computedTransform: {
    get: function () {
      return this._computedTransform;
    },
  },

  /**
   * The node's original transform, as specified in the model.
   * Does not include transformations from the node's ancestors.
   *
   * @memberof ModelExperimentalRuntimeNode.prototype
   * @type {Matrix4}
   * @readonly
   *
   * @private
   */
  originalTransform: {
    get: function () {
      return this._originalTransform;
    },
  },

  /**
   * The node's local space translation. This is used internally to allow
   * animations in the model's asset to affect the node's properties.
   *
   * If the node's transformation was originally described using a matrix
   * in the model, then this will return undefined.
   *
   * @memberof ModelExperimentalRuntimeNode.prototype
   * @type {Cartesian3}
   *
   * @exception {DeveloperError} The translation of a node cannot be set if it was defined using a matrix in the model's asset.
   *
   * @private
   */
  translation: {
    get: function () {
      return defined(this._transformParameters)
        ? this._transformParameters.translation
        : undefined;
    },
    set: function (value) {
      const transformParameters = this._transformParameters;
      //>>includeStart('debug', pragmas.debug);
      if (!defined(transformParameters)) {
        throw new DeveloperError(
          "The translation of a node cannot be set if it was defined using a matrix in the model."
        );
      }
      //>>includeEnd('debug');

      const currentTranslation = transformParameters.translation;
      if (Cartesian3.equals(currentTranslation, value)) {
        return;
      }

      transformParameters.translation = Cartesian3.clone(
        value,
        transformParameters.translation
      );

      updateTransformFromParameters(this, transformParameters);
    },
  },

  /**
   * The node's local space rotation. This is used internally to allow
   * animations in the model's asset to affect the node's properties.
   *
   * If the node's transformation was originally described using a matrix
   * in the model, then this will return undefined.
   *
   * @memberof ModelExperimentalRuntimeNode.prototype
   * @type {Quaternion}
   *
   * @exception {DeveloperError} The rotation of a node cannot be set if it was defined using a matrix in the model's asset.
   *
   * @private
   */
  rotation: {
    get: function () {
      return defined(this._transformParameters)
        ? this._transformParameters.rotation
        : undefined;
    },
    set: function (value) {
      const transformParameters = this._transformParameters;
      //>>includeStart('debug', pragmas.debug);
      if (!defined(transformParameters)) {
        throw new DeveloperError(
          "The rotation of a node cannot be set if it was defined using a matrix in the model."
        );
      }
      //>>includeEnd('debug');

      const currentRotation = transformParameters.rotation;
      if (Quaternion.equals(currentRotation, value)) {
        return;
      }

      transformParameters.rotation = Quaternion.clone(
        value,
        transformParameters.rotation
      );

      updateTransformFromParameters(this, transformParameters);
    },
  },

  /**
   * The node's local space scale. This is used internally to allow
   * animations in the model's asset to affect the node's properties.
   *
   * If the node's transformation was originally described using a matrix
   * in the model, then this will return undefined.
   *
   * @memberof ModelExperimentalRuntimeNode.prototype
   * @type {Cartesian3}
   *
   * @exception {DeveloperError} The scale of a node cannot be set if it was defined using a matrix in the model's asset.
   * @private
   */
  scale: {
    get: function () {
      return defined(this._transformParameters)
        ? this._transformParameters.scale
        : undefined;
    },
    set: function (value) {
      const transformParameters = this._transformParameters;
      //>>includeStart('debug', pragmas.debug);
      if (!defined(transformParameters)) {
        throw new DeveloperError(
          "The scale of a node cannot be set if it was defined using a matrix in the model."
        );
      }
      //>>includeEnd('debug');
      const currentScale = transformParameters.scale;
      if (Cartesian3.equals(currentScale, value)) {
        return;
      }

      transformParameters.scale = Cartesian3.clone(
        value,
        transformParameters.scale
      );

      updateTransformFromParameters(this, transformParameters);
    },
  },

  /**
   * The node's morph weights. This is used internally to allow animations
   * in the model's asset to affect the node's properties.
   *
   * @memberof ModelExperimentalRuntimeNode.prototype
   * @type {Number[]}
   *
   * @private
   */
  morphWeights: {
    get: function () {
      return this._morphWeights;
    },
    set: function (value) {
      const valueLength = value.length;
      //>>includeStart('debug', pragmas.debug);
      if (this._morphWeights.length !== valueLength) {
        throw new DeveloperError(
          "value must have the same length as the original weights array."
        );
      }
      //>>includeEnd('debug');
      for (let i = 0; i < valueLength; i++) {
        this._morphWeights[i] = value[i];
      }
    },
  },

  /**
   * The skin applied to this node, if it exists.
   *
   * @memberof ModelExperimentalRuntimeNode.prototype
   * @type {ModelExperimentalSkin}
   * @readonly
   *
   * @private
   */
  runtimeSkin: {
    get: function () {
      return this._runtimeSkin;
    },
  },

  /**
   * The computed joint matrices of this node, derived from its skin.
   *
   * @memberof ModelExperimentalRuntimeNode.prototype
   * @type {Matrix4[]}
   * @readonly
   *
   * @private
   */
  computedJointMatrices: {
    get: function () {
      return this._computedJointMatrices;
    },
  },
});

function initialize(runtimeNode) {
  const transform = runtimeNode.transform;
  const transformToRoot = runtimeNode.transformToRoot;
  const computedTransform = runtimeNode._computedTransform;
  runtimeNode._computedTransform = Matrix4.multiply(
    transformToRoot,
    transform,
    computedTransform
  );

  const node = runtimeNode.node;
  if (!defined(node.matrix)) {
    runtimeNode._transformParameters = new TranslationRotationScale(
      node.translation,
      node.rotation,
      node.scale
    );
  }

  if (defined(node.morphWeights)) {
    runtimeNode._morphWeights = node.morphWeights.slice();
  }

  // If this node is affected by an articulation from the AGI_articulations
  // extension, add this node to its list of affected nodes.
  const articulationName = node.articulationName;
  if (defined(articulationName)) {
    const sceneGraph = runtimeNode.sceneGraph;
    const runtimeArticulations = sceneGraph._runtimeArticulations;

    const runtimeArticulation = runtimeArticulations[articulationName];
    if (defined(runtimeArticulation)) {
      runtimeArticulation.runtimeNodes.push(runtimeNode);
    }
  }
}

function updateTransformFromParameters(runtimeNode, transformParameters) {
  runtimeNode._transformDirty = true;

  runtimeNode._transform = Matrix4.fromTranslationRotationScale(
    transformParameters,
    runtimeNode._transform
  );
}

/**
 * Returns the child with the given index.
 *
 * @param {Number} index The index of the child.
 *
 * @returns {ModelExperimentalRuntimeNode}
 *
 * @example
 * // Iterate through all children of a runtime node.
 * for (let i = 0; i < runtimeNode.children.length; i++)
 * {
 *   const childNode = runtimeNode.getChild(i);
 * }
 *
 * @private
 */
ModelExperimentalRuntimeNode.prototype.getChild = function (index) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("index", index);
  if (index < 0 || index >= this.children.length) {
    throw new DeveloperError(
      "index must be greater than or equal to 0 and less than the number of children."
    );
  }
  //>>includeEnd('debug');

  return this.sceneGraph._runtimeNodes[this.children[index]];
};

/**
 * Configure the node pipeline stages. If the pipeline needs to be re-run, call
 * this method again to ensure the correct sequence of pipeline stages are
 * used.
 *
 * @private
 */
ModelExperimentalRuntimeNode.prototype.configurePipeline = function () {
  const node = this.node;
  const pipelineStages = this.pipelineStages;
  pipelineStages.length = 0;
  const updateStages = this.updateStages;
  updateStages.length = 0;

  if (defined(node.instances)) {
    pipelineStages.push(InstancingPipelineStage);
  }

  pipelineStages.push(NodeStatisticsPipelineStage);

  updateStages.push(ModelMatrixUpdateStage);
};

/**
 * Updates the computed transform used for rendering and instancing.
 *
 * @private
 */
ModelExperimentalRuntimeNode.prototype.updateComputedTransform = function () {
  this._computedTransform = Matrix4.multiply(
    this._transformToRoot,
    this._transform,
    this._computedTransform
  );
};

/**
 * Updates the joint matrices for this node, where each matrix is computed as
 * computedJointMatrix = nodeWorldTransform^(-1) * skinJointMatrix.
 *
 * @private
 */
ModelExperimentalRuntimeNode.prototype.updateJointMatrices = function () {
  const runtimeSkin = this._runtimeSkin;
  if (!defined(runtimeSkin)) {
    return;
  }

  runtimeSkin.updateJointMatrices();

  const computedJointMatrices = this._computedJointMatrices;
  const skinJointMatrices = runtimeSkin.jointMatrices;
  const length = skinJointMatrices.length;

  for (let i = 0; i < length; i++) {
    if (!defined(computedJointMatrices[i])) {
      computedJointMatrices[i] = new Matrix4();
    }

    const nodeWorldTransform = Matrix4.multiplyTransformation(
      this.transformToRoot,
      this.transform,
      computedJointMatrices[i]
    );

    const inverseNodeWorldTransform = Matrix4.inverseTransformation(
      nodeWorldTransform,
      computedJointMatrices[i]
    );

    computedJointMatrices[i] = Matrix4.multiplyTransformation(
      inverseNodeWorldTransform,
      skinJointMatrices[i],
      computedJointMatrices[i]
    );
  }
};
