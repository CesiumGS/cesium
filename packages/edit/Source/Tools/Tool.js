/** @import MeshEditor from "../Editor/MeshEditor"; */
/** @import EditableMesh from "../Mesh/EditableMesh"; */
/** @import EditMode from "../Editor/EditMode"; */
/** @import { Cartesian3, Cartesian2, Scene } from "@cesium/engine"; */

/**
 * Abstract base class for tools used in mesh editing.
 *
 * A Tool is attached to a {@link MeshEditor} via {@link MeshEditor#activeTool}.
 * The editor owns the {@link ScreenSpaceEventHandler} and preRender subscription
 * and forwards events to the active tool's {@link Tool#onLeftDown},
 * {@link Tool#onLeftUp}, {@link Tool#onMouseMove}, and {@link Tool#onPreRender}
 * methods. Tools should not subscribe to scene events directly.
 *
 * Input handlers should return <code>true</code> if the event was handled and
 * should not propagate further, otherwise <code>false</code>.
 *
 * @abstract
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class Tool {
  constructor() {}

  /**
   * Called by {@link MeshEditor} when this tool becomes active. Tools should perform setup here. Any
   * setup actions performed here should be idempotent.
   * @param {EditableMesh} activeMesh
   * @param {Scene} scene
   */
  activate(activeMesh, scene) {
    this._activeMesh = activeMesh;
    this._scene = scene;
  }

  /**
   * Called by {@link MeshEditor} when this tool is replaced.
   */
  deactivate() {
    this._activeMesh = undefined;
    this._scene = undefined;
  }

  /**
   * @param {ScreenSpaceEventHandler.PositionedEvent} event
   * @returns {boolean}
   */
  onLeftDown(event) {
    return false;
  }

  /**
   * @param {ScreenSpaceEventHandler.PositionedEvent} event
   * @returns {boolean}
   */
  onLeftUp(event) {
    return false;
  }

  /**
   * @param {ScreenSpaceEventHandler.MotionEvent} event
   * @returns {boolean}
   */
  onMouseMove(event) {
    return false;
  }

  /**
   * @param {ScreenSpaceEventHandler.PositionedEvent} event
   * @returns {boolean}
   */
  onLeftClick(event) {
    return false;
  }

  /**
   * Per-frame hook, invoked by the {@link MeshEditor}'s preRender subscription.
   * @param {Scene} scene
   */
  onPreRender(scene) {}

  /**
   * Called when the editor's active mesh has changed. The new mesh may be
   * undefined if the editor has been detached from any mesh.
   * @param {EditableMesh|undefined} mesh
   */
  onActiveMeshChanged(mesh) {}

  /**
   * Called when the editor's edit mode has changed.
   * @param {EditMode} mode
   */
  onModeChanged(mode) {}
}

export default Tool;
