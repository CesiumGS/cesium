// @ts-check

import DeveloperError from "../../Core/DeveloperError.js";
import defined from "../../Core/defined.js";
import Editable from "../Editable.js";

/** @import Deformer from "./Deformer.js"; */

/**
 * Interface for objects that can be deformed by a {@link Deformer}. Extends
 * {@link Editable}, since a deformer operates on the deformable's vertex
 * geometry via its {@link Editable#geometryAccessor}.
 *
 * Implementers should brand themselves with both symbols so the corresponding
 * <code>is*</code> checks return true:
 * <pre>
 *   this[Editable.symbol] = true;
 *   this[Deformable.symbol] = true;
 * </pre>
 *
 * @interface
 * @extends Editable
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class Deformable extends Editable {
  /**
   * Brand symbol. Implementers set <code>this[Deformable.symbol] = true</code>.
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
   * @param {Deformer} deformer
   */
  deregisterDeformer(deformer) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * @param {*} obj
   * @returns {boolean} True if <code>obj</code> is branded as a Deformable.
   */
  static isDeformable(obj) {
    return defined(obj) && obj[Deformable.symbol] === true;
  }
}

export default Deformable;
