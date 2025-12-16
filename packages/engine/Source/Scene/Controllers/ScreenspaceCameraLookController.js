import Cartesian3 from "../../Core/Cartesian3.js";
import Cartesian2 from "../../Core/Cartesian2.js";
import defined from "../../Core/defined.js";
import getTimestamp from "../../Core/getTimestamp.js";
import ScreenSpaceEventHandler from "../../Core/ScreenSpaceEventHandler.js";
import ScreenSpaceEventType from "../../Core/ScreenSpaceEventType.js";
import TimeConstants from "../../Core/TimeConstants.js";

export default class ScreenspaceCameraLookController {
  constructor() {
    this._enabled = true;
    this._handler = undefined;

    this._isLooking = false;
    this._lookDelta = new Cartesian2();
    this._lastUpdateTime = undefined;

        this._ellipsoidNormal = new Cartesian3();
        this._ellipsoidRight = new Cartesian3();

    // TODO: Handle input mapping
    // TODO: Inertia
    // TODO: Mouse grab style

    this.lookSpeed = 140.0;
  }

  get enabled() {
    return this._enabled;
  }

  set enabled(value) {
    this._enabled = value;

    if (value) {
      this._lastUpdateTime = getTimestamp();
      this._lookDelta.x = 0;
      this._lookDelta.y = 0;
    } else {
      this._isLooking = false;
    }
  }

  connectedCallback(element) {
    const handler = new ScreenSpaceEventHandler(element);
    this._handler = handler;

    handler.setInputAction(
      this._handleStartLook.bind(this),
      ScreenSpaceEventType.LEFT_DOWN,
    );
    // TODO: Document
    handler.setInputAction(
      this._handleStopLook.bind(this),
      ScreenSpaceEventType.LEFT_UP,
    );
    handler.setInputAction(
      this._handleLook.bind(this),
      ScreenSpaceEventType.MOUSE_MOVE,
    );
  }

  disconnectedCallback(element) {
    const handler = this._handler;
    if (defined(handler) && !handler.isDestroyed()) {
      handler.destroy();
    }
  }

  firstUpdate(scene, time) {
    this._lastUpdateTime = getTimestamp();
    this._lookDelta.x = 0;
    this._lookDelta.y = 0;
  }

  update(scene, time) {
    const now = getTimestamp();
    const ds =
      (now - this._lastUpdateTime) * TimeConstants.SECONDS_PER_MILLISECOND;

    const lookFactor = this.lookSpeed * ds;

    const canvas = scene.canvas;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    const x = -this._lookDelta.x / width;
    const y = this._lookDelta.y / height;

    const camera = scene.camera;
    const ellipsoid = scene.ellipsoid;
        const up = ellipsoid.geodeticSurfaceNormal(
          camera.positionWC,
          this._ellipsoidNormal,
        );
        const right = Cartesian3.cross(
          up,
          camera.directionWC,
          this._ellipsoidRight,
        );

    camera.look(camera.up, x * lookFactor);
    camera.look(camera.right, y * lookFactor);

    // Reset for next frame
    this._lastUpdateTime = getTimestamp();
    this._lookDelta.x = 0;
    this._lookDelta.y = 0;
  }

  _handleStartLook(event) {
    if (!this.enabled) {
      return;
    }

    this._isLooking = true;
    this._lookDelta.x = 0;
    this._lookDelta.y = 0;
  }

  _handleStopLook() {
    this._isLooking = false;
  }

  _handleLook(event) {
    if (!this._isLooking) {
      return;
    }

    this._lookDelta.x = event.endPosition.x - event.startPosition.x;
    this._lookDelta.y = event.endPosition.y - event.startPosition.y;
  }
}
