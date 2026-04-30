import TransformTool from "./TransformTool.js";
import {
  Cartesian3,
  defined,
  IntersectionTests,
  Matrix4,
  Plane,
  Ray,
} from "@cesium/engine";

/** @import { ScreenSpaceEventHandler, Scene } from "@cesium/engine"; */

const scratchAppliedRay = new Ray();
const scratchCurrentRay = new Ray();
const scratchAppliedHit = new Cartesian3();
const scratchCurrentHit = new Cartesian3();
const scratchWorldDelta = new Cartesian3();
const scratchLocalDelta = new Cartesian3();
const scratchInverseModel = new Matrix4();
const scratchPlaneNormal = new Cartesian3();
const scratchWorldCentroid = new Cartesian3();

/**
 * Translates the active mesh's selection along a drag plane perpendicular to
 * the camera view direction, anchored at the selection's centroid.
 *
 * @experimental This feature is not final and is subject to change without
 *   Cesium's standard deprecation policy.
 */
class TranslateTool extends TransformTool {
  constructor() {
    super();

    /**
     * The drag plane in world space, anchored at the selection centroid at
     * drag start and oriented perpendicular to the camera view direction.
     * @type {Plane | undefined}
     */
    this._dragPlane = undefined;
  }

  /**
   * @param {ScreenSpaceEventHandler.PositionedEvent} event
   * @returns {boolean}
   */
  onLeftDown(event) {
    if (!super.onLeftDown(event)) {
      return false;
    }

    const worldCentroid = Matrix4.multiplyByPoint(
      this._activeMesh.modelMatrix,
      this._startCentroid,
      scratchWorldCentroid,
    );

    const normal = Cartesian3.negate(
      this._scene.camera.directionWC,
      scratchPlaneNormal,
    );
    Cartesian3.normalize(normal, normal);

    this._dragPlane = Plane.fromPointNormal(
      worldCentroid,
      normal,
      this._dragPlane,
    );

    return true;
  }

  /**
   * @param {Scene} scene
   */
  _applyDrag(scene) {
    const camera = scene.camera;

    const appliedRay = camera.getPickRay(
      this._appliedMousePosition,
      scratchAppliedRay,
    );
    const currentRay = camera.getPickRay(
      this._currentMousePosition,
      scratchCurrentRay,
    );

    const appliedHit = IntersectionTests.rayPlane(
      appliedRay,
      this._dragPlane,
      scratchAppliedHit,
    );
    const currentHit = IntersectionTests.rayPlane(
      currentRay,
      this._dragPlane,
      scratchCurrentHit,
    );
    if (!defined(appliedHit) || !defined(currentHit)) {
      return;
    }

    const worldDelta = Cartesian3.subtract(
      currentHit,
      appliedHit,
      scratchWorldDelta,
    );

    const inverseModel = Matrix4.inverse(
      this._activeMesh.modelMatrix,
      scratchInverseModel,
    );
    const localDelta = Matrix4.multiplyByPointAsVector(
      inverseModel,
      worldDelta,
      scratchLocalDelta,
    );

    this._activeMesh.translateSelected(localDelta);
    this._activeMesh.commit();
  }
}

export default TranslateTool;
