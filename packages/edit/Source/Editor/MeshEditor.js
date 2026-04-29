import { ScreenSpaceEventHandler } from "@cesium/engine";
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
  set activeMesh(mesh) {}

  /**
   * Set or clear the active tool.
   * @param {Tool|undefined} tool
   */
  set activeTool(tool) {}

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
