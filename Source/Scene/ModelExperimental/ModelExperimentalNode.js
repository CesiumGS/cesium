/**
 * A model node with a modifiable transform to allow users to define their own
 * animations. While a glTF can contain animations that target a node's transform,
 * this class allows users to change a node's transform externally. In this way,
 * animation can be driven by another source, not just by the glTF itself.
 * <p>
 * Use {@link ModelExperimental#getNode} to get an instance from a loaded model.
 * </p>
 *
 * @alias ModelExperimentalNode
 * @internalConstructor
 * @class
 *
 * @example
 * const node = model.getNode('LOD3sp');
 * node.matrix = Cesium.Matrix4.fromScale(new Cesium.Cartesian3(5.0, 1.0, 1.0), node.matrix);
 *
 * @see ModelExperimental#getNode
 */
function ModelExperimentalNode(model, runtimeNode) {
  this._model = model;
  this._runtimeNode = runtimeNode;
  this._name = runtimeNode._name;
  this._id = runtimeNode._id;
}

Object.defineProperties(ModelExperimentalNode.prototype, {
  /**
   * The value of the <code>name</code> property of this node.
   *
   * @memberof ModelExperimentalNode.prototype
   *
   * @type {String}
   * @readonly
   */
  name: {
    get: function () {
      return this._name;
    },
  },

  /**
   * The index of the node in the glTF.
   *
   * @memberof ModelExperimentalNode.prototype
   *
   * @type {Number}
   * @readonly
   */
  id: {
    get: function () {
      return this._id;
    },
  },

  /**
   * Determines if this node and its children will be shown.
   *
   * @memberof ModelExperimentalNode.prototype
   * @type {Boolean}
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
   * its parent's.
   * <p>
   * For changes to take effect, this property must be assigned to;
   * setting individual elements of the matrix will not work.
   * </p>
   *
   * @memberof ModelExperimentalNode.prototype
   * @type {Matrix4}
   */
  matrix: {
    get: function () {
      return this._runtimeNode.transform;
    },
    set: function (value) {
      this._runtimeNode.transform = value;
      this._model._userAnimationDirty = true;
    },
  },

  /**
   * Gets the node's original 4x4 matrix transform from its local
   * coordinates to its parent's, without any node transformations
   * or articulations applied.
   *
   * @memberof ModelExperimentalNode.prototype
   * @type {Matrix4}
   */
  originalMatrix: {
    get: function () {
      return this._runtimeNode.originalTransform;
    },
  },
});

export default ModelExperimentalNode;
