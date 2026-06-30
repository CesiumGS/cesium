// @ts-check
/** @import Controller from './Controller.js'; */

import Cartesian2 from "../../Core/Cartesian2.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import defined from "../../Core/defined.js";
import Frozen from "../../Core/Frozen.js";
import getTimestamp from "../../Core/getTimestamp.js";
import CesiumMath from "../../Core/Math.js";
import ScreenSpaceEventHandler from "../../Core/ScreenSpaceEventHandler.js";
import ScreenSpaceEventType from "../../Core/ScreenSpaceEventType.js";
import TimeConstants from "../../Core/TimeConstants.js";

/**
 * @typedef {object} ControllerOptions
 * @memberof ScreenspaceZoomCameraController
 */


/**
 * A camera controller that allows zooming the camera in and out based on the pointer location in screen space.
 * @class
 * @alias ScreenspaceZoomCameraController
 * @implements Controller
 * @example
 * TODO
 */
class ScreenspaceZoomCameraController {
    /**
   * Creates a new instance of <code>ScreenspaceTiltOrbitCameraController</code>.
   * @param {ScreenspaceZoomCameraController.ControllerOptions} [options] The options for configuring the controller.
   * @constructor
   */
  constructor(options = Frozen.EMPTY_OBJECT) {
    this._enabled = true;
    this._handler = undefined;
    this._lastUpdateTime = undefined;

    // TODO: Input maps

    /**
     * The rate at which the camera zooms in and out based on the mouse wheel delta.
     * @type {number}
     * @default 0.1
     */
    this.zoomSensitivity = 0.1;

    /**
     * The ratio of the camera's distance to the zoom target that defines how much the camera zooms in and out per second.
     * @type {number}
     * @default 0.2
     */
    this.zoomDistanceRatio = 0.2;

    /**
     * The rate at which the camera's zoom velocity decays over time.
     * @type {number}
     * @default 6.0
     */
    this.inertiaDecay = 6.0;

    // TODO: Maximum distance


    this._zoomDelta = 0.0;
    this._zoomPosition = new Cartesian2();
    this._target = new Cartesian3();
    this._zoomVelocity = 0.0;
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
    }
  }

  /**
   * @inheritdoc
   * @param {HTMLElement} element The DOM element containing the Cesium scene.
   */
  connectedCallback(element) {
    const handler = new ScreenSpaceEventHandler(element);
    this._handler = handler;

    handler.setInputAction(
      this._handleZoom.bind(this),
      ScreenSpaceEventType.WHEEL,
    );

    handler.setInputAction(
      this._handleZoomPosition.bind(this),
      ScreenSpaceEventType.MOUSE_MOVE,
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
    this._zoomDelta = 0.0;
  }

  /**
   * @inheritdoc
   * @param {Scene} scene
   */
  update(scene) {
    const now = getTimestamp();
    const dt =
      (now - this._lastUpdateTime) * TimeConstants.SECONDS_PER_MILLISECOND;

    //let zoomDelta = this._zoomDelta * dt;

    //this.zoomVelocity *= Math.exp(-this.inertiaDecay * dt);
    //zoomDelta += this.zoomVelocity * dt;

    if (dt === 0 || Cartesian2.magnitude(this._zoomPosition) <= 0.0) {
      this._lastUpdateTime = getTimestamp();
      this._zoomDelta = 0.0;
      return;
    }

    const { camera, ellipsoid } = scene;
    const target = camera.pickEllipsoid(
      this._zoomPosition,
      ellipsoid,
      this._target,
    );
    let distance =
      Cartesian3.magnitude(camera.positionWC) - ellipsoid.maximumRadius;

    if (defined(target)) {
      distance = Cartesian3.distance(camera.positionWC, target);
    }

    const zoom = this._zoomDelta * distance * this.zoomDistanceRatio;
    this._zoomVelocity = zoom / dt;

    // TODO: To target
    camera.move(camera.direction, zoom);

    // Reset for next frame
    this._lastUpdateTime = getTimestamp();
    this._zoomDelta = 0.0;
  }

  /**
   * @private
   * @param {number} amount
   */
  _handleZoom(amount) {
    this._zoomDelta += amount * this.zoomSensitivity;
  }

  /**
   * @typedef {object} DragEvent
   * @memberof ScreenspaceZoomCameraController
   * @property {Cartesian2} startPosition The position of the mouse when the drag started.
   * @property {Cartesian2} endPosition The position of the mouse when the drag ended.
   */

  /**
   * @param {DragEvent} event
   * @private
   */
  _handleZoomPosition(event) {
    this._zoomPosition.x = event.endPosition.x;
    this._zoomPosition.y = event.endPosition.y;
  }
}

export default ScreenspaceZoomCameraController;
