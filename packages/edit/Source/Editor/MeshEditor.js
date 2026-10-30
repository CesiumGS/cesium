// @ts-check
/* eslint-disable no-unused-private-class-members -- Scaffold. Remove once implemented. */

import { Check, DeveloperError, destroyObject } from "@cesium/core";
import {
  MeshEditor as WasmMeshEditor,
  UpdateResult,
} from "@cesium/mesh-editor";
import EditMode from "./EditMode.js";
import MeshEditorModule from "./MeshEditorModule.js";

/** @import { FrameState, GeometrySource, Scene } from "@cesium/engine"; */
/** @import Mesh from "./Mesh.js"; */

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
   * @param {*} options.module The loaded wasm module.
   */
  constructor(options) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("options", options);
    Check.defined("options.module", options.module);
    //>>includeEnd('debug');

    this.#module = options.module;
    this.#wasmEditor = new WasmMeshEditor();
    this.#updateResult = new UpdateResult();
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
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("scene", scene);
    //>>includeEnd('debug');

    const module = await MeshEditorModule.load();
    return scene.primitives.add(new MeshEditor({ module }));
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
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.number("value", value);
    //>>includeEnd('debug');

    if (value === this.#mode) {
      return;
    }

    this.#wasmEditor.setMode(value);
    this.#mode = value;

    const { renderableComponents } = this.#wasmEditor;
    for (const mesh of this.#meshes) {
      mesh._renderer.setShownComponents(renderableComponents);
    }
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
    let changedKeys;
    if (frameState.passes.render) {
      // TODO: pass in real timestep. Currently unused by wasm update, but may be needed in the future.
      this.#wasmEditor.update(0.0, this.#updateResult);
      changedKeys = new Set(this.#updateResult.changedOverlays);
    }

    for (const mesh of this.#meshes) {
      // Any call into wasm can invalidate the views, so use and dispose.
      const overlayViews = changedKeys?.has(mesh._key)
        ? this.#wasmEditor.overlayViews(mesh._key)
        : undefined;

      mesh._update(frameState, overlayViews);
    }
  }

  /**
   * @returns {boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
   */
  isDestroyed() {
    return false;
  }

  /**
   * Destroys every mesh, which shows its source if it has a <code>show</code>
   * property, and frees the editor's resources. The editor can't be used
   * afterwards. Removing the editor from the scene's primitives, or
   * destroying the scene, calls this.
   *
   * @returns {void}
   */
  destroy() {
    for (const mesh of this.#meshes) {
      mesh._destroy();
    }

    this.#updateResult.free();
    this.#wasmEditor.free();

    return destroyObject(this);
  }
}

export default MeshEditor;
