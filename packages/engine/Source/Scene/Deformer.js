// @ts-check

import {
  AxisAlignedBoundingBox,
  Cartesian3,
  DeveloperError,
  Event,
  Matrix3,
  defined,
  destroyObject,
  oneTimeWarning,
} from "@cesium/core";
import Deformable from "./Deformable.js";
import GeometryAttributeDescriptor from "./GeometryAttributeDescriptor.js";
import VertexAttributeSemantic from "./VertexAttributeSemantic.js";

/** @import DeformerBinding from "./DeformerBinding.js"; */
/** @import FrameState from "./FrameState.js"; */
/** @import GeometryWriteSession from "./GeometryWriteSession.js"; */

const POSITION = new GeometryAttributeDescriptor({
  semantic: VertexAttributeSemantic.POSITION,
});
const NORMAL = new GeometryAttributeDescriptor({
  semantic: VertexAttributeSemantic.NORMAL,
});
const TANGENT = new GeometryAttributeDescriptor({
  semantic: VertexAttributeSemantic.TANGENT,
});

const scratchJacobian = new Matrix3();
const scratchCofactor = new Matrix3();
const scratchColumns = [new Cartesian3(), new Cartesian3(), new Cartesian3()];
const scratchCofactorColumn = new Cartesian3();
const scratchDirection = new Cartesian3();

/**
 * Deforms {@link Deformable}s. The base class of every deformer type.
 * <p>
 * Bindings take effect on the next update. If a deformer changes so that its
 * bindings no longer apply, it unbinds every deformable, restoring its rest
 * shape, until {@link Deformer#rebind} is called.
 * </p>
 *
 * @alias Deformer
 * @internalConstructor
 * @abstract
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class Deformer {
  /** @type {Map<Deformable, DeformerBinding>} */
  #bindings = new Map();

  /**
   * Deformables to bind on the next update.
   *
   * @type {Set<Deformable>}
   */
  #deformablesToBind = new Set();

  /** @type {AxisAlignedBoundingBox|undefined} */
  #bounds;

  /**
   * Raised when {@link Deformer#_bounds} changes.
   *
   * @type {Event<function(): void>}
   * @readonly
   * @internal
   */
  _boundsChanged = new Event();

  /**
   * Deformables whose bindings no longer applied, for {@link Deformer#rebind}.
   *
   * @type {Set<Deformable>}
   */
  #deformablesToRebind = new Set();

  /**
   * Whether deformables were unbound because their bindings no longer applied,
   * and haven't been rebound.
   *
   * @type {boolean}
   * @readonly
   */
  get needsRebind() {
    return this.#deformablesToRebind.size > 0;
  }

  /**
   * Binds a deformable to the deformer as it is now. Rebinds it if it's
   * already bound.
   *
   * @param {Deformable} deformable The deformable to bind.
   *
   * @exception {DeveloperError} deformable isn't a Deformable.
   */
  bind(deformable) {
    //>>includeStart('debug', pragmas.debug);
    if (!Deformable.isDeformable(deformable)) {
      throw new DeveloperError("deformable isn't a Deformable.");
    }
    //>>includeEnd('debug');

    this.#deformablesToRebind.delete(deformable);
    this.#deformablesToBind.add(deformable);
  }

  /**
   * Unbinds a deformable, restoring its rest shape, and forgets it.
   *
   * @param {Deformable} deformable The deformable to unbind.
   * @returns {boolean} <code>true</code> if the deformer had the deformable, <code>false</code> otherwise.
   */
  unbind(deformable) {
    const wasBound = this.#removeBinding(deformable);
    const wasToBind = this.#deformablesToBind.delete(deformable);
    const wasToRebind = this.#deformablesToRebind.delete(deformable);
    return wasBound || wasToBind || wasToRebind;
  }

  /**
   * Binds the deformables whose bindings no longer applied again, to the
   * deformer as it is now.
   */
  rebind() {
    for (const deformable of this.#deformablesToRebind) {
      this.#deformablesToBind.add(deformable);
    }
    this.#deformablesToRebind.clear();
  }

  /**
   * Writes the deformer's current deformation of a deformable into its
   * geometry, then unbinds it. Normals and tangents are baked too if they can
   * be written; otherwise a warning is logged. Other deformers bound to the
   * deformable stay valid.
   *
   * @param {Deformable} deformable The deformable to bake.
   *
   * @exception {DeveloperError} The deformable isn't bound to the deformer.
   */
  bake(deformable) {
    const binding = this.#bindings.get(deformable);

    //>>includeStart('debug', pragmas.debug);
    if (!defined(binding)) {
      throw new DeveloperError("The deformable isn't bound to the deformer.");
    }
    //>>includeEnd('debug');

    const { geometryReader, geometryWriter } = deformable;
    const attributes = [POSITION];
    for (const descriptor of [NORMAL, TANGENT]) {
      if (geometryWriter.hasAttribute(descriptor)) {
        attributes.push(descriptor);
      } else if (geometryReader.hasAttribute(descriptor)) {
        oneTimeWarning(
          `Deformer.bake-${descriptor.semantic}`,
          `The deformable's ${descriptor.semantic} attribute can't be written, so it isn't baked.`,
        );
      }
    }

    const displacementBoundingBox = geometryWriter.withWriteSession(
      { attributes },
      (session) =>
        this.#bakeVertices(
          /** @type {DeformerBinding} */ (binding),
          session,
          attributes,
        ),
    );

    this.unbind(deformable);
    for (const otherBinding of deformable.deformerBindings) {
      // The rest displacement helps bounding volumes account for changes to vertices of the deformable
      // (like baking) since other deformers were bound to it.
      otherBinding.addRestDisplacement(displacementBoundingBox);
    }
  }

  /**
   * Deforms the session's vertices as the binding does, and writes them.
   *
   * @param {DeformerBinding} binding The deformable's binding.
   * @param {GeometryWriteSession} session The deformable's write session.
   * @param {GeometryAttributeDescriptor[]} attributes The attributes to bake.
   * @returns {AxisAlignedBoundingBox} A bounding box containing each vertex's displacement.
   * @ignore
   */
  #bakeVertices(binding, session, attributes) {
    const positions = readValues(session, POSITION);
    const restPositions = positions.slice();
    const jacobians = new Float64Array(positions.length * 3);
    this._deformPositions(binding, positions, jacobians);
    writeValues(session, POSITION, positions);

    // Directions transform as in DeformerStageVS.
    if (attributes.includes(NORMAL)) {
      bakeDirections(session, NORMAL, jacobians, computeCofactor);
    }
    if (attributes.includes(TANGENT)) {
      bakeDirections(session, TANGENT, jacobians, (jacobian) => jacobian);
    }

    const minimum = new Cartesian3(Infinity, Infinity, Infinity);
    const maximum = new Cartesian3(-Infinity, -Infinity, -Infinity);
    const displacement = new Cartesian3();
    for (let i = 0; i < positions.length; i += 3) {
      Cartesian3.fromElements(
        positions[i] - restPositions[i],
        positions[i + 1] - restPositions[i + 1],
        positions[i + 2] - restPositions[i + 2],
        displacement,
      );
      Cartesian3.minimumByComponent(minimum, displacement, minimum);
      Cartesian3.maximumByComponent(maximum, displacement, maximum);
    }
    return AxisAlignedBoundingBox.fromCorners(minimum, maximum);
  }

  /**
   * Creates a deformable's binding to the deformer as it is now.
   *
   * @param {FrameState} frameState The frame state.
   * @param {Deformable} deformable The deformable to bind.
   * @returns {DeformerBinding} The binding.
   * @abstract
   * @internal
   */
  _createBinding(frameState, deformable) {
    return DeveloperError.throwInstantiationError();
  }

  /**
   * Gets the shader lines of the deformer's bindings. See
   * {@link DeformerBinding#getShaderLines}.
   *
   * @param {Object<string, string>} names The shader identifier of each vertex attribute and uniform of a binding, by name.
   * @returns {string[]} The lines of the function body.
   * @abstract
   * @internal
   */
  _getShaderLines(names) {
    return DeveloperError.throwInstantiationError();
  }

  /**
   * Deforms positions on the CPU as {@link Deformer#_getShaderLines} does on
   * the GPU.
   *
   * @param {DeformerBinding} binding The binding of the deformable the positions belong to.
   * @param {Float64Array} positions The rest positions, xyz per vertex, replaced by the deformed positions.
   * @param {Float64Array} jacobians Receives each vertex's jacobian, as a column-major 3x3 matrix.
   * @abstract
   * @internal
   */
  _deformPositions(binding, positions, jacobians) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Unbinds every bound deformable until {@link Deformer#rebind} is called.
   * Subclasses call this when their bindings no longer apply.
   *
   * @internal
   */
  _invalidateBindings() {
    for (const deformable of this.#bindings.keys()) {
      this.#removeBinding(deformable);
      this.#deformablesToRebind.add(deformable);
    }
  }

  /**
   * The deformer's bounds in its local space, or undefined if they aren't
   * known.
   *
   * @type {AxisAlignedBoundingBox|undefined}
   * @readonly
   * @internal
   */
  get _bounds() {
    return this.#bounds;
  }

  /**
   * Sets the deformer's local-space bounds, raising
   * {@link Deformer#_boundsChanged}. Subclasses call this when their bounds
   * change.
   *
   * @param {AxisAlignedBoundingBox|undefined} bounds The bounds.
   * @internal
   */
  _setBounds(bounds) {
    this.#bounds = bounds;
    this._boundsChanged.raiseEvent();
  }

  /**
   * Binds the deformables waiting to be bound. Subclasses call this on render
   * passes.
   *
   * @param {FrameState} frameState The frame state.
   * @internal
   */
  _update(frameState) {
    for (const deformable of this.#deformablesToBind) {
      // Removed first, so a deformable that fails to bind isn't retried every frame.
      this.#deformablesToBind.delete(deformable);
      this.#removeBinding(deformable);

      const binding = this._createBinding(frameState, deformable);
      deformable.addDeformerBinding(binding);
      this.#bindings.set(deformable, binding);
    }
  }

  /**
   * @param {Deformable} deformable The deformable.
   * @returns {boolean} <code>true</code> if it was bound, <code>false</code> otherwise.
   * @ignore
   */
  #removeBinding(deformable) {
    const binding = this.#bindings.get(deformable);
    if (!defined(binding)) {
      return false;
    }

    this.#bindings.delete(deformable);
    deformable.removeDeformerBinding(binding);
    binding.destroy();
    return true;
  }

  /**
   * @returns {boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
   */
  isDestroyed() {
    return false;
  }

  /**
   * Unbinds every deformable and destroys the deformer. It can't be used
   * afterwards.
   *
   * @returns {void}
   */
  destroy() {
    for (const deformable of this.#bindings.keys()) {
      this.#removeBinding(deformable);
    }

    return destroyObject(this);
  }
}

/**
 * @param {GeometryWriteSession} session
 * @param {GeometryAttributeDescriptor} descriptor
 * @returns {Float64Array} Every vertex's value.
 * @ignore
 */
function readValues(session, descriptor) {
  const read = session.vertexAttributeReader(descriptor);
  const componentCount = descriptor.componentCount;
  const values = new Float64Array(session.vertexCount() * componentCount);
  for (let i = 0; i < session.vertexCount(); ++i) {
    read(i, values, i * componentCount);
  }
  return values;
}

/**
 * @param {GeometryWriteSession} session
 * @param {GeometryAttributeDescriptor} descriptor
 * @param {Float64Array} values Every vertex's value.
 * @ignore
 */
function writeValues(session, descriptor, values) {
  const write = session.vertexAttributeWriter(descriptor);
  const componentCount = descriptor.componentCount;
  for (let i = 0; i < session.vertexCount(); ++i) {
    write(i, values, i * componentCount);
  }
}

/**
 * Transforms the xyz of each vertex's direction by a matrix derived from its
 * jacobian, normalizing it.
 *
 * @param {GeometryWriteSession} session
 * @param {GeometryAttributeDescriptor} descriptor
 * @param {Float64Array} jacobians Each vertex's jacobian, as a column-major 3x3 matrix.
 * @param {function(Matrix3): Matrix3} getTransform Gets the matrix from a jacobian.
 * @ignore
 */
function bakeDirections(session, descriptor, jacobians, getTransform) {
  const values = readValues(session, descriptor);
  const componentCount = descriptor.componentCount;
  for (let i = 0; i < session.vertexCount(); ++i) {
    const jacobian = Matrix3.unpack(
      /** @type {any} */ (jacobians),
      i * 9,
      scratchJacobian,
    );
    const offset = i * componentCount;
    const direction = Cartesian3.fromElements(
      values[offset],
      values[offset + 1],
      values[offset + 2],
      scratchDirection,
    );
    Matrix3.multiplyByVector(getTransform(jacobian), direction, direction);
    if (Cartesian3.magnitudeSquared(direction) > 0.0) {
      Cartesian3.normalize(direction, direction);
    }
    values[offset] = direction.x;
    values[offset + 1] = direction.y;
    values[offset + 2] = direction.z;
  }
  writeValues(session, descriptor, values);
}

/**
 * Computes the cofactor matrix of a jacobian, which transforms normals like
 * its inverse transpose, up to scale.
 *
 * @param {Matrix3} jacobian
 * @returns {Matrix3}
 * @ignore
 */
function computeCofactor(jacobian) {
  const [c0, c1, c2] = scratchColumns;
  Matrix3.getColumn(jacobian, 0, c0);
  Matrix3.getColumn(jacobian, 1, c1);
  Matrix3.getColumn(jacobian, 2, c2);
  const column = scratchCofactorColumn;
  Matrix3.setColumn(
    scratchCofactor,
    0,
    Cartesian3.cross(c1, c2, column),
    scratchCofactor,
  );
  Matrix3.setColumn(
    scratchCofactor,
    1,
    Cartesian3.cross(c2, c0, column),
    scratchCofactor,
  );
  Matrix3.setColumn(
    scratchCofactor,
    2,
    Cartesian3.cross(c0, c1, column),
    scratchCofactor,
  );
  return scratchCofactor;
}

export default Deformer;
