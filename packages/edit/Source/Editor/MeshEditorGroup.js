// @ts-check

import { destroyObject } from "@cesium/core";

/** @import Mesh from "./Mesh.js"; */

/**
 * <div class="notice">
 * Use {@link MeshEditor#addGroup} to create a group. Do not call the
 * constructor directly.
 * </div>
 *
 * A group in a {@link MeshEditor}'s hierarchy, holding meshes and other
 * groups. Each editor has a {@link MeshEditor#root} group, which holds the
 * meshes and groups added without a parent. A group belongs to one editor,
 * and is destroyed when removed from it.
 *
 * @alias MeshEditorGroup
 * @internalConstructor
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class MeshEditorGroup {
  /** @type {string|undefined} */
  #name;

  /** @type {MeshEditorGroup|undefined} */
  #parent;

  /** @type {Set<Mesh|MeshEditorGroup>} */
  #children = new Set();

  /**
   * @param {object} [options]
   * @param {string} [options.name] The group's name.
   * @param {MeshEditorGroup} [options.parent] The group holding this one, or <code>undefined</code> for an editor's root group.
   */
  constructor(options) {
    this.#name = options?.name;
    this.#parent = options?.parent;
  }

  /**
   * The group's name, or <code>undefined</code> if it wasn't given one.
   *
   * @type {string|undefined}
   * @readonly
   */
  get name() {
    return this.#name;
  }

  /**
   * The group holding this one, or <code>undefined</code> for the editor's
   * root group.
   *
   * @type {MeshEditorGroup|undefined}
   * @readonly
   */
  get parent() {
    return this.#parent;
  }

  /**
   * The meshes and groups in this group, in the order they were added. A new
   * array each time, so changing it doesn't change the group.
   *
   * @type {Array<Mesh|MeshEditorGroup>}
   * @readonly
   */
  get children() {
    return Array.from(this.#children);
  }

  /**
   * Adds a mesh or group to the end of the children. Called by the editor.
   *
   * @param {Mesh|MeshEditorGroup} child The mesh or group.
   * @ignore
   */
  _addChild(child) {
    this.#children.add(child);
  }

  /**
   * Removes a mesh or group from the children. Called by the editor.
   *
   * @param {Mesh|MeshEditorGroup} child The mesh or group.
   * @ignore
   */
  _removeChild(child) {
    this.#children.delete(child);
  }

  /**
   * @returns {boolean} <code>true</code> if the group was removed from its editor; otherwise, <code>false</code>.
   */
  isDestroyed() {
    return false;
  }

  /**
   * Called by the editor when it removes the group, or is destroyed.
   *
   * @ignore
   */
  _destroy() {
    destroyObject(this);
  }
}

export default MeshEditorGroup;
