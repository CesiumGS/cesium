import { Check, Matrix4 } from "@cesium/core";

/**
 * <div class="notice">
 * Use {@link ModelNode#primitives} to get the primitives of a loaded model. Do
 * not call the constructor directly.
 * </div>
 *
 * A primitive of a {@link ModelNode}, corresponding to a single glTF mesh
 * primitive. A primitive owns its own geometry and material, and is the
 * smallest unit that can be individually shown or hidden.
 *
 * @alias ModelPrimitive
 * @internalConstructor
 * @class
 *
 * @see ModelNode#primitives
 */
function ModelPrimitive(model, node, runtimePrimitive) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("model", model);
  Check.typeOf.object("node", node);
  Check.typeOf.object("runtimePrimitive", runtimePrimitive);
  //>>includeEnd('debug');

  this._model = model;
  this._node = node;
  this._runtimePrimitive = runtimePrimitive;
  this._worldMatrix = new Matrix4();
}

Object.defineProperties(ModelPrimitive.prototype, {
  /**
   * The node that this primitive belongs to.
   *
   * @memberof ModelPrimitive.prototype
   *
   * @type {ModelNode}
   * @readonly
   */
  node: {
    get: function () {
      return this._node;
    },
  },

  /**
   * Determines if this primitive will be shown. This is independent of the
   * owning node's show, so a single primitive can be hidden while the rest of
   * the node is drawn.
   *
   * @memberof ModelPrimitive.prototype
   * @type {boolean}
   *
   * @default true
   */
  show: {
    get: function () {
      return this._runtimePrimitive.show;
    },
    set: function (value) {
      this._runtimePrimitive.show = value;
    },
  },

  /**
   * The transform from this primitive's local coordinates to the world (ECEF)
   * coordinates of the scene, taking the model's transform and the node
   * hierarchy into account. This is the world matrix of the primitive's
   * {@link ModelPrimitive#node}. It's computed on each access and is only
   * supported in 3D.
   *
   * @memberof ModelPrimitive.prototype
   *
   * @type {Matrix4}
   * @readonly
   *
   * @see ModelNode#computeWorldMatrix
   */
  worldMatrix: {
    get: function () {
      return this._node.computeWorldMatrix(this._worldMatrix);
    },
  },
});

export default ModelPrimitive;
