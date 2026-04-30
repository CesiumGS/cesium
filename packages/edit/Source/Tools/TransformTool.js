import Tool from "./Tool.js";
import {
  Cartesian2,
  Cartesian3,
  defined,
  DeveloperError,
} from "@cesium/engine";

/** @import EditableMesh from "../Mesh/EditableMesh"; */
/** @import { Scene, ScreenSpaceEventHandler } from "@cesium/engine"; */

/**
 * Abstract base class for tools that transform the selected mesh components
 * by interpreting a screen-space drag (translate / rotate / scale).
 *
 * Lifecycle of a drag:
 *   onLeftDown  -> snapshot the closure's start positions and anchor frame,
 *                  capture the start mouse position, mark dragging.
 *   onMouseMove -> just update the latest mouse position.
 *   onPreRender -> if dragging and the latest mouse position differs from the
 *                  last applied one, call subclass {@link #applyDrag} to
 *                  recompute absolute positions from the snapshot, then
 *                  commit the EditableMesh.
 *   onLeftUp    -> end dragging. The edit session itself is owned by
 *                  {@link MeshEditor} and stays open across drags.
 *
 * Subclasses implement {@link TransformTool#applyDrag} to read the captured
 * snapshot + current mouse position and write absolute new positions to
 * each closure vertex.
 *
 * @abstract
 * @experimental This feature is not final and is subject to change without
 *   Cesium's standard deprecation policy.
 */
class TransformTool extends Tool {
  constructor() {
    super();

    /**
     * True between {@link #onLeftDown} and {@link #onLeftUp}.
     * @type {boolean}
     */
    this._dragging = false;

    /**
     * Centroid of the closure at drag start, in mesh-local coordinates.
     * @type {Cartesian3}
     */
    this._startCentroid = new Cartesian3();

    /**
     * Mouse position at drag start.
     * @type {Cartesian2}
     */
    this._startMousePosition = new Cartesian2();

    /**
     * Latest mouse position seen since drag start.
     * @type {Cartesian2}
     */
    this._currentMousePosition = new Cartesian2();

    /**
     * Last mouse position the drag was applied at.
     * @type {Cartesian2}
     */
    this._appliedMousePosition = new Cartesian2();
  }

  /**
   * @param {EditableMesh} activeMesh
   * @param {Scene} scene
   */
  activate(activeMesh, scene) {
    super.activate(activeMesh, scene);
    this.#toggleCameraController(false);
  }

  deactivate() {
    super.deactivate();
    this.#toggleCameraController(true);
    this._dragging = false;
  }

  /**
   * Initiates a drag, capturing the initial mouse position and the selection centroid.
   *
   * @param {ScreenSpaceEventHandler.PositionedEvent} event
   * @returns {boolean}
   */
  onLeftDown(event) {
    const selection = this._activeMesh.selection;
    if (selection.size === 0) {
      return false;
    }

    const localCentroid = selection.localCentroid(this._startCentroid);
    if (!defined(localCentroid)) {
      return false;
    }

    Cartesian2.clone(event.position, this._startMousePosition);
    Cartesian2.clone(event.position, this._currentMousePosition);
    Cartesian2.clone(event.position, this._appliedMousePosition);

    this._dragging = true;
    return true;
  }

  /**
   * @param {ScreenSpaceEventHandler.MotionEvent} event
   * @returns {boolean}
   */
  onMouseMove(event) {
    if (!this._dragging) {
      return false;
    }
    Cartesian2.clone(event.endPosition, this._currentMousePosition);
    return true;
  }

  /**
   * @param {ScreenSpaceEventHandler.PositionedEvent} event
   * @returns {boolean}
   */
  onLeftUp(event) {
    if (!this._dragging) {
      return false;
    }
    this._dragging = false;
    return true;
  }

  /**
   * Applies pending drag motion (if any) to the active mesh.
   *
   * @param {Scene} scene
   */
  onPreRender(scene) {
    if (!this._dragging) {
      return;
    }
    if (
      Cartesian2.equals(this._currentMousePosition, this._appliedMousePosition)
    ) {
      return;
    }

    this._applyDrag(scene);

    Cartesian2.clone(this._currentMousePosition, this._appliedMousePosition);
  }

  /**
   * Applies the drag from {@link #_appliedMousePosition} to
   * {@link #_currentMousePosition} to the active mesh's selection. Subclasses
   * must implement this. Implementations should not update
   * {@link #_appliedMousePosition}; the base class handles that.
   *
   * @abstract
   * @param {Scene} scene
   */
  _applyDrag(scene) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Toggles the camera controller's event handlers on or off.
   * @param {boolean} enable
   */
  #toggleCameraController(enable) {
    const cameraController = this._scene.screenSpaceCameraController;
    cameraController.enableRotate = enable;
    cameraController.enableLook = enable;
    cameraController.enableTranslate = enable;
    cameraController.inertiaSpin = Number(enable);
    cameraController.inertiaTranslate = Number(enable);
    cameraController.inertiaZoom = Number(enable);
  }
}

export default TransformTool;
