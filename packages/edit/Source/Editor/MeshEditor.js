// @ts-check

import {
  Check,
  DeveloperError,
  Event,
  RuntimeError,
  defined,
  destroyObject,
} from "@cesium/core";
import {
  GeometryAttributeDescriptor,
  VertexAttributeSemantic,
} from "@cesium/engine";
import {
  ComponentType,
  Mesh as WasmMesh,
  MeshEditor as WasmMeshEditor,
  UpdateResult,
} from "@cesium/mesh-editor";
import EditMode from "./EditMode.js";
import Mesh from "./Mesh.js";
import MeshEditorModule from "./MeshEditorModule.js";
import MeshEditorStyle from "./MeshEditorStyle.js";

/** @import { FrameState, GeometryReadSession, GeometrySource, Scene } from "@cesium/engine"; */
/** @import { ComponentMask } from "@cesium/mesh-editor"; */
/** @import MeshEditorTool from "./MeshEditorTool.js"; */

// The attribute read from each source.
const POSITION_ATTRIBUTE = new GeometryAttributeDescriptor({
  semantic: VertexAttributeSemantic.POSITION,
});

// The data read from each source.
const READ_OPTIONS = { attributes: [POSITION_ATTRIBUTE], primitives: true };

// The components inactive meshes draw, so they stay visible. Wasm's policy
// covers only active meshes.
const INACTIVE_COMPONENTS = 1 << ComponentType.Face;

// Faces should always be rendered in the pick pass, regardless of edit mode, so that
// points and edges that are not visible (because they're behind a face) can't be picked.
// Also, _something_ needs to be pickable in EditMode.NONE, in order to select an object to be active.
const ALWAYS_PICKABLE_COMPONENTS = 1 << ComponentType.Face;

/**
 * <div class="notice">
 * Use {@link MeshEditor.addToScene} to create an editor. Do not call the
 * constructor directly.
 * </div>
 *
 * Edits geometry in a scene. Each added {@link GeometrySource} is replaced by
 * an editable {@link Mesh}. Active meshes are drawn as vertices, edges and
 * faces according to the editor's {@link EditMode}, and are the ones it edits.
 * In {@link EditMode.NONE}, they're drawn as outlined faces. Inactive meshes
 * are drawn as faces. {@link MeshEditor#style} sets how meshes are drawn.
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
 * editor.setMeshActive(mesh);
 * editor.mode = Cesium.EditMode.VERTEX;
 * editor.activeTool = Cesium.SelectTool.addTo(editor);
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

  /** @type {Map<GeometrySource, Mesh>} */
  #meshesBySource = new Map();

  /** @type {MeshEditorStyle} */
  #style = new MeshEditorStyle();

  /** @type {Set<MeshEditorTool>} */
  #tools = new Set();

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

    /**
     * Raised when {@link MeshEditor#mode} changes. The new mode and the
     * previous mode are passed to listeners, in that order.
     *
     * @type {Event<function(EditMode, EditMode): void>}
     */
    this.modeChanged = new Event();

    /**
     * Raised after {@link MeshEditor#addMesh} adds a mesh. The new mesh is
     * passed to listeners.
     *
     * @type {Event<function(Mesh): void>}
     */
    this.meshAdded = new Event();

    /**
     * Raised when {@link MeshEditor#removeMesh} removes a mesh. The mesh is
     * passed to listeners. It's no longer in the editor, but isn't destroyed
     * until the listeners return. Not raised when the editor is destroyed.
     *
     * @type {Event<function(Mesh): void>}
     */
    this.meshRemoved = new Event();
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
   * How the editor's meshes are drawn. Changes apply on the next frame.
   *
   * @type {MeshEditorStyle}
   * @readonly
   */
  get style() {
    return this.#style;
  }

  /**
   * The editor's meshes, in the order they were added. A new array each time,
   * so changing it doesn't change the editor.
   *
   * @type {Mesh[]}
   * @readonly
   */
  get meshes() {
    return Array.from(this.#meshes);
  }

  /**
   * The tool that receives pointer input, or <code>undefined</code> for none.
   *
   * @type {MeshEditorTool | undefined}
   * @default undefined
   *
   * @exception {DeveloperError} The tool isn't in this editor.
   * @exception {DeveloperError} The tool doesn't support the current mode.
   */
  get activeTool() {
    const id = this.#wasmEditor.activeTool;
    for (const tool of this.#tools) {
      if (tool._id === id) {
        return tool;
      }
    }
    return undefined;
  }

  set activeTool(value) {
    if (!defined(value)) {
      this.#wasmEditor.clearActiveTool();
      return;
    }

    //>>includeStart('debug', pragmas.debug);
    if (!this.#tools.has(value)) {
      throw new DeveloperError("The tool isn't in this editor.");
    }
    //>>includeEnd('debug');

    try {
      this.#wasmEditor.setActiveTool(value._id);
    } catch (error) {
      throw new DeveloperError(`The tool can't be activated: ${error.message}`);
    }
  }

  /**
   * Adds a new wasm tool to the editor and creates its handle. Called by each
   * tool type's <code>addTo</code>.
   *
   * @template {MeshEditorTool} T
   * @param {function(new:T, object)} ToolType The handle's type.
   * @param {function(WasmMeshEditor): number} addToWasm Adds the wasm tool and returns its ID.
   * @returns {T} The new tool.
   * @ignore
   */
  _addTool(ToolType, addToWasm) {
    const wasmEditor = this.#wasmEditor;
    const id = addToWasm(wasmEditor);

    const tool = new ToolType({ wasmEditor, id });
    this.#tools.add(tool);

    return tool;
  }

  /**
   * Which components of the active meshes are edited. Changing the mode may
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

    const previousMode = this.#mode;
    this.#wasmEditor.setMode(value);
    this.#mode = value;

    const { renderableComponents, selectableComponents } = this.#wasmEditor;
    for (const mesh of this.#meshes) {
      if (this.#wasmEditor.isMeshActive(mesh._key)) {
        this.#setComponentMasks(
          mesh,
          renderableComponents,
          selectableComponents,
        );
        mesh._renderer.outlined = value === EditMode.NONE;
      }
    }

    this.modeChanged.raiseEvent(value, previousMode);
  }

  /**
   * Adds a geometry source to the editor. If the source has a
   * <code>show</code> property, it's hidden while the mesh is in the editor.
   * The new mesh starts inactive.
   *
   * @param {GeometrySource} source The geometry to edit.
   * @returns {Mesh} The mesh that edits the source.
   *
   * @exception {DeveloperError} The source was already added.
   * @exception {RuntimeError} The source's geometry can't be edited.
   */
  addMesh(source) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("source", source);
    if (this.#meshesBySource.has(source)) {
      throw new DeveloperError("The source was already added.");
    }
    //>>includeEnd('debug');

    const key = this.#wasmEditor.addMesh(this.#createWasmMesh(source));

    const mesh = new Mesh({
      source,
      key,
      module: this.#module,
      style: this.#style,
    });
    this.#setComponentMasks(mesh, INACTIVE_COMPONENTS, 0);
    this.#meshes.add(mesh);
    this.#meshesBySource.set(source, mesh);

    this.meshAdded.raiseEvent(mesh);

    return mesh;
  }

  /**
   * Removes a mesh from the editor and destroys it. If its source has a
   * <code>show</code> property, it's set to <code>true</code>.
   *
   * @param {Mesh} mesh The mesh to remove.
   * @returns {boolean} <code>true</code> if the mesh was removed, <code>false</code> if it wasn't in the editor.
   */
  removeMesh(mesh) {
    if (!this.#meshes.delete(mesh)) {
      return false;
    }
    this.#meshesBySource.delete(mesh.source);

    this.#wasmEditor.removeMesh(mesh._key)?.free();
    // Before destroying the mesh, so listeners can still read it.
    this.meshRemoved.raiseEvent(mesh);
    mesh._destroy();

    return true;
  }

  /**
   * @param {Mesh} mesh The mesh to look for.
   * @returns {boolean} <code>true</code> if the mesh is in the editor, <code>false</code> otherwise.
   */
  hasMesh(mesh) {
    return this.#meshes.has(mesh);
  }

  /**
   * @param {GeometrySource} source The geometry source to look for.
   * @returns {Mesh|undefined} The mesh that edits the source, or <code>undefined</code> if the source isn't in the editor.
   */
  getMesh(source) {
    return this.#meshesBySource.get(source);
  }

  /**
   * Makes a mesh active, so the editor's mode applies to it. Outlines it in
   * {@link EditMode.NONE}. Cancels the active tool's current interaction.
   *
   * @param {Mesh} mesh The mesh to edit.
   *
   * @exception {DeveloperError} The mesh isn't in the editor.
   */
  setMeshActive(mesh) {
    this.#checkMesh(mesh);

    this.#wasmEditor.setMeshActive(mesh._key);
    const { renderableComponents, selectableComponents } = this.#wasmEditor;
    this.#setComponentMasks(mesh, renderableComponents, selectableComponents);
    mesh._renderer.outlined = this.#mode === EditMode.NONE;
  }

  /**
   * Makes a mesh inactive, so it's drawn as faces and not edited. Its
   * selection is kept. Cancels the active tool's current interaction.
   *
   * @param {Mesh} mesh The mesh to stop editing.
   *
   * @exception {DeveloperError} The mesh isn't in the editor.
   */
  setMeshInactive(mesh) {
    this.#checkMesh(mesh);

    this.#wasmEditor.setMeshInactive(mesh._key);
    this.#setComponentMasks(mesh, INACTIVE_COMPONENTS, 0);
    mesh._renderer.outlined = false;
  }

  /**
   * @param {Mesh} mesh The mesh to check.
   * @returns {boolean} <code>true</code> if the mesh is active, <code>false</code> otherwise.
   *
   * @exception {DeveloperError} The mesh isn't in the editor.
   */
  isMeshActive(mesh) {
    this.#checkMesh(mesh);

    return this.#wasmEditor.isMeshActive(mesh._key);
  }

  /**
   * Sets which of a mesh's components to draw and pick. Components that are
   * drawn but can't be selected, like edges in Face mode, aren't pickable, so
   * they don't interfere with picking the selectable components (like vertices) around them.
   *
   * @param {Mesh} mesh The mesh.
   * @param {ComponentMask} shownComponents The components to draw.
   * @param {ComponentMask} selectableComponents The components that can be selected.
   * @ignore
   */
  #setComponentMasks(mesh, shownComponents, selectableComponents) {
    const renderer = mesh._renderer;
    renderer.setShownComponents(shownComponents);
    renderer.setPickableComponents(
      selectableComponents | ALWAYS_PICKABLE_COMPONENTS,
    );
  }

  /**
   * Wasm keys only identify meshes within one editor, so a mesh from another
   * editor could match a different mesh in this one.
   *
   * @param {Mesh} mesh The mesh to check.
   * @exception {DeveloperError} The mesh isn't in the editor.
   * @ignore
   */
  #checkMesh(mesh) {
    //>>includeStart('debug', pragmas.debug);
    if (!this.#meshes.has(mesh)) {
      throw new DeveloperError("The mesh isn't in this editor.");
    }
    //>>includeEnd('debug');
  }

  /**
   * Reads a source's geometry into a new wasm mesh.
   *
   * @param {GeometrySource} source The geometry to read.
   * @returns {WasmMesh} The wasm mesh.
   * @exception {RuntimeError} The source's geometry can't be edited.
   * @ignore
   */
  #createWasmMesh(source) {
    const { positions, indices, faceVertexCounts } =
      source.geometryReader.withReadSession(
        READ_OPTIONS,
        MeshEditor.#readBuffers,
      );

    try {
      // At the moment, we have no use for normals or UVs in the wasm module, so don't read them or pass them in.
      return WasmMesh.fromBuffers(
        positions,
        indices,
        undefined,
        undefined,
        faceVertexCounts,
      );
    } catch (error) {
      throw new RuntimeError(`The geometry can't be edited: ${error.message}`);
    }
  }

  /**
   * Reads a session's positions and primitives as wasm mesh buffers. Each
   * primitive becomes a face.
   *
   * @param {GeometryReadSession} session The read session.
   * @returns {{ positions: Float32Array, indices: Uint32Array, faceVertexCounts: Uint32Array }} The buffers.
   * @ignore
   */
  static #readBuffers(session) {
    const vertexCount = session.vertexCount();
    const positions = new Float32Array(vertexCount * 3);
    const readPosition = session.vertexAttributeReader(POSITION_ATTRIBUTE);
    for (let i = 0; i < vertexCount; ++i) {
      readPosition(i, positions, i * 3);
    }

    const primitiveCount = session.primitiveCount();
    const faceVertexCounts = new Uint32Array(primitiveCount);
    let indexCount = 0;
    for (let i = 0; i < primitiveCount; ++i) {
      faceVertexCounts[i] = session.primitiveVertexCount(i);
      indexCount += faceVertexCounts[i];
    }

    const indices = new Uint32Array(indexCount);
    const readPrimitive = session.primitiveReader();
    let offset = 0;
    for (let i = 0; i < primitiveCount; ++i) {
      readPrimitive(i, indices, offset);
      offset += faceVertexCounts[i];
    }

    return { positions, indices, faceVertexCounts };
  }

  /**
   * Called when rendering the scene. On render passes, runs the wasm update.
   * Then updates each mesh's renderer, passing overlay views for meshes whose
   * overlays changed, and adds the outlines.
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

    for (const mesh of this.#meshes) {
      mesh._renderer.pushOutlineCommands(frameState);
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
