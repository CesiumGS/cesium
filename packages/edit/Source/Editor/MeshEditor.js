// @ts-check

import {
  AxisAlignedBoundingBox,
  Cartesian3,
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
import MeshEditorGroup from "./MeshEditorGroup.js";
import MeshEditorModule from "./MeshEditorModule.js";
import MeshEditorInputHandler from "./MeshEditorInputHandler.js";
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

// [minX, minY, minZ, maxX, maxY, maxZ], written by wasm.
const scratchBoundsArray = new Float64Array(6);
const scratchMinimum = new Cartesian3();
const scratchMaximum = new Cartesian3();
const scratchAabb = new AxisAlignedBoundingBox();

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
 * Meshes are organized in a hierarchy of {@link MeshEditorGroup}s, starting
 * at the editor's {@link MeshEditor#root} group. The hierarchy only organizes
 * meshes; it doesn't affect how they're placed or drawn.
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
 * const group = editor.addGroup({ name: "Milk truck" });
 * const mesh = editor.addMesh(model.nodes[0].primitives[0], { parent: group });
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

  /** @type {MeshEditorGroup} */
  #root = new MeshEditorGroup();

  /**
   * Every group in the editor, including the root.
   *
   * @type {Set<MeshEditorGroup>}
   */
  #groups = new Set([this.#root]);

  /** @type {MeshEditorStyle} */
  #style = new MeshEditorStyle();

  /** @type {Set<MeshEditorTool>} */
  #tools = new Set();

  /** @type {MeshEditorInputHandler} */
  #inputHandler;

  /**
   * @param {object} options
   * @param {*} options.module The loaded wasm module.
   * @param {Scene} options.scene The scene whose canvas receives pointer input.
   */
  constructor(options) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("options", options);
    Check.defined("options.module", options.module);
    Check.typeOf.object("options.scene", options.scene);
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

    /**
     * Raised when meshes or groups are added to or removed from a group.
     * Removing a group raises the event once, for the group's parent, and not
     * for the groups inside it. Not raised when the editor is destroyed.
     *
     * @type {Event<function(MeshEditorGroup): void>}
     */
    this.meshGroupChanged = new Event();

    /**
     * Raised when a mesh becomes active or inactive, whether by
     * {@link MeshEditor#setMeshActive}, {@link MeshEditor#setMeshInactive} or
     * a tool. The mesh and whether it's now active are passed to listeners.
     * <p>
     * Raised while rendering the next frame, once for each change since the
     * previous one. A mesh that's activated and then deactivated in between,
     * or set to the state it's already in, doesn't raise it. Not raised for
     * removed meshes; see {@link MeshEditor#meshRemoved}.
     * </p>
     *
     * @type {Event<function(Mesh, boolean): void>}
     */
    this.meshActiveChanged = new Event();

    /**
     * Raised when {@link MeshEditor#activeTool} changes. The new tool and the
     * previous tool are passed to listeners (either may be undefined).
     *
     * @type {Event<function((MeshEditorTool | undefined), (MeshEditorTool | undefined)): void>}
     */
    this.activeToolChanged = new Event();

    this.#inputHandler = new MeshEditorInputHandler({
      scene: options.scene,
      wasmEditor: this.#wasmEditor,
      meshes: this.#meshes,
    });
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
    return scene.primitives.add(new MeshEditor({ module, scene }));
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
   * The group at the top of the editor's hierarchy. Meshes and groups added
   * without a parent are added to it. It can't be removed.
   *
   * @type {MeshEditorGroup}
   * @readonly
   */
  get root() {
    return this.#root;
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
    const previousTool = this.activeTool;
    if (!defined(value)) {
      this.#wasmEditor.clearActiveTool();
      if (defined(previousTool)) {
        this.activeToolChanged.raiseEvent(undefined, previousTool);
      }
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

    if (value !== previousTool) {
      this.activeToolChanged.raiseEvent(value, previousTool);
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
    const previousTool = this.activeTool;
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

    const activeTool = this.activeTool;
    if (activeTool !== previousTool) {
      this.activeToolChanged.raiseEvent(activeTool, previousTool);
    }
    this.modeChanged.raiseEvent(value, previousMode);
  }

  /**
   * Adds a geometry source to the editor. If the source has a
   * <code>show</code> property, it's hidden while the mesh is in the editor.
   * The new mesh starts inactive.
   *
   * @param {GeometrySource} source The geometry to edit.
   * @param {object} [options] Object with the following properties:
   * @param {string} [options.name] The mesh's name.
   * @param {MeshEditorGroup} [options.parent] The group to add the mesh to. Defaults to {@link MeshEditor#root}.
   * @returns {Mesh} The mesh that edits the source.
   *
   * @exception {DeveloperError} The source was already added.
   * @exception {DeveloperError} options.parent isn't a group in this editor.
   * @exception {RuntimeError} The source's geometry can't be edited.
   */
  addMesh(source, options) {
    const name = options?.name;
    const parent = options?.parent ?? this.#root;

    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("source", source);
    if (this.#meshesBySource.has(source)) {
      throw new DeveloperError("The source was already added.");
    }
    this.#checkOptions(options);
    //>>includeEnd('debug');

    const key = this.#wasmEditor.addMesh(this.#createWasmMesh(source));

    const mesh = new Mesh({
      source,
      name,
      parent,
      key,
      module: this.#module,
      style: this.#style,
    });
    this.#setComponentMasks(mesh, INACTIVE_COMPONENTS, 0);
    this.#meshes.add(mesh);
    this.#meshesBySource.set(source, mesh);
    parent._addChild(mesh);

    this.meshAdded.raiseEvent(mesh);
    this.meshGroupChanged.raiseEvent(parent);

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
    if (!this.#meshes.has(mesh)) {
      return false;
    }

    const parent = mesh.parent;
    this.#removeMesh(mesh);
    this.meshGroupChanged.raiseEvent(parent);

    return true;
  }

  /**
   * Removes a mesh in the editor from it and its parent, raises
   * meshRemoved, and destroys it.
   *
   * @param {Mesh} mesh The mesh to remove.
   * @ignore
   */
  #removeMesh(mesh) {
    this.#meshes.delete(mesh);
    this.#meshesBySource.delete(mesh.source);
    mesh.parent._removeChild(mesh);

    this.#wasmEditor.removeMesh(mesh._key)?.free();
    // Before destroying the mesh, so listeners can still read it.
    this.meshRemoved.raiseEvent(mesh);
    mesh._destroy();
  }

  /**
   * Adds a group to the editor's hierarchy, to hold meshes and other groups.
   *
   * @param {object} [options] Object with the following properties:
   * @param {string} [options.name] The group's name.
   * @param {MeshEditorGroup} [options.parent] The group to add the group to. Defaults to {@link MeshEditor#root}.
   * @returns {MeshEditorGroup} The new group.
   *
   * @exception {DeveloperError} options.parent isn't a group in this editor.
   */
  addGroup(options) {
    const name = options?.name;
    const parent = options?.parent ?? this.#root;
    this.#checkOptions(options);

    const group = new MeshEditorGroup({ name, parent });
    this.#groups.add(group);
    parent._addChild(group);

    this.meshGroupChanged.raiseEvent(parent);

    return group;
  }

  /**
   * Removes a group and everything in it from the editor, and destroys them.
   * Each mesh in it is removed as by {@link MeshEditor#removeMesh}, raising
   * {@link MeshEditor#meshRemoved}.
   *
   * @param {MeshEditorGroup} group The group to remove.
   * @returns {boolean} <code>true</code> if the group was removed, <code>false</code> if it wasn't in the editor.
   *
   * @exception {DeveloperError} The root group can't be removed.
   */
  removeGroup(group) {
    //>>includeStart('debug', pragmas.debug);
    if (group === this.#root) {
      throw new DeveloperError("The root group can't be removed.");
    }
    //>>includeEnd('debug');

    if (!this.#groups.has(group)) {
      return false;
    }
    const parent = group.parent;
    if (!defined(parent)) {
      return false;
    }

    /** @type {MeshEditorGroup[]} */
    const removedGroups = [];
    this.#removeGroup(group, removedGroups);
    this.meshGroupChanged.raiseEvent(parent);

    for (const removedGroup of removedGroups) {
      removedGroup._destroy();
    }

    return true;
  }

  /**
   * Removes a group and everything in it from the editor and from their
   * parents, raising meshRemoved for each mesh. Destroys the meshes, but not
   * the groups.
   *
   * @param {MeshEditorGroup} group The group to remove.
   * @param {MeshEditorGroup[]} removedGroups Receives the removed groups, to destroy.
   * @ignore
   */
  #removeGroup(group, removedGroups) {
    this.#groups.delete(group);
    removedGroups.push(group);

    for (const child of group.children) {
      if (child instanceof MeshEditorGroup) {
        this.#removeGroup(child, removedGroups);
      } else {
        this.#removeMesh(child);
      }
    }

    group.parent?._removeChild(group);
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
   * Raises {@link MeshEditor#meshActiveChanged} on the next frame, unless
   * the mesh was already active.
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
   * Raises {@link MeshEditor#meshActiveChanged} on the next frame, unless
   * the mesh was already inactive.
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
   * Brings meshes up to date with the active state changes wasm reports since
   * the previous update, including those a tool made, then raises
   * meshActiveChanged for each. Wasm has already applied them, so
   * setMeshActive and setMeshInactive only update the JS side.
   *
   * @param {BigUint64Array} activatedMeshes The keys of the meshes that became active.
   * @param {BigUint64Array} deactivatedMeshes The keys of the meshes that became inactive, including removed ones.
   * @ignore
   */
  #syncActiveMeshes(activatedMeshes, deactivatedMeshes) {
    if (activatedMeshes.length === 0 && deactivatedMeshes.length === 0) {
      return;
    }

    const activatedKeys = new Set(activatedMeshes);
    const deactivatedKeys = new Set(deactivatedMeshes);
    /** @type {Array<{mesh: Mesh, active: boolean}>} */
    const changes = [];

    for (const mesh of this.#meshes) {
      if (activatedKeys.has(mesh._key)) {
        this.setMeshActive(mesh);
        changes.push({ mesh, active: true });
      } else if (deactivatedKeys.has(mesh._key)) {
        this.setMeshInactive(mesh);
        changes.push({ mesh, active: false });
      }
    }

    // Raised after every mesh is synced, so a listener's changes aren't
    // overwritten by the rest of the sync. Such changes are reported next frame.
    for (const { mesh, active } of changes) {
      // A listener may have removed the mesh.
      if (this.#meshes.has(mesh)) {
        this.meshActiveChanged.raiseEvent(mesh, active);
      }
    }
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
   * Checks the options for adding a mesh or group.
   *
   * @param {object} [options] The options.
   * @param {string} [options.name] The name.
   * @param {MeshEditorGroup} [options.parent] The parent.
   * @exception {DeveloperError} options.parent isn't a group in this editor.
   * @ignore
   */
  #checkOptions(options) {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(options)) {
      return;
    }
    Check.typeOf.object("options", options);
    if (defined(options.name)) {
      Check.typeOf.string("options.name", options.name);
    }
    if (defined(options.parent) && !this.#groups.has(options.parent)) {
      throw new DeveloperError("options.parent isn't a group in this editor.");
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
   * Called when rendering the scene. On render passes, runs the wasm update
   * and syncs the meshes that became active or inactive.
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
      const { changedOverlays, activatedMeshes, deactivatedMeshes } =
        this.#updateResult;
      changedKeys = new Set(changedOverlays);
      this.#syncActiveMeshes(activatedMeshes, deactivatedMeshes);
    }

    for (const mesh of this.#meshes) {
      let overlayViews;
      if (changedKeys?.has(mesh._key)) {
        mesh._renderer.setLocalBounds(this.#getMeshAABB(mesh._key));
        // Any call into wasm can invalidate the views, so read them last.
        overlayViews = this.#wasmEditor.overlayViews(mesh._key);
      }

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
   * property, and every group, and frees the editor's resources. The editor
   * can't be used afterwards. Removing the editor from the scene's
   * primitives, or destroying the scene, calls this.
   *
   * @returns {void}
   */
  destroy() {
    this.#inputHandler.destroy();

    for (const mesh of this.#meshes) {
      mesh._destroy();
    }
    for (const group of this.#groups) {
      group._destroy();
    }

    this.#updateResult.free();
    this.#wasmEditor.free();

    return destroyObject(this);
  }

  /**
   * @param {bigint} key The mesh's key.
   * @returns {AxisAlignedBoundingBox|undefined} The mesh's local-space bounds, in a scratch object, or undefined if it has no vertices.
   * @ignore
   */
  #getMeshAABB(key) {
    const bounds = scratchBoundsArray;
    if (!this.#wasmEditor.meshBounds(key, bounds)) {
      return undefined;
    }

    return AxisAlignedBoundingBox.fromCorners(
      Cartesian3.fromElements(bounds[0], bounds[1], bounds[2], scratchMinimum),
      Cartesian3.fromElements(bounds[3], bounds[4], bounds[5], scratchMaximum),
      scratchAabb,
    );
  }
}

export default MeshEditor;
