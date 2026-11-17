// @ts-check

import { DeveloperError, defined } from "@cesium/core";
import GeometrySource from "./GeometrySource.js";
/** @import DeformerBinding from "./DeformerBinding.js"; */

/**
 * A {@link GeometrySource} whose vertices can be deformed on the GPU by
 * {@link DeformerBinding}s. Each binding deforms the rest position, and their
 * offsets from it add up.
 * <p>
 * Implementers set <code>[Deformable.symbol] = true</code> on their prototype.
 * </p>
 *
 * @interface
 * @extends GeometrySource
 * @internal
 */
class Deformable extends GeometrySource {
  /**
   * @type {symbol}
   * @readonly
   */
  static symbol = Symbol("Deformable");

  /**
   * @param {*} object The object to check.
   * @returns {boolean} <code>true</code> if the object implements Deformable, <code>false</code> otherwise.
   */
  static isDeformable(object) {
    return defined(object) && object[Deformable.symbol] === true;
  }

  /**
   * @param {DeformerBinding} binding The binding to add.
   */
  addDeformerBinding(binding) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * @param {DeformerBinding} binding The binding to remove.
   */
  removeDeformerBinding(binding) {
    DeveloperError.throwInstantiationError();
  }
}

export default Deformable;
