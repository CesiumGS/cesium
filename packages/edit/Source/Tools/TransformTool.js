import Tool from "./Tool.js";
import {
  Cartesian2,
  Cartesian3,
  defined,
  DeveloperError,
  Matrix4,
} from "@cesium/engine";

/** @import EditableMesh from "../Mesh/EditableMesh"; */
/** @import { Scene, ScreenSpaceEventHandler } from "@cesium/engine"; */

/**
 * @typedef {object} Transformable
 * A snapshot of one mesh's drag-start state, captured at {@link TransformTool#onLeftDown}.
 * @property {EditableMesh} mesh
 * @property {Matrix4} modelMatrix Mesh model matrix at drag start (clone).
 * @property {Matrix4} inverseModelMatrix Cached inverse of <code>modelMatrix</code>.
 * @property {Cartesian3} localCentroid Selection centroid in mesh-local space at drag start.
 * @property {number} vertexCount Number of vertices in the selection at drag start.
 * @private
 */

const scratchWorldCentroid = new Cartesian3();

/**
 * Abstract base class for tools that transform the selected mesh components
 * by interpreting a screen-space drag (translate / rotate / scale).
 *
 * Lifecycle of a drag:
 *   onLeftDown  -> snapshot each active mesh's drag-start state and the
 *                  shared world-space anchor, capture the start mouse
 *                  position, mark dragging.
 *   onMouseMove -> just update the latest mouse position.
 *   onPreRender -> if dragging and the latest mouse position differs from the
 *                  last applied one, call subclass {@link #_applyDrag} to
 *                  recompute and write new positions, then commit each
 *                  affected EditableMesh.
 *   onLeftUp    -> end dragging.
 *
 * Multi-mesh semantics: the snapshot is taken at <code>onLeftDown</code> and is
 * the source of truth for the duration of the drag. Changes to the active mesh
 * set after <code>onLeftDown</code> do not affect the in-progress drag.
 *
 * Subclasses implement {@link TransformTool#_applyDrag} to read the captured
 * snapshot + current mouse position and write new positions to each
 * snapshotted mesh's selection.
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
     * Per-mesh snapshot captured at drag start. Empty when not dragging.
     * @type {Transformable[]}
     */
    this._dragSnapshot = [];

    /**
     * Shared world-space anchor for the drag, computed at
     * <code>onLeftDown</code> as the vertex-count-weighted mean of each
     * snapshotted mesh's world-space selection centroid.
     * @type {Cartesian3}
     */
    this._worldAnchor = new Cartesian3();

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
   * @param {function(): Iterable<EditableMesh>} getMeshes A function that returns the set of meshes the tool can operate on.
   * @param {Scene} scene
   */
  activate(getMeshes, scene) {
    super.activate(getMeshes, scene);
    this.#toggleCameraController(false);
  }

  deactivate() {
    this.#toggleCameraController(true);
    super.deactivate();
    this._dragging = false;
    this._dragSnapshot.length = 0;
  }

  /**
   * Initiates a drag, capturing the initial mouse position, a per-mesh
   * snapshot of drag-start state, and the shared world-space anchor.
   *
   * @param {ScreenSpaceEventHandler.PositionedEvent} event
   * @returns {boolean}
   */
  onLeftDown(event) {
    this._dragSnapshot.length = 0;
    Cartesian3.clone(Cartesian3.ZERO, this._worldAnchor);

    let totalWeight = 0;

    for (const mesh of this._getMeshes()) {
      const selection = mesh.selection;
      if (selection.size === 0) {
        continue;
      }

      const localCentroid = selection.localCentroid(new Cartesian3());
      if (!defined(localCentroid)) {
        continue;
      }

      const modelMatrix = Matrix4.clone(mesh.modelMatrix, new Matrix4());
      const inverseModelMatrix = Matrix4.inverse(modelMatrix, new Matrix4());

      const worldCentroid = Matrix4.multiplyByPoint(
        modelMatrix,
        localCentroid,
        scratchWorldCentroid,
      );

      // Weight each mesh's world centroid by its selected-vertex count so
      // meshes with larger selections pull the shared anchor proportionally.
      const weight = selection.vertices.size;
      Cartesian3.multiplyByScalar(worldCentroid, weight, scratchWorldCentroid);
      Cartesian3.add(
        this._worldAnchor,
        scratchWorldCentroid,
        this._worldAnchor,
      );
      totalWeight += weight;

      this._dragSnapshot.push({
        mesh,
        modelMatrix,
        inverseModelMatrix,
        localCentroid,
        vertexCount: weight,
      });
    }

    if (this._dragSnapshot.length === 0 || totalWeight === 0) {
      return false;
    }

    Cartesian3.divideByScalar(
      this._worldAnchor,
      totalWeight,
      this._worldAnchor,
    );

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
    this._dragSnapshot.length = 0;
    return true;
  }

  /**
   * Applies pending drag motion (if any) to each snapshotted mesh.
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
   * {@link #_currentMousePosition} to each entry of {@link #_dragSnapshot}.
   * Subclasses must implement this. Implementations should not update
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
