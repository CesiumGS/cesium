import ScreenspaceElevatorCameraController from "./ScreenspaceElevatorCameraController.js";
import ScreenspaceMapCameraController from "./ScreenspaceMapCameraController.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import CesiumMath from "../../Core/Math.js";

/**
 * A contextual camera controller that combines screenspace panning and screenspace map controls.
 * Based on the camera angle, either a screenspace pan or screenspace map controller is used:
 * - If the camera is looking mostly down (within angleThreshold of nadir), the screenspace map controller is used.
 * - If the camera is looking more horizontally (beyond angleThreshold from nadir), the screenspace pan controller is used.
 * @implements Controller
 * @example
 * const hybridController = new HybridScreenspacePanCameraController();
 * viewer.addController(hybridController);
 */
export default class HybridScreenspacePanCameraController {
  constructor() {
    this._elevatorController = new ScreenspaceElevatorCameraController();
    this._mapController = new ScreenspaceMapCameraController();

    this._enabled = true;
    this._ellipsoidNormal = new Cartesian3();

    /**
     * The angle threshold in radians that determines which controller is used. If the camera is looking within this angle of nadir, the map controller is used. Otherwise, the elevator controller is used.
     */
    this.angleThreshold = CesiumMath.toRadians(180 - 55);
  }

  get enabled() {
    return this._enabled;
  }

  set enabled(value) {
    this._enabled = value;
  }

  /**
   * The controller that is used when the camera is looking more horizontally (beyond angleThreshold from nadir).
   * @type {ScreenspaceElevatorCameraController}
   */
  get elevatorController() {
    return this._elevatorController;
  }

  /**
   * The controller that is used when the camera is looking mostly down (within angleThreshold of nadir).
   * @type {ScreenspaceMapCameraController}
   */
  get mapController() {
    return this._mapController;
  }

    /**
   * @inheritdoc
   * @param {HTMLElement} element The DOM element containing the Cesium scene.
   */
  connectedCallback(element) {
    this._elevatorController.connectedCallback(element);
    this._mapController.connectedCallback(element);
  }

    /**
   * @inheritdoc
   * @param {HTMLElement} element The DOM element containing the Cesium scene.
   */
  disconnectedCallback(element) {
    this._elevatorController.disconnectedCallback(element);
    this._mapController.disconnectedCallback(element);
  }

    /**
   * @inheritdoc
   */
  firstUpdate() {
    this._elevatorController.firstUpdate();
    this._mapController.firstUpdate();
  }

      /**
   * @inheritdoc
   * @param {Scene} scene
   */
  update(scene) {
    const camera = scene.camera;
    const normal = scene.ellipsoid.geodeticSurfaceNormal(
      camera.positionWC,
      this._ellipsoidNormal,
    );

    const angle = Math.abs(Cartesian3.angleBetween(normal, camera.directionWC));
    const activeController =
      angle < this.angleThreshold
        ? this._elevatorController
        : this._mapController;

    activeController.update(scene);
  }
}
