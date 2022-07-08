import Matrix4 from "../../Core/Matrix4.js";

/**
 * A model node with a transform for user-defined animations. A glTF asset can
 * contain animations that target a node's transform. This class allows users
 * to change a node's transform externally such that animation can be driven by
 * another source, not just an animation in the glTF asset.
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
  this._name = runtimeNode.name;
  this._id = runtimeNode.id;

  /* const transform = runtimeNode.transform;

  this._show = true;
  this._matrix = Matrix4.clone(matrix);
  this._originalMatrix = Matrix4.clone(matrix);*/
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
      return this._show;
    },
    set: function (value) {
      if (this._show !== value) {
        this._show = value;
        this._model._perNodeShowDirty = true;
      }
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
   * @memberof ModelNode.prototype
   * @type {Matrix4}
   */
  matrix: {
    get: function () {
      return this._matrix;
    },
    set: function (value) {
      this._matrix = Matrix4.clone(value, this._matrix);
      this.useMatrix = true;

      const model = this._model;
      model._cesiumAnimationsDirty = true;
      this._runtimeNode.dirtyNumber = model._maxDirtyNumber;
    },
  },

  /**
   * Gets the node's original 4x4 matrix transform from its local coordinates to
   * its parent's, without any node transformations or articulations applied.
   *
   * @memberof ModelNode.prototype
   * @type {Matrix4}
   */
  originalMatrix: {
    get: function () {
      return this._originalMatrix;
    },
  },
});

/**
 * @private
 */
ModelExperimentalNode.prototype.setMatrix = function (matrix) {
  // Update matrix but do not set the dirty flag since this is used internally
  // to keep the matrix in-sync during a glTF animation.
  Matrix4.clone(matrix, this._matrix);
};

export default ModelExperimentalNode;
