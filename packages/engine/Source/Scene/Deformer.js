// @ts-check

import { DeveloperError, defined, destroyObject } from "@cesium/core";
import Deformable from "./Deformable.js";

/** @import DeformerBinding from "./DeformerBinding.js"; */
/** @import FrameState from "./FrameState.js"; */

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

export default Deformer;
