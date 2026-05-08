import {
  KeyboardEventModifier,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  defined,
  DeveloperError,
  Event,
} from "@cesium/engine";
import EditMode from "./EditMode";
import EditableMesh from "../Mesh/EditableMesh";

/** @import { Editable, Scene } from "@cesium/engine"; */
/** @import Tool from "../Tools/Tool"; */

/**
 * MeshEditor is a place for high-level editor state and composition of multiple editable meshes and tools.
 * Tools and EditableMeshes should be able to exist independently of an editor - the editor simply coordinates
 * the behavior that depend on state independent of any single mesh or tool.
 *
 * Meshes are keyed by their underlying {@link Editable}; the editor lazily constructs and owns the
 * corresponding {@link EditableMesh} when an Editable is added.
 *
 * Consumers must call {@link MeshEditor#destroy} to release the event listeners and handlers.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class MeshEditor {
  /**
   * @param {object} options
   * @param {Scene} options.scene
   * @param {EditMode} [options.mode=EditMode.NONE]
   */
  constructor(options) {
    /**
     * The scene this editor is bound to. Tools may need access to the scene for
     * camera information, initiating picks, etc.
     * @type {Scene}
     */
    this._scene = options.scene;

    /**
     * Editable -> EditableMesh registry. The editor owns each EditableMesh created via {@link MeshEditor#addMesh}.
     * @type {Map<Editable, EditableMesh>}
     */
    this._editables = new Map();

    /**
     * Re-iterable view over {@link MeshEditor#_editables}'s values, handed
     * to tools via {@link Tool#activate}. {@link Map#values} returns a
     * single-use iterator, so we wrap it here to give tools a value they
     * can iterate multiple times during one input handler invocation.
     * @type {Iterable<EditableMesh>}
     */
    this._editableMeshesIterable = {
      [Symbol.iterator]: () => this._editables.values(),
    };

    /**
     * The meshes currently being edited.
     * @type {Set<EditableMesh>}
     */
    this._activeMeshes = new Set();

    /**
     * Handles canvas input (mouse/touch) and forwards events to the active tool.
     * @type {ScreenSpaceEventHandler}
     */
    this._eventHandler = new ScreenSpaceEventHandler(options.scene.canvas);

    /**
     * The tool currently receiving input events. Tools encapsulate
     * interaction modes (e.g. translate, extrude, edge-split).
     * @type {Tool|undefined}
     */
    this._activeTool = undefined;

    /**
     * Remover function returned by {@link Scene#preRender}.addEventListener,
     * or undefined when the editor is not subscribed.
     * @type {function(): void|undefined}
     */
    this._removePreRenderListener = this._scene.preRender.addEventListener(
      this._onPreRender,
      this,
    );

    /**
     * Current selection / interaction granularity.
     * @type {EditMode}
     */
    this._mode = options.mode ?? EditMode.NONE;

    /**
     * Raised when {@link MeshEditor#mode} changes. The new mode and the
     * previous mode are passed to listeners, in that order.
     * @type {Event<function(EditMode, EditMode): void>}
     */
    this.modeChanged = new Event();

    /**
     * Raised when {@link MeshEditor#activeTool} changes. The new tool and the
     * previous tool are passed to listeners (either may be undefined).
     * @type {Event<function((Tool|undefined), (Tool|undefined)): void>}
     */
    this.activeToolChanged = new Event();
  }

  /** @type {Set<EditableMesh>} */
  get activeMeshes() {
    return this._activeMeshes;
  }

  /** @type {Tool|undefined} */
  get activeTool() {
    return this._activeTool;
  }

  /** @type {EditMode} */
  get mode() {
    return this._mode;
  }

  set mode(value) {
    if (this._mode === value) {
      return;
    }
    const previous = this._mode;
    this._mode = value;

    for (const mesh of this._activeMeshes) {
      mesh.setEditMode(value);
    }

    if (
      defined(this._activeTool) &&
      !this._activeTool.supportsEditMode(value)
    ) {
      const previousTool = this._activeTool;
      previousTool.deactivate();
      this._activeTool = undefined;
      this.#removeMouseEvents();
      this.activeToolChanged.raiseEvent(undefined, previousTool);
    }

    this.modeChanged.raiseEvent(value, previous);
  }

  /**
   * Whether this editor has an EditableMesh registered for `editable`.
   * @param {Editable} editable
   * @returns {boolean}
   */
  hasMesh(editable) {
    return this._editables.has(editable);
  }

  /**
   * Returns the EditableMesh registered for `editable`, or undefined.
   * @param {Editable} editable
   * @returns {EditableMesh|undefined}
   */
  getMesh(editable) {
    return this._editables.get(editable);
  }

  /**
   * Whether the EditableMesh registered for `editable` is currently active.
   * @param {Editable} editable
   * @returns {boolean}
   */
  isMeshActive(editable) {
    const mesh = this._editables.get(editable);
    return defined(mesh) && this._activeMeshes.has(mesh);
  }

  /**
   * Adds an Editable to the editor, lazily constructing an EditableMesh for it.
   * If the Editable is already registered, the existing EditableMesh is returned.
   *
   * @param {Editable} editable
   * @param {object} [options] Forwarded to the {@link EditableMesh} constructor (the editor's scene is supplied automatically).
   * @returns {EditableMesh}
   */
  addMesh(editable, options) {
    const existing = this._editables.get(editable);
    if (defined(existing)) {
      return existing;
    }

    const mesh = new EditableMesh(editable, {
      scene: this._scene,
      ...options,
    });
    this._editables.set(editable, mesh);
    return mesh;
  }

  /**
   * Removes an Editable (and its EditableMesh) from the editor. If the mesh is active,
   * it is deactivated first.
   *
   * @param {Editable} editable
   * @param {boolean} [commitChanges=true] If true and the mesh is active, commit pending changes before deactivating.
   */
  removeMesh(editable, commitChanges = true) {
    const mesh = this._editables.get(editable);
    //>>includeStart('debug', pragmas.debug);
    if (!defined(mesh)) {
      throw new DeveloperError("Editable is not part of this editor");
    }
    //>>includeEnd('debug');

    if (this._activeMeshes.has(mesh)) {
      this.setMeshInactive(editable, commitChanges);
    }
    this._editables.delete(editable);
  }

  /**
   * Set a mesh as active for editing.
   *
   * @param {Editable} editable
   */
  setMeshActive(editable) {
    const mesh = this._editables.get(editable);
    //>>includeStart('debug', pragmas.debug);
    if (!defined(mesh)) {
      throw new DeveloperError("Editable is not part of this editor");
    }
    //>>includeEnd('debug');

    if (this._activeMeshes.has(mesh)) {
      return;
    }

    this._activeMeshes.add(mesh);
    mesh.setEditMode(this._mode);
    mesh.openEditSession();
  }

  /**
   * Set a mesh as inactive for editing.
   *
   * @param {Editable} editable
   * @param {boolean} [commitChanges=true] If true, commit changes before closing the session. If false, discard changes and just destroy the session.
   */
  setMeshInactive(editable, commitChanges = true) {
    const mesh = this._editables.get(editable);
    //>>includeStart('debug', pragmas.debug);
    if (!defined(mesh)) {
      throw new DeveloperError("Editable is not part of this editor");
    }
    //>>includeEnd('debug');

    if (!this._activeMeshes.has(mesh)) {
      return;
    }

    this._activeMeshes.delete(mesh);
    mesh.setEditMode(EditMode.NONE);
    mesh.closeEditSession(commitChanges);
  }

  /**
   * Flips the active state of an Editable's mesh, registering the Editable first if needed.
   *
   * @param {Editable} editable
   * @returns {boolean} The new active state.
   */
  toggleMeshActive(editable) {
    if (!this._editables.has(editable)) {
      this.addMesh(editable);
    }

    if (this.isMeshActive(editable)) {
      this.setMeshInactive(editable);
      return false;
    }

    this.setMeshActive(editable);
    return true;
  }

  /**
   * Set or clear the active tool.
   * @param {Tool|undefined} tool
   */
  set activeTool(tool) {
    if (defined(tool) && !tool.supportsEditMode(this._mode)) {
      console.warn("The tool does not support the current edit mode");
      return;
    }

    if (this._activeTool === tool) {
      return;
    }

    const previous = this._activeTool;
    if (defined(previous)) {
      previous.deactivate();
    }

    this._activeTool = tool;
    if (!defined(this._activeTool)) {
      this.#removeMouseEvents();
      this.activeToolChanged.raiseEvent(undefined, previous);
      return;
    }

    this._activeTool.activate(() => this._editableMeshesIterable, this._scene);
    this.#forwardMouseEvents(this._activeTool);
    this.activeToolChanged.raiseEvent(this._activeTool, previous);
  }

  /**
   * Forwards mouse events from the event handler to the active tool.
   * @param {Tool} tool
   */
  #forwardMouseEvents(tool) {
    this._eventHandler.setInputAction(
      (/** @type {ScreenSpaceEventHandler.PositionedEvent} */ event) => {
        tool.onLeftDown(event);
      },
      ScreenSpaceEventType.LEFT_DOWN,
    );

    this._eventHandler.setInputAction(
      (/** @type {ScreenSpaceEventHandler.PositionedEvent} */ event) => {
        tool.onLeftUp(event);
      },
      ScreenSpaceEventType.LEFT_UP,
    );

    this._eventHandler.setInputAction(
      (/** @type {ScreenSpaceEventHandler.PositionedEvent} */ event) => {
        tool.onShiftLeftUp(event);
      },
      ScreenSpaceEventType.LEFT_UP,
      KeyboardEventModifier.SHIFT,
    );

    this._eventHandler.setInputAction(
      (/** @type {ScreenSpaceEventHandler.MotionEvent} */ event) => {
        tool.onMouseMove(event);
      },
      ScreenSpaceEventType.MOUSE_MOVE,
    );

    this._eventHandler.setInputAction(
      (/** @type {ScreenSpaceEventHandler.PositionedEvent} */ event) => {
        tool.onLeftClick(event);
      },
      ScreenSpaceEventType.LEFT_CLICK,
    );
  }

  /**
   * Removes mouse event handlers from the event handler.
   */
  #removeMouseEvents() {
    this._eventHandler.removeInputAction(ScreenSpaceEventType.LEFT_DOWN);
    this._eventHandler.removeInputAction(ScreenSpaceEventType.LEFT_UP);
    this._eventHandler.removeInputAction(
      ScreenSpaceEventType.LEFT_UP,
      KeyboardEventModifier.SHIFT,
    );
    this._eventHandler.removeInputAction(ScreenSpaceEventType.MOUSE_MOVE);
    this._eventHandler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
  }

  /**
   * Releases the event handler, preRender subscription, and any tool/selection
   * resources. The active EditableMesh is not destroyed (it is app-owned).
   */
  destroy() {
    this._activeMeshes.clear();
    this._editables.clear();

    if (defined(this._activeTool)) {
      this._activeTool.deactivate();
      this._activeTool = undefined;
    }
    if (defined(this._removePreRenderListener)) {
      this._removePreRenderListener();
      this._removePreRenderListener = undefined;
    }

    this._eventHandler = this._eventHandler && this._eventHandler.destroy();
  }

  /**
   * Per-frame update; invoked from the scene's preRender event. Forwards to
   * the active tool.
   * @param {Scene} scene
   * @private
   */
  _onPreRender(scene) {
    if (defined(this._activeTool)) {
      this._activeTool.onPreRender(scene);
    }
  }
}

export default MeshEditor;
