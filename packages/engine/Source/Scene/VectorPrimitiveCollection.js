// @ts-check

import { Check, destroyObject } from "@cesium/core";

/** @import FrameState from "./FrameState.js"; */
/** @import VectorPrimitive from "./VectorPrimitive.js"; */

/**
 * An ordered collection of {@link VectorPrimitive} instances drawn by a scene.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @see Scene#vectorPrimitives
 */
class VectorPrimitiveCollection {
  constructor() {
    /**
     * @type {VectorPrimitive[]}
     * @private
     */
    this._primitives = [];
  }

  /**
   * The number of vector primitives in the collection.
   *
   * @type {number}
   * @readonly
   */
  get length() {
    return this._primitives.length;
  }

  /**
   * Adds a vector primitive to the collection.
   *
   * @param {VectorPrimitive} primitive The vector primitive to add.
   * @param {number} [index] The index to add the vector primitive at. If omitted, it is added after all existing vector primitives.
   * @returns {VectorPrimitive} The added vector primitive.
   *
   * @exception {DeveloperError} index, if supplied, must be greater than or equal to zero and less than or equal to the number of vector primitives.
   */
  add(primitive, index) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("primitive", primitive);
    if (index !== undefined) {
      Check.typeOf.number.greaterThanOrEquals("index", index, 0);
      Check.typeOf.number.lessThanOrEquals(
        "index",
        index,
        this._primitives.length,
      );
    }
    //>>includeEnd('debug');

    if (index === undefined) {
      this._primitives.push(primitive);
    } else {
      this._primitives.splice(index, 0, primitive);
    }

    return primitive;
  }

  /**
   * Removes a vector primitive from the collection, if present.
   *
   * @param {VectorPrimitive} primitive The vector primitive to remove.
   * @param {boolean} [destroy=true] Whether to destroy the vector primitive in addition to removing it.
   * @returns {boolean} <code>true</code> if the vector primitive was removed; <code>false</code> if it was not in the collection.
   */
  remove(primitive, destroy = true) {
    const index = this._primitives.indexOf(primitive);
    if (index === -1) {
      return false;
    }

    this._primitives.splice(index, 1);
    if (destroy) {
      primitive.destroy();
    }

    return true;
  }

  /**
   * Removes all vector primitives from the collection.
   *
   * @param {boolean} [destroy=true] Whether to destroy the vector primitives in addition to removing them.
   */
  removeAll(destroy = true) {
    if (destroy) {
      for (const primitive of this._primitives) {
        primitive.destroy();
      }
    }

    this._primitives.length = 0;
  }

  /**
   * Determines whether the collection contains a vector primitive.
   *
   * @param {VectorPrimitive} primitive The vector primitive to check for.
   * @returns {boolean} <code>true</code> if the collection contains the vector primitive; otherwise, <code>false</code>.
   */
  contains(primitive) {
    return this._primitives.includes(primitive);
  }

  /**
   * Returns the vector primitive at the given index.
   *
   * @param {number} index The index of the vector primitive.
   * @returns {VectorPrimitive} The vector primitive at the given index.
   */
  get(index) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.number("index", index);
    //>>includeEnd('debug');

    return this._primitives[index];
  }

  /**
   * @param {FrameState} frameState
   * @ignore
   */
  update(frameState) {
    for (const primitive of this._primitives) {
      primitive.update(frameState);
    }
  }

  /**
   * Returns true if this object was destroyed; otherwise, false.
   *
   * @returns {boolean} True if this object was destroyed; otherwise, false.
   */
  isDestroyed() {
    return false;
  }

  /**
   * Destroys every vector primitive in the collection, then the collection itself.
   */
  destroy() {
    this.removeAll(true);
    return destroyObject(this);
  }
}

export default VectorPrimitiveCollection;
