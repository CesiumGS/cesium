// @ts-check

import { DeveloperError } from "@cesium/core";

/** @import { Event } from "@cesium/core"; */
/** @import Mesh from "../../Editor/Mesh.js"; */

/**
 * Supplies the tree of items an outliner displays for a {@link MeshEditor}.
 * <p>
 * Items can be any objects: meshes, the objects their sources belong to (like
 * a model's nodes), or groups that exist only to organize the tree. Currently,
 * only items that map to a mesh can be selected.
 * </p>
 * <p>
 * Items are compared by identity, so return the same object for the same item
 * every time, and include each item in the tree at most once.
 * </p>
 *
 * @interface
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @see EditorMeshTreeProvider
 */
class MeshTreeProvider {
  constructor() {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Raised once for each change to the tree, with the item the change
   * belongs to: one whose label or mesh changed, or whose children were
   * added, removed or reordered. <code>undefined</code> means the root items
   * changed, or the whole tree should be refreshed. Listeners should re-read
   * the item and everything beneath it.
   *
   * @type {Event<function(*): void>}
   * @readonly
   */
  get changed() {
    return DeveloperError.throwInstantiationError();
  }

  /**
   * Gets an item's children, in display order. Callers don't modify the
   * array, so it can be one the provider keeps.
   *
   * @param {*} [item] The item, or <code>undefined</code> for the root items.
   * @returns {ReadonlyArray<*>} The children, or an empty array for none.
   */
  getChildren(item) {
    return DeveloperError.throwInstantiationError();
  }

  /**
   * @param {*} item The item.
   * @returns {string} The text to display for the item.
   */
  getLabel(item) {
    return DeveloperError.throwInstantiationError();
  }

  /**
   * Gets the mesh that selecting an item selects.
   *
   * @param {*} item The item.
   * @returns {Mesh|undefined} The mesh, or <code>undefined</code> if the item can't be selected.
   */
  getMesh(item) {
    return DeveloperError.throwInstantiationError();
  }
}

export default MeshTreeProvider;
