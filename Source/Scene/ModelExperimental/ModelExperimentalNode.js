import Cartesian3 from "../../Core/Cartesian3.js";
import Check from "../../Core/Check.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import DeveloperError from "../../Core/DeveloperError.js";
import Matrix4 from "../../Core/Matrix4.js";
import InstancingPipelineStage from "./InstancingPipelineStage.js";
import ModelMatrixUpdateStage from "./ModelMatrixUpdateStage.js";
import ModelExperimentalUtility from "./ModelExperimentalUtility.js";
import TranslationRotationScale from "../../Core/TranslationRotationScale.js";
import Quaternion from "../../Core/Quaternion.js";

/**
 * An in-memory representation of a node as part of the {@link ModelExperimentalSceneGraph}.
 *
 *
 * @param {Object} options An object containing the following options:
 * @param {ModelComponents.Node} options.node The corresponding node components from the 3D model
 * @param {Matrix4} options.transform The transform of this node, excluding transforms from the node's ancestors or children.
 * @param {Matrix4} options.transformToRoot The product of the transforms of all the node's ancestors, excluding the node's own transform.
 * @param {ModelExperimentalSceneGraph} options.sceneGraph The scene graph this node belongs to.
 * @param {Number[]} options.children The indices of the children of this node in the runtime nodes array of the scene graph.
 *
 * @alias ModelExperimentalNode
 * @constructor
 *
 * @private
 */
export default function ModelExperimentalNode(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.node", options.node);
  Check.typeOf.object("options.transform", options.transform);
  Check.typeOf.object("options.transformToRoot", options.transformToRoot);
  Check.typeOf.object("options.sceneGraph", options.sceneGraph);
  Check.typeOf.object("options.children", options.children);
  //>>includeEnd('debug');

  const sceneGraph = options.sceneGraph;
  const transform = options.transform;
  const transformToRoot = options.transformToRoot;
  const node = options.node;

  this._sceneGraph = sceneGraph;
  this._children = options.children;
  this._node = node;

  this._name = node.name; // Helps with debugging

  this._originalTransform = Matrix4.clone(transform, this._originalTransform);
  this._transform = Matrix4.clone(transform, this._transform);
  this._transformToRoot = Matrix4.clone(transformToRoot, this._transformToRoot);

  const hasMatrix = defined(node.matrix);
  this._transformParameters = hasMatrix
    ? undefined
    : new TranslationRotationScale(node.translation, node.rotation, node.scale);

  this._originalTransform = Matrix4.clone(transform, this._originalTransform);
  const computedTransform = Matrix4.multiply(
    transformToRoot,
    transform,
    new Matrix4()
  );
  this._computedTransform = computedTransform;
  this._transformDirty = false;

  // Will be set by the scene graph after the skins have been created
  this._runtimeSkin = undefined;
  this._computedJointMatrices = [];

  /**
   * Pipeline stages to apply across all the mesh primitives of this node. This
   * is an array of classes, each with a static method called
   * <code>process()</code>
   *
   * @type {Object[]}
   * @readonly
   *
   * @private
   */
  this.pipelineStages = [];

  /**
   * The mesh primitives that belong to this node
   *
   * @type {ModelExperimentalPrimitive[]}
   * @readonly
   *
   * @private
   */
  this.runtimePrimitives = [];

  /**
   * Update stages to apply to this primitive.
   *
   * @private
   */
  this.updateStages = [];

  this.configurePipeline();
}

Object.defineProperties(ModelExperimentalNode.prototype, {
  /**
   * The internal node this runtime node represents.
   *
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
   * @type {Number[]}
   * @readonly
   */
  children: {
    get: function () {
      return this._children;
    },
  },

  /**
   * The node's local space transform. This can be changed externally so animation
   * can be driven by another source, not just an animation in the model's asset.
   * <p>
   * For changes to take effect, this property must be assigned to;
   * setting individual elements of the matrix will not work.
   * </p>
   *
   * @memberof ModelExperimentalNode.prototype
   * @type {Matrix4}
   */
  transform: {
    get: function () {
      return this._transform;
    },
    set: function (value) {
      if (Matrix4.equals(this._transform, value)) {
        return;
      }
      this._transformDirty = true;
      this._transform = Matrix4.clone(value, this._transform);
    },
  },

  /**
   * The transforms of all the node's ancestors, not including this node's
   * transform.
   *
   * @see ModelExperimentalNode#computedTransform
   *
   * @memberof ModelExperimentalNode.prototype
   * @type {Matrix4}
   * @readonly
   */
  transformToRoot: {
    get: function () {
      return this._transformToRoot;
    },
  },

  /**
   * The node's local space translation. This is used internally to allow
   * animations in the model's asset to affect the node's properties.
   *
   * @memberof ModelExperimentalNode.prototype
   * @type {Cartesian3}
   *
   * @private
   */
  translation: {
    get: function () {
      return this._transformParameters.translation;
    },
    set: function (value) {
      // TODO: should there be checks here to see if transformParameters is
      // defined? because this is private API that only animation should be
      // using, and it might be a performance hit to do checks every frame?
      const transformParameters = this._transformParameters;
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
   * @memberof ModelExperimentalNode.prototype
   * @type {Quaternion}
   *
   * @private
   */
  rotation: {
    get: function () {
      return this._transformParameters.rotation;
    },
    set: function (value) {
      const transformParameters = this._transformParameters;
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
   * @memberof ModelExperimentalNode.prototype
   * @type {Cartesian3}
   *
   * @private
   */
  scale: {
    get: function () {
      return this._transformParameters.scale;
    },
    set: function (value) {
      const transformParameters = this._transformParameters;
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
   * The node's axis corrected local space transform. Used in instancing.
   *
   * @memberof ModelExperimentalNode.prototype
   * @type {Matrix4}
   * @readonly
   */
  computedTransform: {
    get: function () {
      return this._computedTransform;
    },
  },

  /**
   * The node's original transform, as specified in the model. Does not include transformations from the node's ancestors.
   *
   * @memberof ModelExperimentalNode.prototype
   * @type {Matrix4}
   * @readonly
   */
  originalTransform: {
    get: function () {
      return this._originalTransform;
    },
  },

  /**
   * The skin applied to this node, if it exists.
   *
   * @memberof ModelExperimentalNode.prototype
   * @type {ModelExperimentalSkin}
   * @readonly
   */
  runtimeSkin: {
    get: function () {
      return this._runtimeSkin;
    },
  },

  /**
   * The computed joint matrices of this node, derived from its skin.
   *
   * @memberof ModelExperimentalNode.prototype
   * @type {Matrix4[]}
   * @readonly
   */
  computedJointMatrices: {
    get: function () {
      return this._computedJointMatrices;
    },
  },
});

function updateTransformFromParameters(runtimeNode, transformParameters) {
  runtimeNode._transformDirty = true;

  runtimeNode._transform = Matrix4.fromTranslationRotationScale(
    transformParameters,
    runtimeNode._transform
  );

  runtimeNode._axisCorrectedTransform = ModelExperimentalUtility.correctModelMatrix(
    runtimeNode._transform,
    runtimeNode._sceneGraph.components.upAxis,
    runtimeNode._sceneGraph.components.forwardAxis,
    runtimeNode._axisCorrectedTransform
  );
}

/**
 * Returns the child with the given index.
 *
 * @param {Number} index The index of the child.
 *
 * @returns {ModelExperimentalNode}
 *
 * @example
 * // Iterate through all children of a runtime node.
 * for (let i = 0; i < runtimeNode.children.length; i++)
 * {
 *   const childNode = runtimeNode.getChild(i);
 * }
 */
ModelExperimentalNode.prototype.getChild = function (index) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("index", index);
  if (index < 0 || index >= this.children.length) {
    throw new DeveloperError(
      "index must be greater than or equal to 0 and less than the number of children."
    );
  }
  //>>includeEnd('debug');

  return this.sceneGraph.runtimeNodes[this.children[index]];
};

/**
 * Configure the node pipeline stages. If the pipeline needs to be re-run, call
 * this method again to ensure the correct sequence of pipeline stages are
 * used.
 *
 * @private
 */
ModelExperimentalNode.prototype.configurePipeline = function () {
  const node = this.node;
  const pipelineStages = this.pipelineStages;
  pipelineStages.length = 0;
  const updateStages = this.updateStages;
  updateStages.length = 0;

  if (defined(node.instances)) {
    pipelineStages.push(InstancingPipelineStage);
  }

  updateStages.push(ModelMatrixUpdateStage);
};

/**
 * Updates the computed transform used for rendering and instancing
 *
 * @private
 */
ModelExperimentalNode.prototype.updateComputedTransform = function () {
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
ModelExperimentalNode.prototype.updateJointMatrices = function () {
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
