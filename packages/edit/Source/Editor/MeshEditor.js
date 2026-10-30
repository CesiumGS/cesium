// @ts-check
/* eslint-disable no-unused-private-class-members -- Scaffold. Remove once implemented. */

import { DeveloperError } from "@cesium/core";
import EditMode from "./EditMode.js";

/** @import { FrameState, GeometrySource, Scene } from "@cesium/engine"; */
/** @import { MeshEditor as WasmMeshEditor, UpdateResult } from "@cesium/mesh-editor"; */
/** @import Mesh from "./Mesh.js"; */
/** @import MeshEditorModule from "./MeshEditorModule.js"; */

/**
 * <div class="notice">
 * Use {@link MeshEditor.addToScene} to create an editor. Do not call the
 * constructor directly.
 * </div>
 *
 * Edits geometry in a scene. Each added {@link GeometrySource} is replaced by
 * an editable {@link Mesh}, drawn as vertices, edges and faces according to
 * the editor's {@link EditMode}.
 *
 * The editor is a primitive in the scene's primitive collection. Remove it
 * with <code>scene.primitives.remove(editor)</code>, which destroys it.
 *
 * @alias MeshEditor
 * @internalConstructor
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @example
 * const editor = await Cesium.MeshEditor.addToScene(viewer.scene);
 * const mesh = editor.addMesh(model.nodes[0].primitives[0]);
 * editor.mode = Cesium.EditMode.VERTEX;
 */
class MeshEditor {
  /** @type {MeshEditorModule} */
  #module;

  /** @type {WasmMeshEditor} */
  #wasmEditor;

  /**
   * Reused by every wasm update.
   *
   * @type {UpdateResult}
   */
  #updateResult;

  /** @type {EditMode} */
  #mode = EditMode.NONE;

  /** @type {Set<Mesh>} */
  #meshes = new Set();

  /**
   * @param {object} options
   * @param {object} options.module The loaded wasm module.
   */
  constructor(options) {
    throw new DeveloperError("Not implemented.");
  }

  /**
   * Creates a mesh editor and adds it to the scene's primitives. Loads the
   * mesh editing WebAssembly module on first use.
   *
   * @param {Scene} scene The scene to edit in.
   * @returns {Promise<MeshEditor>} The new editor.
   *
   * @exception {RuntimeError} This browser does not support WebAssembly, which mesh editing requires.
   */
  static async addToScene(scene) {
    throw new DeveloperError("Not implemented.");
  }

  /**
   * Which components of the meshes are edited. Changing the mode may
   * deactivate the active tool.
   *
   * @type {EditMode}
   * @default EditMode.NONE
   */
  get mode() {
    return this.#mode;
  }

  set mode(value) {
    throw new DeveloperError("Not implemented.");
  }

  /**
   * Adds a geometry source to the editor. If the source has a
   * <code>show</code> property, it's hidden while the mesh is in the editor.
   *
   * @param {GeometrySource} source The geometry to edit.
   * @returns {Mesh} The mesh that edits the source.
   *
   * @exception {DeveloperError} The source was already added.
   * @exception {RuntimeError} The source's geometry can't be edited.
   */
  addMesh(source) {
    throw new DeveloperError("Not implemented.");
  }

  /**
   * Removes a mesh from the editor and destroys it. If its source has a
   * <code>show</code> property, it's set to <code>true</code>.
   *
   * @param {Mesh} mesh The mesh to remove.
   * @returns {boolean} <code>true</code> if the mesh was removed, <code>false</code> if it wasn't in the editor.
   */
  removeMesh(mesh) {
    throw new DeveloperError("Not implemented.");
  }

  /**
   * @param {Mesh} mesh The mesh to look for.
   * @returns {boolean} <code>true</code> if the mesh is in the editor, <code>false</code> otherwise.
   */
  hasMesh(mesh) {
    throw new DeveloperError("Not implemented.");
  }

  /**
   * Called when rendering the scene. On render passes, runs the wasm update.
   * Then updates each mesh's renderer, passing overlay views for meshes whose
   * overlays changed.
   * <p>
   * Do not call this function directly.
   * </p>
   *
   * @param {FrameState} frameState The frame state.
   * @private
   */
  update(frameState) {
    throw new DeveloperError("Not implemented.");
  }

  /**
   * @returns {boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
   */
  isDestroyed() {
    return false;
  }

  /**
   * Destroys every mesh, which shows its source if it has a <code>show</code>
   * property, and frees the editor's resources. The editor
   * can't be used afterwards. Removing the editor from the scene's primitives
   * calls this.
   *
   * @returns {void}
   */
  destroy() {
    throw new DeveloperError("Not implemented.");
  }
}

export default MeshEditor;
