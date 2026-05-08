// @ts-check

import DeveloperError from "../Core/DeveloperError.js";
import defined from "../Core/defined.js";

/** @import Event from "../Core/Event.js"; */
/** @import Matrix4 from "../Core/Matrix4.js"; */
/** @import GeometryAccessor from "./GeometryAccessor.js"; */

/**
 * Interface for objects that expose mesh-editable geometry, used to construct an {@link EditableMesh}.
 *
 * Implementers should set `this[Editable.symbol] = true;` so {@link Editable.isEditable} returns true.
 *
 * @interface
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class Editable {
  /** @type {GeometryAccessor} */
  geometryAccessor;

  /**
   * World-space model matrix the geometry is drawn under. Treat as read-only.
   * @type {Matrix4}
   */
  modelMatrix;

  /**
   * Raised when {@link Editable#modelMatrix} changes.
   * @type {Event<function(Matrix4): void>}
   */
  modelMatrixChanged;

  constructor() {
    //>>includeStart('debug', pragmas.debug);
    DeveloperError.throwInstantiationError();
    //>>includeEnd('debug');
  }

  /**
   * Brand symbol. Implementers set `this[Editable.symbol] = true`.
   * @type {symbol}
   */
  static symbol = Symbol("Editable");

  /**
   * @param {*} obj
   * @returns {boolean} True if `obj` is branded as an Editable.
   */
  static isEditable(obj) {
    return defined(obj) && obj[Editable.symbol] === true;
  }
}
export default Editable;
