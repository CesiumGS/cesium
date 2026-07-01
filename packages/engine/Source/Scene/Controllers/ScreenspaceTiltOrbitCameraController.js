import Cartesian2 from "../../Core/Cartesian2.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import Check from "../../Core/Check.js";
import defined from "../../Core/defined.js";
import Ellipsoid from "../../Core/Ellipsoid.js";
import Frozen from "../../Core/Frozen.js";
import getTimestamp from "../../Core/getTimestamp.js";
import KeyboardEventModifier from "../../Core/KeyboardEventModifier.js";
import CesiumMath from "../../Core/Math.js";
import Matrix3 from "../../Core/Matrix3.js";
import Matrix4 from "../../Core/Matrix4.js";
import ScreenSpaceEventHandler from "../../Core/ScreenSpaceEventHandler.js";
import Quaternion from "../../Core/Quaternion.js";
import TimeConstants from "../../Core/TimeConstants.js";
import Transforms from "../../Core/Transforms.js";
import ScreenspaceInputBindings from "./ScreenspaceInputBindings.js";
import MouseButton from "./MouseButton.js";

/**
 * @typedef {object} ControllerOptions
 * @memberof ScreenspaceTiltOrbitCameraController
 * @property {ScreenspaceInputBindings.InputBinding[]} [dragInputs] The drag input bindings that control tilting and orbiting.
 */

/**
 * A camera controller that allows tilting and orbiting the camera around a target position in screen space by clicking and dragging the mouse or touching and dragging on a touch screen.
 * @class
 * @alias ScreenspaceTiltOrbitCameraController
 * @implements Controller
 * @example
 * viewer.scene.screenSpaceCameraController.enableInputs = false;
 * viewer.scene.screenSpaceCameraController.enableCollisionDetection = false;
 *
 * const tiltOrbitController = new Cesium.ScreenspaceTiltOrbitCameraController();
 * viewer.addController(tiltOrbitController);
 *
 * @example
 * // Configure the controller to use the left mouse button for tilting and orbiting instead of the default right mouse button.
 * const tiltOrbitController = new Cesium.ScreenspaceTiltOrbitCameraController({
 *  dragInputs: [{ button: Cesium.MouseButton.LEFT }]
 * });
 * viewer.addController(tiltOrbitController);
 */
class ScreenspaceTiltOrbitCameraController {
  /**
   * @private
   * @returns {ScreenspaceInputBindings.InputBinding[]} The default drag input bindings.
   */
  static _getDefaultDragInputs() {
    return [
      Object.freeze({
        button: MouseButton.LEFT,
        modifier: KeyboardEventModifier.CTRL,
      }),
      Object.freeze({
        button: MouseButton.RIGHT,
      }),
    ];
  }

  /**
   * Creates a new instance of <code>ScreenspaceTiltOrbitCameraController</code>.
   * @param {ScreenspaceTiltOrbitCameraController.ControllerOptions} [options] The options for configuring the controller.
   * @constructor
   */
  constructor(options = Frozen.EMPTY_OBJECT) {
    this._enabled = true;
    this._handler = undefined;
    this._lastUpdateTime = undefined;

    /**
     * Enabled dragging to tilt the camera.
     * @type {boolean}
     * @default true
     */
    this.tiltEnabled = true;

    /**
     * Enabled dragging to orbit the camera.
     * @type {boolean}
     * @default true
     */
    this.orbitEnabled = true;

    /**
     * The drag input bindings that control tilting. Each binding is a combination of the mouse button
     * and an optional keyboard modifier.
     * @type {ScreenspaceInputBindings.InputBinding[]}
     * @see ScreenSpaceEventHandler
     */
    this.dragInputs =
      options.dragInputs ??
      ScreenspaceTiltOrbitCameraController._getDefaultDragInputs();

    this._isDragging = false;
    this._dragDelta = new Cartesian2();
    this._dragOrigin = new Cartesian2();
    this._screenOrigin = new Cartesian2();

    this._target = new Cartesian3();
    this._axis = new Cartesian3();

    /**
     * Controls the screenspace position used to determine the location on the ellipsoid that the camera orbit and tilts around.
     * <p> If true, the origin is preferred to be determined by the position at the center of the screen, and will fall back to the position under the mouse cursor when dragging starts. If false, the origin is always determined by the position under the mouse cursor when dragging starts. </p>
     * <p>Regardless of the preference, if the origin is not on the ellipsoid, no tilt or orbit is applied.</p>
     * @type {boolean}
     * @default true
     */
    this.targetScreenCenter = true; // TODO

    /**
     * The amount at which the camera tilts per dragged pixel. A value of 1.0 means that dragging the mouse across the entire canvas will tilt the camera by 90 degrees.
     * @type {number}
     * @default 2.0
     */
    this.tiltMagnitude = 2.0;

    /**
     * Specifies the length of time in seconds in which a single tilt animation completes.
     * @type {number}
     * @default 0.0045
     */
    this.tiltAnimationDuration = 0.0045;

    /**
     * The maximum tilt velocity in radians per second. A value of Number.POSITIVE_INFINITY means that the maximum tilt velocity is unbounded.
     * @type {number}
     * @default CesiumMath.PI
     */
    this.maximumTiltVelocity = CesiumMath.PI;

    /**
     * @private
     * @type {number}
     * @default CesiumMath.EPSILON20
     */
    this.minimumTiltVelocity = CesiumMath.EPSILON20;

    /**
     * The minimum tilt angle in radians from the zenith, or the ellipsoid surface normal, at the tilt origin at which the camera can orbit.
     * @type {number}
     * @default CesiumMath.toRadians(5)
     */
    this.minimumOrbitTiltAngle = CesiumMath.toRadians(5);

    /**
     * The amount at which the camera orbits per dragged pixel. A value of 1.0 means that dragging the mouse across the entire canvas will orbit the camera by 180 degrees.
     * @type {number}
     * @default 2.0
     */
    this.orbitMagnitude = 2.0;

    /**
     * Specifies the length of time in seconds in which a single orbit animation completes.
     * @type {number}
     * @default 0.0045
     */
    this.orbitAnimationDuration = 0.0045;

    /**
     * The maximum orbit velocity in radians per second. A value of Number.POSITIVE_INFINITY means that the maximum orbit velocity is unbounded.
     * @type {number}
     * @default CesiumMath.TWO_PI
     */
    this.maximumOrbitVelocity = CesiumMath.TWO_PI;

    /**
     * @private
     * @type {number}
     * @default CesiumMath.EPSILON20
     */
    this.minimumOrbitVelocity = CesiumMath.EPSILON20;

    this._tiltAxis = new Cartesian3();
    this._tiltQuaternion = new Quaternion();
    this._tiltOffset = new Cartesian3();
    this._tiltDampenedResults = {
      velocity: 0.0,
      value: 0.0,
    };

    this._orbitTargetEnu = new Matrix4();
    this._orbitTargetEast = new Cartesian3();
    this._orbitQuaternion = new Quaternion();
    this._orbitOffset = new Cartesian3();
    this._orbitDampenedResults = {
      velocity: 0.0,
      value: 0.0,
    };

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
      this._lastUpdateTime = getTimestamp();
      this._dragDelta.x = 0;
      this._dragDelta.y = 0;
    } else {
      this._isDragging = false;
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
        start: this._handleStartDrag.bind(this),
        end: this._handleStopDrag.bind(this),
        move: this._handleDrag.bind(this),
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
    this._dragDelta.x = 0;
    this._dragDelta.y = 0;
  }

  /**
   * @typedef {object} StartDragEvent
   * @memberof ScreenspaceTiltOrbitCameraController
   * @property {Cartesian2} position The position of the mouse when the drag started.
   */

  /**
   * @private
   * @param {StartDragEvent} event
   */
  _handleStartDrag(event) {
    if (!this.enabled) {
      return;
    }

    this._isDragging = true;
    this._dragOrigin.x = event.position.x;
    this._dragOrigin.y = event.position.y;
    this._dragDelta.x = 0;
    this._dragDelta.y = 0;
  }

  _handleStopDrag() {
    this._isDragging = false;
  }

  /**
   * @typedef {object} DragEvent
   * @memberOf ScreenspaceTiltOrbitCameraController
   * @property {Cartesian2} startPosition The position of the mouse when the drag started.
   * @property {Cartesian2} endPosition The position of the mouse when the drag ended.
   */

  /**
   * @private
   * @param {DragEvent} event
   */
  _handleDrag(event) {
    if (!this._isDragging) {
      return;
    }

    this._dragDelta.x += event.endPosition.x - event.startPosition.x;
    this._dragDelta.y += event.endPosition.y - event.startPosition.y;
  }

  /**
   * The current tilt angle of the camera in radians. A value of 0.0 means that the camera is looking straight down at the ellipsoid, and a value of PI/2 means that the camera is looking at the horizon.
   * @type {number}
   * @private
   */
  get tiltAngle() {
    return this._tiltDampenedResults.value;
  }

  /**
   * The current tilt velocity of the camera in radians per second.
   * @type {number}
   * @private
   */
  get tiltVelocity() {
    return this._tiltDampenedResults.velocity;
  }

  /**
   * The current tilt velocity of the camera in radians per second.
   * @type {number}
   * @private
   */
  set tiltVelocity(value) {
    this._tiltDampenedResults.velocity = value;
  }

  /**
   * The current orbit angle of the camera in radians around the target. A value of 0.0 means that the camera is looking at the target from the east, and a value of PI/2 means that the camera is looking at the target from the north.
   * @type {number}
   * @private
   */
  get orbitAngle() {
    return this._orbitDampenedResults.value;
  }

  /**
   * The current orbit velocity of the camera in radians per second.
   * @type {number}
   * @private
   */
  get orbitVelocity() {
    return this._orbitDampenedResults.velocity;
  }

  /**
   * The current orbit velocity of the camera in radians per second.
   * @type {number}
   * @private
   */
  set orbitVelocity(value) {
    this._orbitDampenedResults.velocity = value;
  }

  /**
   * Attempts to orbit the camera around the specified origin by the specified amount in radians. Positive values orbit the camera clockwise, negative values orbit the camera counterclockwise. If the drag origin is not on the ellipsoid, no orbit is applied.
   * @param {Camera} camera The camera to orbit.
   * @param {Cartesian3} target The target position to orbit around in world coordinates.
   * @param {Cartesian3} axis The axis to orbit around, typically the negative of the surface normal at the target position.
   * @param {number} amount The amount to orbit the camera in radians. Positive values orbit the camera clockwise, negative values orbit the camera counterclockwise.
   * @param {number} dt The time delta in seconds since the last update.
   * @param {Ellipsoid} [ellipsoid=Ellipsoid.default] The ellipsoid to pick for the orbit origin. If undefined, the default ellipsoid is used.
   */
  orbit(camera, target, axis, amount, dt, ellipsoid = Ellipsoid.default) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("camera", camera);
    Check.typeOf.object("target", target);
    Check.typeOf.object("axis", axis);
    Check.typeOf.number("amount", amount);
    Check.typeOf.number.greaterThan("dt", dt, 0);
    Check.typeOf.object("ellipsoid", ellipsoid);
    //>>includeEnd('debug');

    const currentTiltAngle = Cartesian3.angleBetween(camera.direction, axis);
    if (currentTiltAngle < this.minimumOrbitTiltAngle) {
      return;
    }

    const offset = Cartesian3.subtract(
      camera.positionWC,
      target,
      this._orbitOffset,
    );
    const enu = Transforms.eastNorthUpToFixedFrame(
      target,
      ellipsoid,
      this._orbitTargetEnu,
    );
    const east = Matrix4.multiplyByPointAsVector(
      enu,
      Cartesian3.UNIT_X,
      this._orbitTargetEast,
    );
    const currentOrbitAngle = Cartesian3.angleBetween(offset, east);

    if (Math.abs(this.orbitVelocity) < this.minimumOrbitVelocity) {
      this.orbitVelocity = 0.0;
    }

    // Apply inertia
    if (!this._isDragging) {
      amount += this.orbitVelocity * dt;
    }

    if (amount === 0.0) {
      return;
    }

    const targetOrbitAngle = currentOrbitAngle + amount;

    // Apply critical dampening
    this._orbitDampenedResults = CesiumMath.smoothDamp(
      currentOrbitAngle,
      targetOrbitAngle,
      this.orbitVelocity,
      dt,
      this.maximumOrbitVelocity * this.orbitMagnitude,
      this.orbitAnimationDuration,
      this._orbitDampenedResults,
    );

    const theta = this.orbitAngle - currentOrbitAngle;
    const rotation = Matrix3.fromQuaternion(
      Quaternion.fromAxisAngle(camera.upWC, -theta, this._orbitQuaternion),
    );

    const rotatedOffset = Matrix3.multiplyByVector(
      rotation,
      offset,
      this._orbitOffset,
    );

    Cartesian3.add(target, rotatedOffset, camera.position);
    camera.lookAtWorldPosition(target, ellipsoid);
  }

  /**
   * Attempts to tilt the camera by the specified amount in radians. Positive values tilt the camera down, negative values tilt the camera up. If the drag origin is not on the ellipsoid, no tilt is applied.
   * @param {Camera} camera The camera to tilt.
   * @param {Cartesian3} target The target position to tilt around in world coordinates.
   * @param {Cartesian3} axis The axis to tilt around, typically the negative of the surface normal at the target position.
   * @param {number} amount The amount to tilt the camera in radians. Positive values tilt the camera down, negative values tilt the camera up.
   * @param {number} dt The time delta in seconds since the last update. Value must be greater than 0.
   * @param {Ellipsoid} [ellipsoid=Ellipsoid.default] The ellipsoid to pick for the tilt origin. If undefined, the default ellipsoid is used.
   */
  tilt(camera, target, axis, amount, dt, ellipsoid = Ellipsoid.default) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("camera", camera);
    Check.typeOf.object("target", target);
    Check.typeOf.object("axis", axis);
    Check.typeOf.number("amount", amount);
    Check.typeOf.number.greaterThan("dt", dt, 0);
    Check.typeOf.object("ellipsoid", ellipsoid);
    //>>includeEnd('debug');

    const currentTiltAngle = Cartesian3.angleBetween(camera.direction, axis);

    if (Math.abs(this.tiltVelocity) < this.minimumTiltVelocity) {
      this.tiltVelocity = 0.0;
    }

    // Apply inertia
    if (!this._isDragging) {
      amount += this.tiltVelocity * dt;
    }

    if (amount === 0.0) {
      return;
    }

    const targetRotationAngle = currentTiltAngle + amount;

    CesiumMath.smoothDamp(
      currentTiltAngle,
      targetRotationAngle,
      this.tiltVelocity,
      dt,
      this.maximumTiltVelocity * this.tiltMagnitude,
      this.tiltAnimationDuration,
      this._tiltDampenedResults,
    );

    const theta = this.tiltAngle - currentTiltAngle;
    const rotation = Matrix3.fromQuaternion(
      Quaternion.fromAxisAngle(camera.rightWC, -theta, this._tiltQuaternion),
    );

    const offset = Cartesian3.subtract(
      camera.positionWC,
      target,
      this._tiltOffset,
    );

    const rotatedOffset = Matrix3.multiplyByVector(
      rotation,
      offset,
      this._tiltOffset,
    );
    Cartesian3.add(target, rotatedOffset, camera.position);
    camera.lookAtWorldPosition(target, ellipsoid);
  }

  /**
   * @inheritdoc
   * @param {Scene} scene
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
      this._dragDelta.x = 0;
      this._dragDelta.y = 0;
      return;
    }

    const screenOrigin = this._screenOrigin;
    screenOrigin.x = clientWidth / 2.0;
    screenOrigin.y = clientHeight / 2.0;

    let target = camera.pickEllipsoid(screenOrigin, ellipsoid, this._target);

    // Fallback to the cursor position if the center of the screen is not on the ellipsoid
    if (!defined(target)) {
      const dragOrigin = this._dragOrigin;
      target = camera.pickEllipsoid(dragOrigin, ellipsoid, this._target);
    }

    if (defined(target)) {
      const normal = ellipsoid.geodeticSurfaceNormal(target, this._axis);

      const axis = Cartesian3.negate(normal, this._axis);

      if (this.orbitEnabled) {
        let dx = this._dragDelta.x / clientWidth;
        dx = CesiumMath.clamp(
          dx,
          -this.maximumMovementRatio,
          this.maximumMovementRatio,
        );
        dx *= this.orbitMagnitude * CesiumMath.TWO_PI;

        this.orbit(camera, target, axis, dx, dt, ellipsoid);
      }

      if (this.tiltEnabled) {
        let dy = this._dragDelta.y / clientHeight;
        dy = CesiumMath.clamp(
          dy,
          -this.maximumMovementRatio,
          this.maximumMovementRatio,
        );
        dy *= this.tiltMagnitude * CesiumMath.PI;
        this.tilt(camera, target, axis, dy, dt, ellipsoid);
      }
    }

    // Reset for next frame
    this._lastUpdateTime = getTimestamp();
    this._dragDelta.x = 0;
    this._dragDelta.y = 0;
  }
}

export default ScreenspaceTiltOrbitCameraController;
