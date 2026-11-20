import { Check, DeveloperError, defined, Matrix4 } from "@cesium/core";
import Deformable from "../Deformable.js";
import ModelPrimitiveAccessSession from "./ModelPrimitiveAccessSession.js";
/** @import DeformerBinding from "../DeformerBinding.js"; */

/**
 * <div class="notice">
 * Use {@link ModelNode#primitives} to get the primitives of a loaded model. Do
 * not call the constructor directly.
 * </div>
 *
 * A primitive of a {@link ModelNode}, corresponding to a single glTF mesh
 * primitive. A primitive owns its own geometry and material, and is the
 * smallest unit that can be individually shown or hidden. It implements
 * {@link GeometrySource}.
 *
 * @alias ModelPrimitive
 * @internalConstructor
 * @class
 *
 * @see ModelNode#primitives
 * @see GeometrySource
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
  // Lazily created geometry reader and writer to avoid unnecessary allocation until they're needed.
  this._geometryReader = undefined;
  this._geometryWriter = undefined;
  /**
   * @type {Map<DeformerBinding, function(): void>}
   * @private
   */
  this._removeDeformedBoundingBoxListeners = new Map();
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

  /**
   * A reader for accessing this primitive's geometry: its vertices, their attributes, and the
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
        this._geometryReader = ModelPrimitiveAccessSession.createGeometryReader(
          this._runtimePrimitive.primitive,
        );
      }

      return this._geometryReader;
    },
  },

  /**
   * A writer for accessing this primitive's geometry: i.e. its vertex attributes.
   * Position values are in the primitive's local space and rest pose, so they don't
   * include the node's transform. Attributes that are stored compressed, e.g.
   * quantized, cannot currently be written; see {@link GeometryWriter#hasAttribute}.
   *
   * @memberof ModelPrimitive.prototype
   *
   * @type {GeometryWriter}
   * @readonly
   *
   * @example
   * const position = new Cesium.GeometryAttributeDescriptor({
   *   semantic: Cesium.VertexAttributeSemantic.POSITION,
   * });
   *
   * primitive.geometryWriter.withWriteSession(
   *   { attributes: [position] },
   *   (session) => {
   *     const readPosition = session.vertexAttributeReader(position);
   *     const writePosition = session.vertexAttributeWriter(position);
   *     const value = new Array(3);
   *
   *     for (let i = 0; i < session.vertexCount(); ++i) {
   *       readPosition(i, value);
   *       value[2] += 10.0;
   *       writePosition(i, value);
   *     }
   *   },
   * );
   */
  geometryWriter: {
    get: function () {
      if (!defined(this._geometryWriter)) {
        this._geometryWriter = ModelPrimitiveAccessSession.createGeometryWriter(
          this._runtimePrimitive.primitive,
          // Rebuilds what's derived from the geometry, e.g. bounding volumes.
          // If a use-case arises for frequent writes (e.g. per frame), consider optimizing to update only what changed.
          () => this._model.resetDrawCommands(),
        );
      }

      return this._geometryWriter;
    },
  },

  /**
   * Implements {@link Deformable#deformerBindings}.
   *
   * @memberof ModelPrimitive.prototype
   *
   * @type {Iterable<DeformerBinding>}
   * @readonly
   * @internal
   */
  deformerBindings: {
    get: function () {
      return this._runtimePrimitive.deformerBindings;
    },
  },
});

/**
 * Implements {@link Deformable#addDeformerBinding}.
 *
 * @param {DeformerBinding} binding The binding to add.
 *
 * @exception {DeveloperError} Skinned and morphed primitives can't be deformed.
 *
 * @internal
 */
ModelPrimitive.prototype.addDeformerBinding = function (binding) {
  const runtimePrimitive = this._runtimePrimitive;
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("binding", binding);
  if (
    defined(runtimePrimitive.node.skin) ||
    runtimePrimitive.primitive.morphTargets.length > 0
  ) {
    throw new DeveloperError(
      "Skinned and morphed primitives can't be deformed.",
    );
  }
  //>>includeEnd('debug');

  runtimePrimitive.deformerBindings.add(binding);
  this._removeDeformedBoundingBoxListeners.set(
    binding,
    binding.deformedBoundingBoxChanged.addEventListener(() => {
      runtimePrimitive.deformedBoundsDirty = true;
    }),
  );
  this._model.resetDrawCommands();
};

/**
 * Implements {@link Deformable#removeDeformerBinding}.
 *
 * @param {DeformerBinding} binding The binding to remove.
 *
 * @internal
 */
ModelPrimitive.prototype.removeDeformerBinding = function (binding) {
  if (this._runtimePrimitive.deformerBindings.delete(binding)) {
    this._removeDeformedBoundingBoxListeners.get(binding)();
    this._removeDeformedBoundingBoxListeners.delete(binding);
    this._model.resetDrawCommands();
  }
};

ModelPrimitive.prototype[Deformable.symbol] = true;

export default ModelPrimitive;
