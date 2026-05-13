// @ts-check

import DeveloperError from "../../Core/DeveloperError.js";
import defined from "../../Core/defined.js";

/** @import Deformer from "./Deformer.js"; */

/**
 * Interface for objects that can be deformed by a {@link Deformer}.
 *
 * Implementers should set `this[Deformable.symbol] = true;` so {@link Deformable.isDeformable} returns true.
 *
 * @interface
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class Deformable {
  constructor() {
    //>>includeStart('debug', pragmas.debug);
    DeveloperError.throwInstantiationError();
    //>>includeEnd('debug');
  }

  /**
   * Brand symbol. Implementers set `this[Deformable.symbol] = true`.
   * @type {symbol}
   */
  static symbol = Symbol("Deformable");

  /**
   * Method by which a deformer can register itself with the deformable.
   * This is useful as the relationship between deformers to deformables is many-to-many, so
   * both sides may wish to track the relationship.
   * @param {Deformer} deformer
   */
  registerDeformer(deformer) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Method by which a deformer can deregister itself with the deformable.
   * @param {*} deformer
   */
  deregisterDeformer(deformer) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * @param {*} obj
   * @returns {boolean} True if `obj` is branded as a Deformable.
   */
  static isDeformable(obj) {
    return defined(obj) && obj[Deformable.symbol] === true;
  }
}

export default Deformable;
