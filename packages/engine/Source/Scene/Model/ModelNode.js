import { Check, Matrix4, defined } from "@cesium/core";

/**
 * The shared, immutable children array used by nodes with no children, to avoid
 * allocating an empty array for every leaf node.
 *
 * @type {ModelNode[]}
 * @private
 */
const EMPTY_CHILDREN = Object.freeze([]);

/**
 * The shared, immutable primitives array used by nodes with no primitives, to
 * avoid allocating an empty array for every node that owns no geometry.
 *
 * @type {ModelPrimitive[]}
 * @private
 */
const EMPTY_PRIMITIVES = Object.freeze([]);

/**
 * <div class="notice">
 * Use {@link Model#nodes}, {@link Model#rootNodes}, or {@link Model#getNode} to
 * get a node from a loaded model. Do not call the constructor directly.
 * </div>
 *
 * A model node with a modifiable transform to allow users to define their
 * own animations. While a model's asset can contain animations that target
 * a node's transform, this class allows users to change a node's transform
 * externally. In this way, animation can be driven by another source, not
 * just by the model's asset.
 *
 * Nodes also provide access to the model's node hierarchy through their
 * {@link ModelNode#parent} and {@link ModelNode#children}.
 *
 * @alias ModelNode
 * @internalConstructor
 * @class
 *
 * @example
 * const node = model.getNode("Hand");
 * node.matrix = Cesium.Matrix4.fromScale(new Cesium.Cartesian3(5.0, 1.0, 1.0), node.matrix);
 *
 * @see Model#nodes
 * @see Model#rootNodes
 * @see Model#getNode
 */
function ModelNode(model, runtimeNode) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("model", model);
  Check.typeOf.object("runtimeNode", runtimeNode);
  //>>includeEnd('debug');

  this._model = model;
  this._runtimeNode = runtimeNode;
  this._parent = undefined;
  this._children = EMPTY_CHILDREN;
  this._primitives = EMPTY_PRIMITIVES;
}

Object.defineProperties(ModelNode.prototype, {
  /**
   * The value of the <code>name</code> property of this node.
   *
   * @memberof ModelNode.prototype
   *
   * @type {string}
   * @readonly
   */
  name: {
    get: function () {
      return this._runtimeNode._name;
    },
  },

  /**
   * The index of the node in the glTF. This is also the index of the node in
   * {@link Model#nodes}.
   *
   * @memberof ModelNode.prototype
   *
   * @type {number}
   * @readonly
   */
  id: {
    get: function () {
      return this._runtimeNode._id;
    },
  },

  /**
   * The parent of this node in the model's node hierarchy, or
   * <code>undefined</code> if this is a root node.
   *
   * @memberof ModelNode.prototype
   *
   * @type {ModelNode|undefined}
   * @readonly
   *
   * @see Model#rootNodes
   */
  parent: {
    get: function () {
      return this._parent;
    },
  },

  /**
   * The children of this node in the model's node hierarchy.
   *
   * @memberof ModelNode.prototype
   *
   * @type {ModelNode[]}
   * @readonly
   */
  children: {
    get: function () {
      return this._children;
    },
  },

  /**
   * The primitives owned by this node.
   *
   * @memberof ModelNode.prototype
   *
   * @type {ModelPrimitive[]}
   * @readonly
   */
  primitives: {
    get: function () {
      return this._primitives;
    },
  },

  /**
   * Determines if this node and its children will be shown.
   *
   * @memberof ModelNode.prototype
   * @type {boolean}
   *
   * @default true
   */
  show: {
    get: function () {
      return this._runtimeNode.show;
    },
    set: function (value) {
      this._runtimeNode.show = value;
    },
  },

  /**
   * The node's 4x4 matrix transform from its local coordinates to
   * its parent's. Setting the matrix to undefined will restore the
   * node's original transform, and allow the node to be animated by
   * any animations in the model again.
   * <p>
   * For changes to take effect, this property must be assigned to;
   * setting individual elements of the matrix will not work.
   * </p>
   *
   * @memberof ModelNode.prototype
   * @type {Matrix4}
   */
  matrix: {
    get: function () {
      return this._runtimeNode.transform;
    },
    set: function (value) {
      if (defined(value)) {
        this._runtimeNode.transform = value;
        this._runtimeNode.userAnimated = true;
        this._model._userAnimationDirty = true;
      } else {
        this._runtimeNode.transform = this.originalMatrix;
        this._runtimeNode.userAnimated = false;
      }
    },
  },

  /**
   * Gets the node's original 4x4 matrix transform from its local
   * coordinates to its parent's, without any node transformations
   * or articulations applied.
   *
   * @memberof ModelNode.prototype
   * @type {Matrix4}
   */
  originalMatrix: {
    get: function () {
      return this._runtimeNode.originalTransform;
    },
  },
});

/**
 * Computes this node's transform from its local coordinates to the world
 * (ECEF) coordinates of the scene, taking the model's transform and the node
 * hierarchy into account. This is only supported in 3D.
 *
 * @param {Matrix4} result The object onto which to store the result.
 * @returns {Matrix4} The modified result parameter.
 */
ModelNode.prototype.computeWorldMatrix = function (result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  const computedModelMatrix = this._model.sceneGraph.computedModelMatrix;
  const computedTransform = this._runtimeNode.computedTransform;
  return Matrix4.multiplyTransformation(
    computedModelMatrix,
    computedTransform,
    result,
  );
};

export default ModelNode;
