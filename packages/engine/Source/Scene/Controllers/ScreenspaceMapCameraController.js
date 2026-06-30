import Cartesian2 from "../../Core/Cartesian2.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import defined from "../../Core/defined.js";
import Frozen from "../../Core/Frozen.js";
import getTimestamp from "../../Core/getTimestamp.js";
import CesiumMath from "../../Core/Math.js";
import ScreenSpaceEventHandler from "../../Core/ScreenSpaceEventHandler.js";
import TimeConstants from "../../Core/TimeConstants.js";
import ScreenspaceInputBindings from "./ScreenspaceInputBindings.js";
import MouseButton from "./MouseButton.js";

/**
 * @typedef {object} ControllerOptions
 * @memberof ScreenspaceMapCameraController
 * @property {ScreenspaceInputBindings.InputBinding[]} [dragInputs] The drag input bindings that control panning.
 */

/**
 * A camera controller that allows panning the camera tangential to the ellipsoid in screen space
 * by clicking and dragging the mouse.
 * @class
 * @alias ScreenspaceMapCameraController
 * @implements Controller
 * @example
 * viewer.scene.screenSpaceCameraController.enableInputs = false;
 *
 * const mapCameraController = new Cesium.ScreenspaceMapCameraController();
 * viewer.addController(mapCameraController);
 *
 * @example
 * // Configure the controller to use the right mouse button for panning instead of the default left mouse button.
 * const mapCameraController = new Cesium.ScreenspaceMapCameraController({
 *  dragInputs: [{ button: Cesium.MouseButton.RIGHT}]
 * });
 * viewer.addController(mapCameraController);
 */
class ScreenspaceMapCameraController {
  /**
   * @private
   * @returns {ScreenspaceInputBindings.InputBinding[]} The default drag input bindings.
   */
  static _getDefaultDragInputs() {
    return [
      Object.freeze({
        button: MouseButton.LEFT,
      }),
    ];
  }

  /**
   * Creates an instance of a ScreenspaceMapCameraController.
   * @param {ScreenspaceMapCameraController.ControllerOptions} [options] The options for configuring the controller.
   */
  constructor(options = Frozen.EMPTY_OBJECT) {
    this._enabled = true;
    this._handler = undefined;
    this._lastUpdateTime = undefined;

    /**
     * The drag input bindings that map panning. Each binding is a combination of the mouse button
     * and an optional keyboard modifier.
     * @type {ScreenspaceInputBindings.InputBinding[]}
     * @see ScreenSpaceEventHandler
     */
    this.dragInputs =
      options.dragInputs ??
      ScreenspaceMapCameraController._getDefaultDragInputs();

    this._isPanning = false;
    this._panDelta = new Cartesian2();
    this._panPosition = new Cartesian2();

    this._ellipsoidNormal = new Cartesian3();
    this._ellipsoidSurfacePosition = new Cartesian3();
    this._panDirectionX = new Cartesian3();
    this._panDirectionY = new Cartesian3();
    this._pixelSize = new Cartesian2();
    this._panVelocity = new Cartesian2();

    /**
     * The speed in meters per pixel at which the camera pans.
     * @type {number}
     * @default 1.0
     */
    this.panSpeed = 1.0;

    /**
     * The rate at which the camera's pan velocity decays over time.
     * @type {number}
     * @default 6.0
     */
    this.inertialDecay = 6.0;

    /**
     * A parameter in the range <code>[0, 1)</code> used to limit the range
     * of inputs to a percentage of the window width/height per animation frame.
     * This helps keep the camera under control in low-frame-rate situations.
     * @type {number}
     * @default 0.1
     */
    this.maximumMovementRatio = 0.1;
  }

  /**
   * @inheritdoc
   */
  get enabled() {
    return this._enabled;
  }
  set enabled(value) {
    this._enabled = value;

    if (value) {
      this._panDelta.x = 0;
      this._panDelta.y = 0;
    } else {
      this._isPanning = false;
    }
  }

  /**
   * @inheritdoc
   * @param {HTMLElement} element The DOM element containing the Cesium scene.
   */
  connectedCallback(element) {
    const handler = new ScreenSpaceEventHandler(element);
    this._handler = handler;

    ScreenspaceInputBindings.registerDragInputBindings(
      handler,
      this.dragInputs,
      {
        start: this._handleStartPan.bind(this),
        end: this._handleStopPan.bind(this),
        move: this._handlePan.bind(this),
      },
    );
  }

  /**
   * @inheritdoc
   * @param {HTMLElement} element The DOM element containing the Cesium scene.
   */
  disconnectedCallback(element) {
    const handler = this._handler;
    if (defined(handler) && !handler.isDestroyed()) {
      handler.destroy();
    }
  }

  /**
   * @inheritdoc
   */
  firstUpdate() {
    this._lastUpdateTime = getTimestamp();
    this._panDelta.x = 0;
    this._panDelta.y = 0;
  }

  /**
   * @inheritdoc
   * @param {any} scene
   */
  update(scene) {
    const dt =
      (getTimestamp() - this._lastUpdateTime) *
      TimeConstants.SECONDS_PER_MILLISECOND;

    const { camera, ellipsoid, canvas } = scene;
    const { clientWidth, clientHeight } = canvas;
    if (dt === 0 || clientWidth === 0 || clientHeight === 0) {
      // Reset for next frame
      this._lastUpdateTime = getTimestamp();
      this._panDelta.x = 0;
      this._panDelta.y = 0;
      return;
    }

    let surface = camera.pickEllipsoid(
      this._panPosition,
      ellipsoid,
      this._ellipsoidSurfacePosition,
    );

    if (!defined(surface)) {
      surface = ellipsoid.scaleToGeodeticSurface(
        camera.positionWC,
        this._ellipsoidSurfacePosition,
      );
    }

    const zAxis = ellipsoid.geodeticSurfaceNormal(
      surface,
      this._ellipsoidNormal,
    );

    let xAxis = Cartesian3.clone(camera.rightWC, this._panDirectionX);
    xAxis = Cartesian3.normalize(xAxis, this._panDirectionX);

    // If z-axis is parallel to camera forward, we use the camera up vector to compute the y-axis. Otherwise, we use the z-axis and x-axis to compute the y-axis.
    let yAxis = Cartesian3.clone(camera.upWC, this._panDirectionY);
    const theta = Math.abs(Cartesian3.dot(zAxis, camera.directionWC));
    if (CesiumMath.lessThan(theta, 1.0, CesiumMath.EPSILON6)) {
      yAxis = Cartesian3.cross(zAxis, xAxis, this._panDirectionY);
    }

    yAxis = Cartesian3.normalize(yAxis, this._panDirectionY);

    const distance = Cartesian3.distance(camera.positionWC, surface);
    const { drawingBufferWidth, drawingBufferHeight, pixelRatio } = scene;
    const pixelSize = camera.frustum.getPixelDimensions(
      drawingBufferWidth,
      drawingBufferHeight,
      distance,
      pixelRatio,
      this._pixelSize,
    );

    let dx = -this._panDelta.x;
    let dy = this._panDelta.y;

    if (!this._isPanning) {
      const damping = Math.exp(-this.inertialDecay * dt);
      this._panVelocity.x *= damping;
      this._panVelocity.y *= damping;

      dx = this._panVelocity.x * dt;
      dy = this._panVelocity.y * dt;
    }

    const maxPixels =
      this.maximumMovementRatio * Math.max(clientWidth, clientHeight);

    dx = CesiumMath.clamp(dx, -maxPixels, maxPixels);
    this._panVelocity.x = dx / dt;
    dx *= this.panSpeed * pixelSize.x;

    dy = CesiumMath.clamp(dy, -maxPixels, maxPixels);
    this._panVelocity.y = dy / dt;
    dy *= this.panSpeed * pixelSize.y;

    camera.move(xAxis, dx);
    camera.move(yAxis, dy);

    // Reset for next frame
    this._lastUpdateTime = getTimestamp();
    this._panDelta.x = 0;
    this._panDelta.y = 0;
  }

  /**
   * @private
   * @param {Event} event
   */
  _handleStartPan(event) {
    if (!this.enabled) {
      return;
    }

    this._isPanning = true;
    this._panDelta.x = 0;
    this._panDelta.y = 0;
  }

  _handleStopPan() {
    this._isPanning = false;
  }

  /**
   * @typedef {object} DragEvent
   * @memberof ScreenspaceMapCameraController
   * @property {Cartesian2} startPosition The position of the mouse when the drag started.
   * @property {Cartesian2} endPosition The position of the mouse when the drag ended.
   */

  /**
   * @param {DragEvent} event
   * @private
   */
  _handlePan(event) {
    if (!this._isPanning) {
      return;
    }

    this._panDelta.x += event.endPosition.x - event.startPosition.x;
    this._panDelta.y += event.endPosition.y - event.startPosition.y;
    this._panPosition.x = event.endPosition.x;
    this._panPosition.y = event.endPosition.y;
  }
}

export default ScreenspaceMapCameraController;
