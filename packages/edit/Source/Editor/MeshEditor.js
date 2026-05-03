import {
  KeyboardEventModifier,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  defined,
  DeveloperError,
} from "@cesium/engine";
import EditMode from "./EditMode";

/** @import Scene from "@cesium/engine"; */
/** @import EditableMesh from "../Mesh/EditableMesh"; */
/** @import Tool from "./Tool"; */

/**
 * MeshEditor is a place for high-level editor state and composition of multiple editable meshes and tools.
 * Tools and EditableMeshes should be able to exist independently of an editor - the editor simply coordinates
 * the behavior that depend on state independent of any single mesh or tool.
 *
 * See {@link EditableMesh}, {@link Tool}
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
     * All meshes added to the editor.
     * @type {Set<EditableMesh>}
     */
    this._meshes = new Set();

    /**
     * The meshes currently being edited.
     * via {@link MeshEditor#setMeshActive}.
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
     * @type {(() => void)|undefined}
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
    this._mode = value;

    for (const mesh of this._activeMeshes) {
      mesh.setEditMode(value);
    }

    if (defined(this._activeTool)) {
      this._activeTool.onModeChanged(value);
    }
  }

  /**
   * Adds a mesh to the editor.
   * @param {EditableMesh} mesh
   */
  addMesh(mesh) {
    //>>includeStart('debug', pragmas.debug);
    if (this._meshes.has(mesh)) {
      throw new DeveloperError("Mesh is already part of this editor");
    }
    //>>includeEnd('debug');

    this._meshes.add(mesh);
  }

  /**
   * Removes a mesh from the editor.
   * @param {EditableMesh} mesh
   */
  removeMesh(mesh) {
    //>>includeStart('debug', pragmas.debug);
    if (!this._meshes.has(mesh)) {
      throw new DeveloperError("Mesh is not part of this editor");
    }
    //>>includeEnd('debug');

    this._meshes.delete(mesh);
    this.setMeshInactive(mesh);
  }

  /**
   * Set a mesh as active for editing.
   *
   * @param {EditableMesh} mesh
   */
  setMeshActive(mesh) {
    //>>includeStart('debug', pragmas.debug);
    if (defined(mesh) && !this._meshes.has(mesh)) {
      throw new DeveloperError("Mesh is not part of this editor");
    }
    //>>includeEnd('debug');

    this._activeMeshes.add(mesh);
    mesh.setEditMode(this._mode);
  }

  /**
   * Set a mesh as inactive for editing.
   *
   * @param {EditableMesh} mesh
   */
  setMeshInactive(mesh) {
    //>>includeStart('debug', pragmas.debug);
    if (defined(mesh) && !this._meshes.has(mesh)) {
      throw new DeveloperError("Mesh is not part of this editor");
    }
    //>>includeEnd('debug');

    this._activeMeshes.delete(mesh);
    mesh.setEditMode(EditMode.NONE);
  }

  /**
   * Set or clear the active tool.
   * @param {Tool|undefined} tool
   */
  set activeTool(tool) {
    if (defined(this._activeTool)) {
      this._activeTool.deactivate();
    }

    this._activeTool = tool;
    if (!defined(this._activeTool)) {
      this.#removeMouseEvents();
      return;
    }

    this._activeTool.activate(() => this._activeMeshes, this._scene);
    this.#forwardMouseEvents(this._activeTool);
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
    this._meshes.clear();

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
