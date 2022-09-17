import Check from "../../Core/Check.js";
import defined from "../../Core/defined.js";

/**
 * <div class="notice">
 * Use {@link Model#getNode} to get a node from a loaded model. Do not call the constructor directly.
 * </div>
 *
 * A model node with a modifiable transform to allow users to define their
 * own animations. While a model's asset can contain animations that target
 * a node's transform, this class allows users to change a node's transform
 * externally. In this way, animation can be driven by another source, not
 * just by the model's asset.
 *
 * @alias ModelNode
 * @internalConstructor
 * @class
 *
 * @example
 * const node = model.getNode("Hand");
 * node.matrix = Cesium.Matrix4.fromScale(new Cesium.Cartesian3(5.0, 1.0, 1.0), node.matrix);
 *
 * @see Model#getNode
 */
function ModelNode(model, runtimeNode) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("model", model);
  Check.typeOf.object("runtimeNode", runtimeNode);
  //>>includeEnd('debug')

  this._model = model;
  this._runtimeNode = runtimeNode;
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
      return this._runtimeNode._name;
    },
  },

  /**
   * The index of the node in the glTF.
   *
   * @memberof ModelNode.prototype
   *
   * @type {Number}
   * @readonly
   */
  id: {
    get: function () {
      return this._runtimeNode._id;
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

export default ModelNode;
