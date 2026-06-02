// @ts-check

import DeveloperError from "../Core/DeveloperError.js";
import defined from "../Core/defined.js";

/** @import Color from "../Core/Color.js"; */

/**
 * Interface for objects that can render a visual highlight (e.g. for hover or selection).
 * Implementers choose how the highlight is rendered (silhouette, outline, tint - in the future, maybe the
 * highlight type becomes a part of this interface).
 *
 * Implementers should set `this[Highlightable.symbol] = true;` so {@link Highlightable.isHighlightable} returns true.
 *
 * @interface
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class Highlightable {
  constructor() {
    //>>includeStart('debug', pragmas.debug);
    DeveloperError.throwInstantiationError();
    //>>includeEnd('debug');
  }

  /**
   * @param {Color|undefined} color Highlight color, or `undefined` to clear.
   * @param {number|undefined} intensity Highlight intensity, or `undefined` to use default.
   */
  setHighlight(color, intensity) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Brand symbol. Implementers set `this[Highlightable.symbol] = true`.
   * @type {symbol}
   */
  static symbol = Symbol("Highlightable");

  /**
   * @param {*} obj
   * @returns {boolean} True if `obj` is branded as a Highlightable.
   */
  static isHighlightable(obj) {
    return defined(obj) && obj[Highlightable.symbol] === true;
  }
}

export default Highlightable;
