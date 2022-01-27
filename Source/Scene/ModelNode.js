import Matrix4 from "../Core/Matrix4.js";

/**
 * A model node with a transform for user-defined animations.  A glTF asset can
 * contain animations that target a node's transform.  This class allows
 * changing a node's transform externally so animation can be driven by another
 * source, not just an animation in the glTF asset.
 * <p>
 * Use {@link Model#getNode} to create an instance.
 * </p>
 *
 * @alias ModelNode
 * @internalConstructor
 * @class
 *
 * @example
 * var node = model.getNode('LOD3sp');
 * node.matrix = Cesium.Matrix4.fromScale(new Cesium.Cartesian3(5.0, 1.0, 1.0), node.matrix);
 *
 * @see Model#getNode
 */
function ModelNode(model, node, runtimeNode, id, matrix) {
  this._model = model;
  this._runtimeNode = runtimeNode;
  this._name = node.name;
  this._id = id;

  /**
   * @private
   */
  this.useMatrix = false;

  this._show = true;
  this._matrix = Matrix4.clone(matrix);
  this._originalMatrix = Matrix4.clone(matrix);
}

Object.defineProperties(ModelNode.prototype, {
  /**
   * The value of the <code>name</code> property of this node.
   *
   * @memberof ModelNode.prototype
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
   * The index of the node.
   *
   * @memberof ModelNode.prototype
   *
   * @type {String}
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
   * @memberof ModelNode.prototype
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
ModelNode.prototype.setMatrix = function (matrix) {
  // Update matrix but do not set the dirty flag since this is used internally
  // to keep the matrix in-sync during a glTF animation.
  Matrix4.clone(matrix, this._matrix);
};
export default ModelNode;
