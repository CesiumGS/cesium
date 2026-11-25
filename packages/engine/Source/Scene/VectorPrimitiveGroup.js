// @ts-check

import { destroyObject } from "@cesium/core";
import VectorPrimitive from "./VectorPrimitive.js";

/** @import BufferPrimitive from "./BufferPrimitive.js"; */
/** @import BufferPrimitiveCollection from "./BufferPrimitiveCollection.js"; */
/** @import FeatureLayer from "./FeatureLayer.js"; */
/** @import FrameState from "./FrameState.js"; */
/** @import VectorGltf3DTileContent from "./VectorGltf3DTileContent.js"; */
/** @import VectorStyle from "./VectorStyle.js"; */

/**
 * @typedef {object} VectorPrimitiveGroupOptions
 * @property {Array<VectorPrimitive|VectorPrimitiveGroup>} [primitives] The members of the group, in drawing order.
 * @property {string} [name] The name of the group.
 * @property {boolean} [show=true] Whether the group is drawn.
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */

/**
 * An ordered group of {@link VectorPrimitive} instances and nested groups,
 * drawn in order when added to {@link Scene#primitives}. The group owns its
 * members and destroys them when it is destroyed.
 *
 * @example
 * const vectors = style.createPrimitives(collection);
 * viewer.scene.primitives.add(vectors);
 * vectors.get(vectors.getPrimitiveIndexByName("labels")).show = false;
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @see VectorStyle#createPrimitives
 */
class VectorPrimitiveGroup {
  /**
   * @param {VectorPrimitiveGroupOptions} [options]
   */
  constructor(options = {}) {
    /**
     * @type {Array<VectorPrimitive|VectorPrimitiveGroup>}
     * @private
     */
    this._primitives = [...(options.primitives ?? [])];

    /**
     * @type {string|undefined}
     * @private
     */
    this._name = options.name;

    /**
     * Whether the group is drawn.
     * @type {boolean}
     * @default true
     */
    this.show = options.show ?? true;

    /**
     * The style that tile contents draw the feature layer with, for a group
     * returned by {@link VectorStyle#compile}.
     * @type {VectorStyle|undefined}
     * @ignore
     */
    this._style = undefined;

    /**
     * The feature layer of a group returned by {@link VectorStyle#compile}.
     * @type {FeatureLayer|undefined}
     * @ignore
     */
    this._featureLayer = undefined;

    /**
     * Collections owned by the group and destroyed with it.
     * @type {Array<BufferPrimitiveCollection<BufferPrimitive>>}
     * @ignore
     */
    this._collections = [];

    /**
     * Tile contents holding primitives for the group, released when it is destroyed.
     * @type {Set<VectorGltf3DTileContent>}
     * @ignore
     */
    this._contents = new Set();
  }

  /**
   * The name of the group.
   *
   * @type {string|undefined}
   * @readonly
   */
  get name() {
    return this._name;
  }

  /**
   * The number of members in the group.
   *
   * @type {number}
   * @readonly
   */
  get length() {
    return this._primitives.length;
  }

  /**
   * Returns the member at the given index.
   *
   * @param {number} index The index of the member.
   * @returns {VectorPrimitive|VectorPrimitiveGroup} The member.
   */
  get(index) {
    return this._primitives[index];
  }

  /**
   * Returns the index of the first member group with the given name.
   *
   * @param {string} name The name of the group.
   * @returns {number} The index of the member, or -1 if no member has the name.
   */
  getPrimitiveIndexByName(name) {
    return this._primitives.findIndex(
      (primitive) =>
        primitive instanceof VectorPrimitiveGroup && primitive.name === name,
    );
  }

  /**
   * Returns the vector primitives of the group and its nested groups, in
   * drawing order.
   *
   * @param {VectorPrimitive[]} [result] The array to append the vector primitives to.
   * @returns {VectorPrimitive[]} The vector primitives.
   */
  flatten(result = []) {
    for (const primitive of this._primitives) {
      if (primitive instanceof VectorPrimitive) {
        result.push(primitive);
      } else {
        primitive.flatten(result);
      }
    }
    return result;
  }

  /**
   * @param {FrameState} frameState
   * @ignore
   */
  update(frameState) {
    if (!this.show || this._featureLayer?.show === false) {
      return;
    }

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
   * Destroys the members of the group.
   */
  destroy() {
    this._featureLayer?._vectorPrimitiveGroups.delete(this);
    for (const content of this._contents) {
      content._removeStyledPrimitives(this);
    }
    this._contents.clear();
    for (const primitive of this._primitives) {
      primitive.destroy();
    }
    this._primitives.length = 0;
    for (const collection of this._collections) {
      collection.destroy();
    }
    this._collections.length = 0;
    return destroyObject(this);
  }
}

export default VectorPrimitiveGroup;
