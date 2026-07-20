import ScreenSpaceElevatorCameraController from "./ScreenSpaceElevatorCameraController.js";
import ScreenSpaceMapCameraController from "./ScreenSpaceMapCameraController.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import CesiumMath from "../../Core/Math.js";

/**
 * A contextual camera controller that combines screenspace map panning and screenspace elevator panning. The controller automatically switches between the two based on the camera's angle relative to nadir. If the camera is looking mostly down (within angleThreshold of nadir), <code>ScreenSpaceMapCameraController</code> is used.
 * If the camera is looking towards the horizon (beyond angleThreshold from nadir), the <code>ScreenSpaceElevatorCameraController</code> is used.
 * @implements Controller
 * @example
 * viewer.scene.screenSpaceCameraController.enableInputs = false;
 * viewer.scene.screenSpaceCameraController.enableCollisionDetection = false;
 *
 * const hybridController = new HybridScreenSpacePanCameraController();
 * viewer.addController(hybridController);
 */
class HybridScreenSpacePanCameraController {
  constructor() {
    this._elevatorController = new ScreenSpaceElevatorCameraController();
    this._mapController = new ScreenSpaceMapCameraController();

    this._enabled = true;
    this._ellipsoidNormal = new Cartesian3();

    /**
     * The angle threshold in radians that determines which controller is used. If the camera is looking within this angle of nadir, the map controller is used. Otherwise, the elevator controller is used.
     * @type {number}
     * @default CesiumMath.toRadians(125)
     */
    this.angleThreshold = CesiumMath.toRadians(125);
  }

  get enabled() {
    return this._enabled;
  }

  set enabled(value) {
    this._enabled = value;
  }

  /**
   * The controller that is used when the camera is looking more horizontally (beyond angleThreshold from nadir).
   * @type {ScreenSpaceElevatorCameraController}
   * @readonly
   */
  get elevatorController() {
    return this._elevatorController;
  }

  /**
   * The controller that is used when the camera is looking mostly down (within angleThreshold of nadir).
   * @type {ScreenSpaceMapCameraController}
   * @readonly
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

export default HybridScreenSpacePanCameraController;
