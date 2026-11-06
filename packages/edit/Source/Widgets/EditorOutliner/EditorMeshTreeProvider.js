// @ts-check

import {
  Check,
  Event,
  EventHelper,
  defined,
  destroyObject,
} from "@cesium/core";

/** @import Mesh from "../../Editor/Mesh.js"; */
/** @import MeshEditor from "../../Editor/MeshEditor.js"; */
/** @import MeshTreeProvider from "./MeshTreeProvider.js"; */

/**
 * A {@link MeshTreeProvider} that lists every mesh in a {@link MeshEditor}, in
 * the order they were added, with no hierarchy. Meshes are labeled
 * "Mesh 1", "Mesh 2", and so on, numbered in the order the provider first
 * sees them. The numbers don't change when other meshes are removed.
 *
 * @alias EditorMeshTreeProvider
 * @constructor
 * @implements {MeshTreeProvider}
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @param {MeshEditor} editor The editor whose meshes to list.
 */
class EditorMeshTreeProvider {
  /** @type {MeshEditor} */
  #editor;

  /** @type {Event<function(*): void>} */
  #changed = new Event();

  #eventHelper = new EventHelper();

  /** @type {WeakMap<Mesh, number>} */
  #numbers = new WeakMap();

  #nextNumber = 1;

  /**
   * @param {MeshEditor} editor The editor whose meshes to list.
   */
  constructor(editor) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("editor", editor);
    //>>includeEnd('debug');

    this.#editor = editor;

    for (const mesh of editor.meshes) {
      this.#getNumber(mesh);
    }

    this.#eventHelper.add(editor.meshAdded, (mesh) => {
      this.#getNumber(mesh);
      this.#changed.raiseEvent(undefined);
    });

    this.#eventHelper.add(editor.meshRemoved, () => {
      this.#changed.raiseEvent(undefined);
    });
  }

  /**
   * The editor whose meshes are listed.
   *
   * @type {MeshEditor}
   * @readonly
   */
  get editor() {
    return this.#editor;
  }

  /**
   * Raised with <code>undefined</code> when a mesh is added to or removed from
   * the editor.
   *
   * @type {Event<function(*): void>}
   * @readonly
   */
  get changed() {
    return this.#changed;
  }

  /**
   * @param {*} [item] A mesh, or <code>undefined</code> for the root items.
   * @returns {ReadonlyArray<*>} The editor's meshes for the root, or an empty array for a mesh.
   */
  getChildren(item) {
    return defined(item) ? [] : this.#editor.meshes;
  }

  /**
   * @param {Mesh} mesh The mesh.
   * @returns {string} The mesh's label.
   */
  getLabel(mesh) {
    return `Mesh ${this.#getNumber(mesh)}`;
  }

  /**
   * @param {Mesh} mesh The mesh.
   * @returns {Mesh} The mesh itself.
   */
  getMesh(mesh) {
    return mesh;
  }

  /**
   * Gets a mesh's number, assigning the next one if it doesn't have one yet.
   *
   * @param {Mesh} mesh The mesh.
   * @returns {number} The mesh's number.
   * @ignore
   */
  #getNumber(mesh) {
    let number = this.#numbers.get(mesh);
    if (!defined(number)) {
      number = this.#nextNumber++;
      this.#numbers.set(mesh, number);
    }
    return number;
  }

  /**
   * @returns {boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
   */
  isDestroyed() {
    return false;
  }

  /**
   * Stops listening to the editor. The provider can't be used afterwards.
   */
  destroy() {
    this.#eventHelper.removeAll();
    destroyObject(this);
  }
}

export default EditorMeshTreeProvider;
