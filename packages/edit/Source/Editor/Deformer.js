// @ts-check

import { Check, DeveloperError, defined, destroyObject } from "@cesium/core";
import { Deformable } from "@cesium/engine";

/** @import { DeformerBinding, FrameState } from "@cesium/engine"; */
/** @import Mesh from "./Mesh.js"; */

/**
 * <div class="notice">
 * Use a deformer type's <code>fromMesh</code>, such as
 * {@link SurfaceDeformer.fromMesh}, to create a deformer. Do not call the
 * constructor directly.
 * </div>
 *
 * Deforms {@link Deformable}s as a {@link Mesh} is edited. The base class of
 * every deformer type, such as {@link SurfaceDeformer}.
 * <p>
 * Bindings take effect on the next frame. Editing the mesh's topology unbinds
 * every deformable, restoring its rest shape, until
 * {@link Deformer#rebind} is called. The deformer is destroyed with its mesh.
 * </p>
 *
 * @alias Deformer
 * @internalConstructor
 * @abstract
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class Deformer {
  /** @type {Mesh} */
  #mesh;

  /** @type {Map<Deformable, DeformerBinding>} */
  #bindings = new Map();

  /**
   * Deformables to bind on the next update.
   *
   * @type {Set<Deformable>}
   */
  #deformablesToBind = new Set();

  /**
   * Deformables that a topology edit unbound, for {@link Deformer#rebind}.
   *
   * @type {Set<Deformable>}
   */
  #deformablesToRebind = new Set();

  /**
   * @param {Mesh} mesh The mesh that deforms.
   */
  constructor(mesh) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("mesh", mesh);
    //>>includeEnd('debug');

    this.#mesh = mesh;
    mesh._deformers.add(this);
  }

  /**
   * The mesh that deforms.
   *
   * @type {Mesh}
   * @readonly
   */
  get mesh() {
    return this.#mesh;
  }

  /**
   * Whether a topology edit unbound deformables that haven't been rebound.
   *
   * @type {boolean}
   * @readonly
   */
  get needsRebind() {
    return this.#deformablesToRebind.size > 0;
  }

  /**
   * Binds a deformable to the mesh as it is now. Rebinds it if it's already
   * bound.
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
   * Binds the deformables that a topology edit unbound again, to the mesh as
   * it is now.
   */
  rebind() {
    for (const deformable of this.#deformablesToRebind) {
      this.#deformablesToBind.add(deformable);
    }
    this.#deformablesToRebind.clear();
  }

  /**
   * Creates a deformable's binding to the mesh as it is now.
   *
   * @param {FrameState} frameState The frame state.
   * @param {Deformable} deformable The deformable to bind.
   * @returns {DeformerBinding} The binding.
   * @abstract
   * @ignore
   */
  _createBinding(frameState, deformable) {
    return DeveloperError.throwInstantiationError();
  }

  /**
   * Called by the mesh on render passes, after its overlay is uploaded.
   *
   * @param {FrameState} frameState The frame state.
   * @param {boolean} topologyChanged Whether the mesh's topology changed since the previous update.
   * @ignore
   */
  _update(frameState, topologyChanged) {
    if (topologyChanged) {
      for (const deformable of this.#bindings.keys()) {
        this.#removeBinding(deformable);
        this.#deformablesToRebind.add(deformable);
      }
    }

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
    this.#mesh._deformers.delete(this);

    return destroyObject(this);
  }
}

export default Deformer;
