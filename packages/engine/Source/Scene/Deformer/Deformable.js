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
   * Callback when a deformer is bound to the deformable.
   * @param {Deformer} deformer
   */
  onDeformerBind(deformer) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Callback when a deformer is unbound from the deformable.
   * @param {Deformer} deformer
   */
  onDeformerUnbind(deformer) {
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
