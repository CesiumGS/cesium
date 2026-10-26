import { Check, defined, Matrix4 } from "@cesium/core";
import ModelPrimitiveReadSession from "./ModelPrimitiveReadSession.js";

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
  // Lazily created geometry reader to avoid unnecessary allocation until it's needed.
  this._geometryReader = undefined;
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
    }
  },

  /**
   * Reads this primitive's geometry: its vertices, their attributes, and the
   * points, lines, or triangles they form. Values are in the primitive's
   * local space and rest pose, so they don't include the node's transform.
   *
   * @memberof ModelPrimitive.prototype
   *
   * @type {GeometryReader}
   * @readonly
   *
   * @example
   * const position = new Cesium.GeometryAttributeDescriptor({
   *   semantic: Cesium.VertexAttributeSemantic.POSITION,
   * });
   *
   * const positions = primitive.geometryReader.withReadSession(
   *   { attributes: [position] },
   *   (session) => {
   *     const result = new Float32Array(session.vertexCount() * 3);
   *     const readPosition = session.vertexAttributeReader(position);
   *
   *     for (let i = 0; i < session.vertexCount(); ++i) {
   *       readPosition(i, result, i * 3);
   *     }
   *
   *     return result;
   *   },
   * );
   */
  geometryReader: {
    get: function () {
      if (!defined(this._geometryReader)) {
        this._geometryReader = ModelPrimitiveReadSession.createGeometryReader(
          this._runtimePrimitive.primitive,
        );
      }

      return this._geometryReader;
    },
  },
});

export default ModelPrimitive;
