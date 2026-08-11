import Cartesian2 from "../../Core/Cartesian2.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import defined from "../../Core/defined.js";
import Frozen from "../../Core/Frozen.js";
import getTimestamp from "../../Core/getTimestamp.js";
import CesiumMath from "../../Core/Math.js";
import ScreenSpaceEventHandler from "../../Core/ScreenSpaceEventHandler.js";
import ScreenSpaceEventType from "../../Core/ScreenSpaceEventType.js";
import defaultPickWorldPosition from "./defaultPickWorldPosition.js";
import ScreenSpaceInputBindings from "./ScreenSpaceInputBindings.js";
import TimeConstants from "../../Core/TimeConstants.js";
import MouseButton from "./MouseButton.js";

/**
 * @typedef {object} ControllerOptions
 * @memberof ScreenSpaceZoomCameraController
 * @property {ScreenSpaceInputBindings.InputBinding[]} [dragInputs] The drag input bindings that control zooming.
 * @property {ScreenSpaceEventType[]} [scrollInputs] The scroll input bindings that control zooming.
 */

/**
 * A camera controller that allows zooming the camera in and out based on the pointer location in screen space.
 * @class
 * @implements Controller
 * @example
 * viewer.scene.screenSpaceCameraController.enableInputs = false;
 * viewer.scene.screenSpaceCameraController.enableCollisionDetection = false;
 *
 * const zoomCameraController = new Cesium.ScreenSpaceZoomCameraController();
 * viewer.addController(zoomCameraController);
 */
class ScreenSpaceZoomCameraController {
  /**
   * @private
   * @returns {ScreenSpaceInputBindings.InputBinding[]} The default drag input bindings.
   */
  static _getDefaultDragInputs() {
    return [
      Object.freeze({
        button: MouseButton.MIDDLE,
      }),
    ];
  }

  /**
   * @private
   * @returns {ScreenSpaceEventType[]} The default scroll input bindings.
   */
  static _getDefaultScrollInputs() {
    return [ScreenSpaceEventType.WHEEL];
  }

  /**
   * Creates a new instance of <code>ScreenSpaceZoomCameraController</code>.
   * @param {ScreenSpaceZoomCameraController.ControllerOptions} [options] The options for configuring the controller.
   */
  constructor(options = Frozen.EMPTY_OBJECT) {
    this._enabled = true;
    this._handler = undefined;
    this._lastUpdateTime = undefined;

    /**
     * If false, the camera will zoom to the position at the center of the screen. If true, the camera will zoom to the position under the cursor or tap when dragging starts or when scrolling with the scroll wheel.
     * @type {boolean}
     * @default false
     */
    this.usePointerPosition = false;

    /**
     * The drag input bindings that control zooming. Each binding is a combination of the mouse button
     * and an optional keyboard modifier.
     * @type {ScreenSpaceInputBindings.InputBinding[]}
     * @see ScreenSpaceEventHandler
     */
    this.dragInputs =
      options.dragInputs ??
      ScreenSpaceZoomCameraController._getDefaultDragInputs();

    /**
     * The scroll input bindings that control zooming.
     * @type {ScreenSpaceEventType[]}
     * @see ScreenSpaceEventHandler
     * @default [ScreenSpaceEventType.WHEEL]
     */
    this.scrollInputs =
      options.scrollInputs ??
      ScreenSpaceZoomCameraController._getDefaultScrollInputs();

    this._dragInputState = undefined;
    this._dragDelta = new Cartesian2();
    this._scrollDelta = 0.0;
    this._zoomInputVelocity = 0.0;
    this._screenSpaceScrollPosition = new Cartesian2();
    this._screenSpaceDragPosition = new Cartesian2();
    this._screenSpaceOrigin = new Cartesian2();

    /**
     * The rate at which the camera zooms in and out based on the mouse wheel delta.
     * @type {number}
     * @default 0.2
     */
    this.zoomSensitivity = 0.2;

    /**
     * A callback function used to pick the world position from which to zoom. The function is called with {@link Scene}, the {@link Cartesian2} screen space position, and a {@link Cartesian3} instance to store the result. The function should return the {@link Cartesian3} world position from which to zoom, or <code>undefined</code> if no position could be picked.
     * @type {Function(Scene, Cartesian2, Cartesian3): Cartesian3|undefined}
     * @default defaultPickWorldPosition
     * @example
     * const zoomCameraController = new Cesium.ScreenSpaceZoomCameraController();
     * zoomCameraController.pickWorldPosition = function (scene, windowPosition, result) {
     *   // Pick the world position from the depth buffer
     *   return scene.pickPosition(windowPosition, result);
     * };
     * viewer.addController(zoomCameraController);
     */
    this.pickWorldPosition = defaultPickWorldPosition;

    /**
     * The ratio of the camera's distance to the zoom target that defines how much the camera zooms in and out per second.
     * @type {number}
     * @default 0.4
     */
    this.zoomDistanceRatio = 0.4;

    /**
     * Enable or disable inertia when zooming. When enabled, the camera will continue to move after the user input stops, gradually slowing down based on {@link ScreenSpaceZoomCameraController#inertialDecay}.
     * @type {boolean}
     * @default true
     */
    this.inertiaEnabled = false;

    /**
     * The rate at which the camera's zoom velocity decays over time.
     * @type {number}
     * @default 6.0
     */
    this.inertialDecay = 6.0;

    /**
     * @private
     * @type number
     * @default 0.0
     */
    this.minimumZoomDistance = 0.0;

    /**
     * Maximum distance from the zoom target that the camera can move away.
     * @type {number}
     * @default 100000.0
     */
    this.maximumZoomDistance = 100000.0;

    /**
     * @private
     * @type {number}
     * @default CesiumMath.EPSILON20
     */
    this.minimumZoomVelocity = CesiumMath.EPSILON20;

    /**
     * The maximum zoom velocity in meters per second. This limits the speed at which the camera can zoom in and out.
     * @type {number}
     * @default 1.0
     */
    this.maximumZoomVelocity = 1.0;

    /**
     * Enables or disables damping for zooming. Damping smooths out the camera movement and makes it feel more natural or weighty, but it can also introduce a slight delay in the camera response. If damping is disabled, the camera will respond immediately to user input.
     * @type {boolean}
     * @default true
     */
    this.dampingEnabled = true;

    /**
     * Specifies the length of time in seconds in which a single zoom animation is targeted to complete.
     * @type {number}
     * @default 0.45
     */
    this.zoomAnimationDuration = 0.45;

    this._target = new Cartesian3();
    this._zoomDirection = new Cartesian3();
    this._zoomDampenedResults = {
      velocity: 0.0,
      value: 0.0,
    };
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
      this._lastUpdateTime = getTimestamp();
      this._scrollDelta = 0.0;
      this._dragDelta.x = 0.0;
      this._dragDelta.y = 0.0;
    } else if (defined(this._dragInputState)) {
      this._dragInputState.isDragging = false;
    }
  }

  /**
   * @private
   * @type {boolean}
   */
  get isDragging() {
    return defined(this._dragInputState) && this._dragInputState.isDragging;
  }

  /**
   * @inheritdoc
   * @param {HTMLElement} element The DOM element containing the Cesium scene.
   */
  connectedCallback(element) {
    const handler = new ScreenSpaceEventHandler(element);
    this._handler = handler;

    for (const input of this.scrollInputs) {
      handler.setInputAction(this._handleZoom.bind(this), input);
    }

    handler.setInputAction(
      this._handleZoomPosition.bind(this),
      ScreenSpaceEventType.MOUSE_MOVE,
    );

    this._dragInputState = ScreenSpaceInputBindings.registerDragInputBindings(
      handler,
      this.dragInputs,
      {
        start: this._handleStartDrag.bind(this),
        change: this._handleDrag.bind(this),
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
    this._scrollDelta = 0.0;
    this._dragDelta.x = 0.0;
    this._dragDelta.y = 0.0;
  }

  /**
   * The current zoom distance of the camera in meters. This is the distance from the camera to the zoom target.
   * @type {number}
   * @private
   */
  get zoomDistance() {
    return this._zoomDampenedResults.value;
  }

  /**
   * The current zoom velocity of the camera in radians per second.
   * @type {number}
   * @private
   */
  get zoomVelocity() {
    return this._zoomDampenedResults.velocity;
  }

  /**
   * The current zoom velocity of the camera in radians per second.
   * @type {number}
   * @private
   */
  set zoomVelocity(value) {
    this._zoomDampenedResults.velocity = value;
  }

  /**
   * @inheritdoc
   * @param {Scene} scene
   */
  update(scene) {
    const now = getTimestamp();
    const dt =
      (now - this._lastUpdateTime) * TimeConstants.SECONDS_PER_MILLISECOND;

    const { canvas } = scene;
    const { clientWidth, clientHeight } = canvas;
    if (dt === 0 || clientWidth === 0 || clientHeight === 0) {
      this._lastUpdateTime = getTimestamp();
      this._scrollDelta = 0.0;
      this._dragDelta.x = 0;
      this._dragDelta.y = 0;
      return;
    }

    let dz = this._scrollDelta + this._dragDelta.y;
    if (dz === 0.0 && this.inertiaEnabled) {
      const damping = Math.exp(-this.inertialDecay * dt);
      this._zoomInputVelocity *= damping;
      dz = this._zoomInputVelocity * dt;
    }

    if (
      Math.abs(this.zoomVelocity) < this.minimumZoomVelocity &&
      dz <= CesiumMath.EPSILON3 &&
      dz >= -CesiumMath.EPSILON3 &&
      this.zoomVelocity <= CesiumMath.EPSILON3
    ) {
      this._lastUpdateTime = getTimestamp();
      this._scrollDelta = 0.0;
      this._dragDelta.x = 0;
      this._dragDelta.y = 0;
      this.zoomVelocity = 0.0;
      return;
    }

    this._zoomInputVelocity = CesiumMath.clamp(
      dz / dt,
      -this.maximumZoomVelocity,
      this.maximumZoomVelocity,
    );

    const { camera, ellipsoid } = scene;

    let direction = camera.direction;
    let distance =
      Cartesian3.magnitude(camera.positionWC) - ellipsoid.maximumRadius;

    let windowPosition = this.isDragging
      ? this._screenSpaceDragPosition
      : this._screenSpaceScrollPosition;
    if (!this.useDragPosition) {
      windowPosition = this._screenSpaceOrigin;
      windowPosition.x = clientWidth / 2.0;
      windowPosition.y = clientHeight / 2.0;
    }
    const target = this.pickWorldPosition(scene, windowPosition, this._target);
    if (defined(target)) {
      direction = Cartesian3.subtract(
        target,
        camera.positionWC,
        this._zoomDirection,
      );
      direction = Cartesian3.normalize(direction, this._zoomDirection);
      distance = Cartesian3.distance(target, camera.positionWC);
    }

    distance = CesiumMath.clamp(
      distance,
      distance > 0.0 ? this.minimumZoomDistance : -this.maximumZoomDistance,
      distance > 0.0 ? this.maximumZoomDistance : -this.minimumZoomDistance,
    );

    const zoom = dz * distance * this.zoomDistanceRatio;

    const smoothTime = this.dampingEnabled
      ? this.zoomAnimationDuration
      : undefined;
    this._zoomDampenedResults = CesiumMath.smoothDamp(
      0.0,
      zoom,
      this.zoomVelocity,
      dt,
      undefined,
      smoothTime,
      this._zoomDampenedResults,
    );

    camera.move(direction, this.zoomDistance);

    // Reset for next frame
    this._lastUpdateTime = getTimestamp();
    this._scrollDelta = 0.0;
    this._dragDelta.x = 0;
    this._dragDelta.y = 0;
  }

  /**
   * @private
   * @param {number} amount
   */
  _handleZoom(amount) {
    this._scrollDelta += amount * this.zoomSensitivity;
  }

  /**
   * @private
   */
  _handleZoomPosition(event) {
    this._screenSpaceScrollPosition.x = event.endPosition.x;
    this._screenSpaceScrollPosition.y = event.endPosition.y;
  }

  /**
   * @private
   */
  _handleStartDrag(event) {
    if (!this.enabled) {
      return;
    }

    this._screenSpaceDragPosition.x = event.position.x;
    this._screenSpaceDragPosition.y = event.position.y;
    this._dragDelta.x = 0.0;
    this._dragDelta.y = 0.0;
  }

  /**
   * @private
   */
  _handleDrag(event) {
    this._dragDelta.x += event.endPosition.x - event.startPosition.x;
    this._dragDelta.y += event.endPosition.y - event.startPosition.y;
  }
}

export default ScreenSpaceZoomCameraController;
