import {
  KeyboardEventModifier,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  defined,
} from "@cesium/engine";
import EditMode from "./EditMode";

/** @import Scene from "@cesium/engine"; */
/** @import EditableMesh from "../Mesh/EditableMesh"; */
/** @import Tool from "./Tool"; */

/**
 * Top-level driver for interactive mesh editing.
 *
 * A MeshEditor is bound to a {@link Scene} and operates on whichever
 * {@link EditableMesh} is currently set as active. The application owns the
 * EditableMesh; the editor only references it. The editor owns the
 * input-handling and per-frame update machinery (event handler, active tool,
 * selection, preRender subscription) and routes scene events to the active
 * {@link Tool}.
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
     * The mesh currently being edited. Application-owned; may be swapped out
     * via {@link MeshEditor#setActiveMesh}.
     * @type {EditableMesh|undefined}
     */
    this._activeMesh = undefined;

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

  /** @type {EditableMesh|undefined} */
  get activeMesh() {
    return this._activeMesh;
  }

  /** @type {Tool|undefined} */
  get activeTool() {
    return this._activeTool;
  }

  /** @type {EditMode} */
  get mode() {
    return this._mode;
  }

  // TODO: mode changes should invalidate the current selection. This should be an event EditableMesh listens to.
  set mode(value) {
    if (this._mode === value) {
      return;
    }
    this._mode = value;
    this.#applyModeToActiveOverlay();
    if (defined(this._activeTool)) {
      this._activeTool.onModeChanged(value);
    }
  }

  /**
   * Set or clear the mesh this editor operates on. Passing `undefined` detaches
   * the editor from any mesh.
   *
   * TODO: EditableMesh should probably be responsible for itself and its overlay
   * when it stops being the active mesh. For now this is fine.
   * @param {EditableMesh|undefined} mesh
   */
  set activeMesh(mesh) {
    // Reset the previously-active mesh's overlay to the NONE policy so it
    // no longer participates in render or pick.
    this.#applyComponentsToOverlay(this._activeMesh, EditMode.NONE);

    this._activeMesh = mesh;
    this.#applyModeToActiveOverlay();

    if (defined(this._activeTool)) {
      this._activeTool.onActiveMeshChanged(mesh);
    }
  }

  /**
   * Push the current mode's renderable/pickable component sets onto the
   * active mesh's topology overlay. Called whenever the mode or the active
   * mesh changes. No-op if there is no active mesh.
   */
  #applyModeToActiveOverlay() {
    this.#applyComponentsToOverlay(this._activeMesh, this._mode);
  }

  /**
   * @param {EditableMesh|undefined} mesh
   * @param {EditMode} mode
   */
  #applyComponentsToOverlay(mesh, mode) {
    const overlay = mesh?.topologyOverlay;
    if (!defined(overlay)) {
      return;
    }
    overlay.setComponentMasks(
      mode.renderableComponents,
      mode.pickableComponents,
    );
  }

  /**
   * Set or clear the active tool.
   * @param {Tool|undefined} tool
   */
  set activeTool(tool) {
    if (defined(this.activeTool)) {
      this.activeTool.deactivate();
    }

    this._activeTool = tool;
    if (!defined(this._activeTool)) {
      this.#removeMouseEvents();
      return;
    }

    this._activeTool.activate(this._activeMesh, this._scene);
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
    this.#applyComponentsToOverlay(this._activeMesh, EditMode.NONE);

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
