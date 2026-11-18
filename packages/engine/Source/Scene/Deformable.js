// @ts-check

import { DeveloperError, defined } from "@cesium/core";
import GeometrySource from "./GeometrySource.js";
/** @import DeformerBinding from "./DeformerBinding.js"; */

/**
 * A {@link GeometrySource} whose vertices can be deformed on the GPU, such as
 * a {@link ModelPrimitive}. Deformations of the rest position add up.
 *
 * @interface
 * @extends GeometrySource
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class Deformable extends GeometrySource {
  /**
   * Implementers set <code>[Deformable.symbol] = true</code> on their prototype.
   *
   * @type {symbol}
   * @readonly
   * @internal
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
   * @internal
   */
  addDeformerBinding(binding) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * @param {DeformerBinding} binding The binding to remove.
   * @internal
   */
  removeDeformerBinding(binding) {
    DeveloperError.throwInstantiationError();
  }
}

export default Deformable;
