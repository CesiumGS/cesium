import {
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
   * @param {EditMode} [options.mode=EditMode.VERTEX]
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
    this._removePreRenderListener = undefined;

    /**
     * Current selection / interaction granularity.
     * @type {EditMode}
     */
    this._mode = options.mode ?? EditMode.VERTEX;
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

  set mode(value) {}

  /**
   * Set or clear the mesh this editor operates on. Passing `undefined` detaches
   * the editor from any mesh.
   * @param {EditableMesh|undefined} mesh
   */
  set activeMesh(mesh) {
    this._activeMesh = mesh;

    if (defined(this._activeTool)) {
      this._activeTool.onActiveMeshChanged(mesh);
    }
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
    this._eventHandler.removeInputAction(ScreenSpaceEventType.MOUSE_MOVE);
    this._eventHandler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
  }

  /**
   * Releases the event handler, preRender subscription, and any tool/selection
   * resources. The active EditableMesh is not destroyed (it is app-owned).
   */
  destroy() {}

  /**
   * Per-frame update; invoked from the scene's preRender event.
   * @private
   */
  _onPreRender() {}
}

export default MeshEditor;
