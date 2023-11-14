import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import Cartographic from "../Core/Cartographic.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import HeadingPitchRoll from "../Core/HeadingPitchRoll.js";
import IntersectionTests from "../Core/IntersectionTests.js";
import KeyboardEventModifier from "../Core/KeyboardEventModifier.js";
import CesiumMath from "../Core/Math.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";
import OrthographicFrustum from "../Core/OrthographicFrustum.js";
import Plane from "../Core/Plane.js";
import Quaternion from "../Core/Quaternion.js";
import Ray from "../Core/Ray.js";
import TerrainExaggeration from "../Core/TerrainExaggeration.js";
import Transforms from "../Core/Transforms.js";
import CameraEventAggregator from "./CameraEventAggregator.js";
import CameraEventType from "./CameraEventType.js";
import MapMode2D from "./MapMode2D.js";
import SceneMode from "./SceneMode.js";
import SceneTransforms from "./SceneTransforms.js";
import TweenCollection from "./TweenCollection.js";

/**
 * Modifies the camera position and orientation based on mouse input to a canvas.
 * @alias ScreenSpaceCameraController
 * @constructor
 *
 * @param {Scene} scene The scene.
 */
function ScreenSpaceCameraController(scene) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(scene)) {
    throw new DeveloperError("scene is required.");
  }
  //>>includeEnd('debug');

  /**
   * If true, inputs are allowed conditionally with the flags enableTranslate, enableZoom,
   * enableRotate, enableTilt, and enableLook.  If false, all inputs are disabled.
   *
   * NOTE: This setting is for temporary use cases, such as camera flights and
   * drag-selection of regions (see Picking demo).  It is typically set to false at the
   * start of such events, and set true on completion.  To keep inputs disabled
   * past the end of camera flights, you must use the other booleans (enableTranslate,
   * enableZoom, enableRotate, enableTilt, and enableLook).
   * @type {Boolean}
   * @default true
   */
  this.enableInputs = true;
  /**
   * If true, allows the user to pan around the map.  If false, the camera stays locked at the current position.
   * This flag only applies in 2D and Columbus view modes.
   * @type {Boolean}
   * @default true
   */
  this.enableTranslate = true;
  /**
   * If true, allows the user to zoom in and out.  If false, the camera is locked to the current distance from the ellipsoid.
   * @type {Boolean}
   * @default true
   */
  this.enableZoom = true;
  /**
   * If true, allows the user to rotate the world which translates the user's position.
   * This flag only applies in 2D and 3D.
   * @type {Boolean}
   * @default true
   */
  this.enableRotate = true;
  /**
   * If true, allows the user to tilt the camera.  If false, the camera is locked to the current heading.
   * This flag only applies in 3D and Columbus view.
   * @type {Boolean}
   * @default true
   */
  this.enableTilt = true;
  /**
   * If true, allows the user to use free-look. If false, the camera view direction can only be changed through translating
   * or rotating. This flag only applies in 3D and Columbus view modes.
   * @type {Boolean}
   * @default true
   */
  this.enableLook = true;
  /**
   * A parameter in the range <code>[0, 1)</code> used to determine how long
   * the camera will continue to spin because of inertia.
   * With value of zero, the camera will have no inertia.
   * @type {Number}
   * @default 0.9
   */
  this.inertiaSpin = 0.9;
  /**
   * A parameter in the range <code>[0, 1)</code> used to determine how long
   * the camera will continue to translate because of inertia.
   * With value of zero, the camera will have no inertia.
   * @type {Number}
   * @default 0.9
   */
  this.inertiaTranslate = 0.9;
  /**
   * A parameter in the range <code>[0, 1)</code> used to determine how long
   * the camera will continue to zoom because of inertia.
   * With value of zero, the camera will have no inertia.
   * @type {Number}
   * @default 0.8
   */
  this.inertiaZoom = 0.8;
  /**
   * A parameter in the range <code>[0, 1)</code> used to limit the range
   * of various user inputs to a percentage of the window width/height per animation frame.
   * This helps keep the camera under control in low-frame-rate situations.
   * @type {Number}
   * @default 0.1
   */
  this.maximumMovementRatio = 0.1;
  /**
   * Sets the duration, in seconds, of the bounce back animations in 2D and Columbus view.
   * @type {Number}
   * @default 3.0
   */
  this.bounceAnimationTime = 3.0;
  /**
   * The minimum magnitude, in meters, of the camera position when zooming. Defaults to 1.0.
   * @type {Number}
   * @default 1.0
   */
  this.minimumZoomDistance = 1.0;
  /**
   * The maximum magnitude, in meters, of the camera position when zooming. Defaults to positive infinity.
   * @type {Number}
   * @default {@link Number.POSITIVE_INFINITY}
   */
  this.maximumZoomDistance = Number.POSITIVE_INFINITY;
  /**
   * The input that allows the user to pan around the map. This only applies in 2D and Columbus view modes.
   * <p>
   * The type came be a {@link CameraEventType}, <code>undefined</code>, an object with <code>eventType</code>
   * and <code>modifier</code> properties with types <code>CameraEventType</code> and {@link KeyboardEventModifier},
   * or an array of any of the preceding.
   * </p>
   * @type {CameraEventType|Array|undefined}
   * @default {@link CameraEventType.LEFT_DRAG}
   */
  this.translateEventTypes = CameraEventType.LEFT_DRAG;
  /**
   * The input that allows the user to zoom in/out.
   * <p>
   * The type came be a {@link CameraEventType}, <code>undefined</code>, an object with <code>eventType</code>
   * and <code>modifier</code> properties with types <code>CameraEventType</code> and {@link KeyboardEventModifier},
   * or an array of any of the preceding.
   * </p>
   * @type {CameraEventType|Array|undefined}
   * @default [{@link CameraEventType.RIGHT_DRAG}, {@link CameraEventType.WHEEL}, {@link CameraEventType.PINCH}]
   */
  this.zoomEventTypes = [
    CameraEventType.RIGHT_DRAG,
    CameraEventType.WHEEL,
    CameraEventType.PINCH,
  ];
  /**
   * The input that allows the user to rotate around the globe or another object. This only applies in 3D and Columbus view modes.
   * <p>
   * The type came be a {@link CameraEventType}, <code>undefined</code>, an object with <code>eventType</code>
   * and <code>modifier</code> properties with types <code>CameraEventType</code> and {@link KeyboardEventModifier},
   * or an array of any of the preceding.
   * </p>
   * @type {CameraEventType|Array|undefined}
   * @default {@link CameraEventType.LEFT_DRAG}
   */
  this.rotateEventTypes = CameraEventType.LEFT_DRAG;
  /**
   * The input that allows the user to tilt in 3D and Columbus view or twist in 2D.
   * <p>
   * The type came be a {@link CameraEventType}, <code>undefined</code>, an object with <code>eventType</code>
   * and <code>modifier</code> properties with types <code>CameraEventType</code> and {@link KeyboardEventModifier},
   * or an array of any of the preceding.
   * </p>
   * @type {CameraEventType|Array|undefined}
   * @default [{@link CameraEventType.MIDDLE_DRAG}, {@link CameraEventType.PINCH}, {
   *     eventType : {@link CameraEventType.LEFT_DRAG},
   *     modifier : {@link KeyboardEventModifier.CTRL}
   * }, {
   *     eventType : {@link CameraEventType.RIGHT_DRAG},
   *     modifier : {@link KeyboardEventModifier.CTRL}
   * }]
   */
  this.tiltEventTypes = [
    CameraEventType.MIDDLE_DRAG,
    CameraEventType.PINCH,
    {
      eventType: CameraEventType.LEFT_DRAG,
      modifier: KeyboardEventModifier.CTRL,
    },
    {
      eventType: CameraEventType.RIGHT_DRAG,
      modifier: KeyboardEventModifier.CTRL,
    },
  ];
  /**
   * The input that allows the user to change the direction the camera is viewing. This only applies in 3D and Columbus view modes.
   * <p>
   * The type came be a {@link CameraEventType}, <code>undefined</code>, an object with <code>eventType</code>
   * and <code>modifier</code> properties with types <code>CameraEventType</code> and {@link KeyboardEventModifier},
   * or an array of any of the preceding.
   * </p>
   * @type {CameraEventType|Array|undefined}
   * @default { eventType : {@link CameraEventType.LEFT_DRAG}, modifier : {@link KeyboardEventModifier.SHIFT} }
   */
  this.lookEventTypes = {
    eventType: CameraEventType.LEFT_DRAG,
    modifier: KeyboardEventModifier.SHIFT,
  };
  /**
   * The minimum height the camera must be before picking the terrain instead of the ellipsoid.
   * @type {Number}
   * @default 150000.0
   */
  this.minimumPickingTerrainHeight = 150000.0;
  this._minimumPickingTerrainHeight = this.minimumPickingTerrainHeight;
  /**
   * The minimum height the camera must be before testing for collision with terrain.
   * @type {Number}
   * @default 15000.0
   */
  this.minimumCollisionTerrainHeight = 15000.0;
  this._minimumCollisionTerrainHeight = this.minimumCollisionTerrainHeight;
  /**
   * The minimum height the camera must be before switching from rotating a track ball to
   * free look when clicks originate on the sky or in space.
   * @type {Number}
   * @default 7500000.0
   */
  this.minimumTrackBallHeight = 7500000.0;
  this._minimumTrackBallHeight = this.minimumTrackBallHeight;
  /**
   * Enables or disables camera collision detection with terrain.
   * @type {Boolean}
   * @default true
   */
  this.enableCollisionDetection = true;

  this._scene = scene;
  this._globe = undefined;
  this._ellipsoid = undefined;

  this._aggregator = new CameraEventAggregator(scene.canvas);

  this._lastInertiaSpinMovement = undefined;
  this._lastInertiaZoomMovement = undefined;
  this._lastInertiaTranslateMovement = undefined;
  this._lastInertiaTiltMovement = undefined;

  // Zoom disables tilt, spin, and translate inertia
  // Tilt disables spin and translate inertia
  this._inertiaDisablers = {
    _lastInertiaZoomMovement: [
      "_lastInertiaSpinMovement",
      "_lastInertiaTranslateMovement",
      "_lastInertiaTiltMovement",
    ],
    _lastInertiaTiltMovement: [
      "_lastInertiaSpinMovement",
      "_lastInertiaTranslateMovement",
    ],
  };

  this._tweens = new TweenCollection();
  this._tween = undefined;

  this._horizontalRotationAxis = undefined;

  this._tiltCenterMousePosition = new Cartesian2(-1.0, -1.0);
  this._tiltCenter = new Cartesian3();
  this._rotateMousePosition = new Cartesian2(-1.0, -1.0);
  this._rotateStartPosition = new Cartesian3();
  this._strafeStartPosition = new Cartesian3();
  this._strafeMousePosition = new Cartesian2();
  this._strafeEndMousePosition = new Cartesian2();
  this._zoomMouseStart = new Cartesian2(-1.0, -1.0);
  this._zoomWorldPosition = new Cartesian3();
  this._useZoomWorldPosition = false;
  this._tiltCVOffMap = false;
  this._looking = false;
  this._rotating = false;
  this._strafing = false;
  this._zoomingOnVector = false;
  this._zoomingUnderground = false;
  this._rotatingZoom = false;
  this._adjustedHeightForTerrain = false;
  this._cameraUnderground = false;

  const projection = scene.mapProjection;
  this._maxCoord = projection.project(
    new Cartographic(Math.PI, CesiumMath.PI_OVER_TWO)
  );

  // Constants, Make any of these public?
  this._zoomFactor = 5.0;
  this._rotateFactor = undefined;
  this._rotateRateRangeAdjustment = undefined;
  this._maximumRotateRate = 1.77;
  this._minimumRotateRate = 1.0 / 5000.0;
  this._minimumZoomRate = 20.0;
  this._maximumZoomRate = 5906376272000.0; // distance from the Sun to Pluto in meters.
  this._minimumUndergroundPickDistance = 2000.0;
  this._maximumUndergroundPickDistance = 10000.0;
}

function decay(time, coefficient) {
  if (time < 0) {
    return 0.0;
  }

  const tau = (1.0 - coefficient) * 25.0;
  return Math.exp(-tau * time);
}

function sameMousePosition(movement) {
  return Cartesian2.equalsEpsilon(
    movement.startPosition,
    movement.endPosition,
    CesiumMath.EPSILON14
  );
}

// If the time between mouse down and mouse up is not between
// these thresholds, the camera will not move with inertia.
// This value is probably dependent on the browser and/or the
// hardware. Should be investigated further.
const inertiaMaxClickTimeThreshold = 0.4;

function maintainInertia(
  aggregator,
  type,
  modifier,
  decayCoef,
  action,
  object,
  lastMovementName
) {
  let movementState = object[lastMovementName];
  if (!defined(movementState)) {
    movementState = object[lastMovementName] = {
      startPosition: new Cartesian2(),
      endPosition: new Cartesian2(),
      motion: new Cartesian2(),
      inertiaEnabled: true,
    };
  }

  const ts = aggregator.getButtonPressTime(type, modifier);
  const tr = aggregator.getButtonReleaseTime(type, modifier);

  const threshold = ts && tr && (tr.getTime() - ts.getTime()) / 1000.0;
  const now = new Date();
  const fromNow = tr && (now.getTime() - tr.getTime()) / 1000.0;

  if (ts && tr && threshold < inertiaMaxClickTimeThreshold) {
    const d = decay(fromNow, decayCoef);

    const lastMovement = aggregator.getLastMovement(type, modifier);
    if (
      !defined(lastMovement) ||
      sameMousePosition(lastMovement) ||
      !movementState.inertiaEnabled
    ) {
      return;
    }

    movementState.motion.x =
      (lastMovement.endPosition.x - lastMovement.startPosition.x) * 0.5;
    movementState.motion.y =
      (lastMovement.endPosition.y - lastMovement.startPosition.y) * 0.5;

    movementState.startPosition = Cartesian2.clone(
      lastMovement.startPosition,
      movementState.startPosition
    );

    movementState.endPosition = Cartesian2.multiplyByScalar(
      movementState.motion,
      d,
      movementState.endPosition
    );
    movementState.endPosition = Cartesian2.add(
      movementState.startPosition,
      movementState.endPosition,
      movementState.endPosition
    );

    // If value from the decreasing exponential function is close to zero,
    // the end coordinates may be NaN.
    if (
      isNaN(movementState.endPosition.x) ||
      isNaN(movementState.endPosition.y) ||
      Cartesian2.distance(
        movementState.startPosition,
        movementState.endPosition
      ) < 0.5
    ) {
      return;
    }

    if (!aggregator.isButtonDown(type, modifier)) {
      const startPosition = aggregator.getStartMousePosition(type, modifier);
      action(object, startPosition, movementState);
    }
  }
}

function activateInertia(controller, inertiaStateName) {
  if (defined(inertiaStateName)) {
    // Re-enable inertia if it was disabled
    let movementState = controller[inertiaStateName];
    if (defined(movementState)) {
      movementState.inertiaEnabled = true;
    }
    // Disable inertia on other movements
    const inertiasToDisable = controller._inertiaDisablers[inertiaStateName];
    if (defined(inertiasToDisable)) {
      const length = inertiasToDisable.length;
      for (let i = 0; i < length; ++i) {
        movementState = controller[inertiasToDisable[i]];
        if (defined(movementState)) {
          movementState.inertiaEnabled = false;
        }
      }
    }
  }
}

const scratchEventTypeArray = [];

function reactToInput(
  controller,
  enabled,
  eventTypes,
  action,
  inertiaConstant,
  inertiaStateName
) {
  if (!defined(eventTypes)) {
    return;
  }

  const aggregator = controller._aggregator;

  if (!Array.isArray(eventTypes)) {
    scratchEventTypeArray[0] = eventTypes;
    eventTypes = scratchEventTypeArray;
  }

  const length = eventTypes.length;
  for (let i = 0; i < length; ++i) {
    const eventType = eventTypes[i];
    const type = defined(eventType.eventType) ? eventType.eventType : eventType;
    const modifier = eventType.modifier;

    const movement =
      aggregator.isMoving(type, modifier) &&
      aggregator.getMovement(type, modifier);
    const startPosition = aggregator.getStartMousePosition(type, modifier);

    if (controller.enableInputs && enabled) {
      if (movement) {
        action(controller, startPosition, movement);
        activateInertia(controller, inertiaStateName);
      } else if (inertiaConstant < 1.0) {
        maintainInertia(
          aggregator,
          type,
          modifier,
          inertiaConstant,
          action,
          controller,
          inertiaStateName
        );
      }
    }
  }
}

const scratchZoomPickRay = new Ray();
const scratchPickCartesian = new Cartesian3();
const scratchZoomOffset = new Cartesian2();
const scratchZoomDirection = new Cartesian3();
const scratchCenterPixel = new Cartesian2();
const scratchCenterPosition = new Cartesian3();
const scratchPositionNormal = new Cartesian3();
const scratchPickNormal = new Cartesian3();
const scratchZoomAxis = new Cartesian3();
const scratchCameraPositionNormal = new Cartesian3();

// Scratch variables used in zooming algorithm
const scratchTargetNormal = new Cartesian3();
const scratchCameraPosition = new Cartesian3();
const scratchCameraUpNormal = new Cartesian3();
const scratchCameraRightNormal = new Cartesian3();
const scratchForwardNormal = new Cartesian3();
const scratchPositionToTarget = new Cartesian3();
const scratchPositionToTargetNormal = new Cartesian3();
const scratchPan = new Cartesian3();
const scratchCenterMovement = new Cartesian3();
const scratchCenter = new Cartesian3();
const scratchCartesian = new Cartesian3();
const scratchCartesianTwo = new Cartesian3();
const scratchCartesianThree = new Cartesian3();
const scratchZoomViewOptions = {
  orientation: new HeadingPitchRoll(),
};

function handleZoom(
  object,
  startPosition,
  movement,
  zoomFactor,
  distanceMeasure,
  unitPositionDotDirection
) {
  let percentage = 1.0;
  if (defined(unitPositionDotDirection)) {
    percentage = CesiumMath.clamp(
      Math.abs(unitPositionDotDirection),
      0.25,
      1.0
    );
  }

  const diff = movement.endPosition.y - movement.startPosition.y;

  // distanceMeasure should be the height above the ellipsoid.
  // When approaching the surface, the zoomRate slows and stops minimumZoomDistance above it.
  const approachingSurface = diff > 0;
  const minHeight = approachingSurface
    ? object.minimumZoomDistance * percentage
    : 0;
  const maxHeight = object.maximumZoomDistance;

  const minDistance = distanceMeasure - minHeight;
  let zoomRate = zoomFactor * minDistance;
  zoomRate = CesiumMath.clamp(
    zoomRate,
    object._minimumZoomRate,
    object._maximumZoomRate
  );

  let rangeWindowRatio = diff / object._scene.canvas.clientHeight;
  rangeWindowRatio = Math.min(rangeWindowRatio, object.maximumMovementRatio);
  let distance = zoomRate * rangeWindowRatio;

  if (
    object.enableCollisionDetection ||
    object.minimumZoomDistance === 0.0 ||
    !defined(object._globe) // look-at mode
  ) {
    if (distance > 0.0 && Math.abs(distanceMeasure - minHeight) < 1.0) {
      return;
    }

    if (distance < 0.0 && Math.abs(distanceMeasure - maxHeight) < 1.0) {
      return;
    }

    if (distanceMeasure - distance < minHeight) {
      distance = distanceMeasure - minHeight - 1.0;
    } else if (distanceMeasure - distance > maxHeight) {
      distance = distanceMeasure - maxHeight;
    }
  }

  const scene = object._scene;
  const camera = scene.camera;
  const mode = scene.mode;

  const orientation = scratchZoomViewOptions.orientation;
  orientation.heading = camera.heading;
  orientation.pitch = camera.pitch;
  orientation.roll = camera.roll;

  if (camera.frustum instanceof OrthographicFrustum) {
    if (Math.abs(distance) > 0.0) {
      camera.zoomIn(distance);
      camera._adjustOrthographicFrustum();
    }
    return;
  }

  const sameStartPosition = Cartesian2.equals(
    startPosition,
    object._zoomMouseStart
  );
  let zoomingOnVector = object._zoomingOnVector;
  let rotatingZoom = object._rotatingZoom;
  let pickedPosition;

  if (!sameStartPosition) {
    object._zoomMouseStart = Cartesian2.clone(
      startPosition,
      object._zoomMouseStart
    );

    if (defined(object._globe)) {
      if (mode === SceneMode.SCENE2D) {
        pickedPosition = camera.getPickRay(startPosition, scratchZoomPickRay)
          .origin;
        pickedPosition = Cartesian3.fromElements(
          pickedPosition.y,
          pickedPosition.z,
          pickedPosition.x
        );
      } else {
        pickedPosition = pickGlobe(object, startPosition, scratchPickCartesian);
      }
    }
    if (defined(pickedPosition)) {
      object._useZoomWorldPosition = true;
      object._zoomWorldPosition = Cartesian3.clone(
        pickedPosition,
        object._zoomWorldPosition
      );
    } else {
      object._useZoomWorldPosition = false;
    }

    zoomingOnVector = object._zoomingOnVector = false;
    rotatingZoom = object._rotatingZoom = false;
    object._zoomingUnderground = object._cameraUnderground;
  }

  if (!object._useZoomWorldPosition) {
    camera.zoomIn(distance);
    return;
  }

  let zoomOnVector = mode === SceneMode.COLUMBUS_VIEW;

  if (camera.positionCartographic.height < 2000000) {
    rotatingZoom = true;
  }

  if (!sameStartPosition || rotatingZoom) {
    if (mode === SceneMode.SCENE2D) {
      const worldPosition = object._zoomWorldPosition;
      const endPosition = camera.position;

      if (
        !Cartesian3.equals(worldPosition, endPosition) &&
        camera.positionCartographic.height < object._maxCoord.x * 2.0
      ) {
        const savedX = camera.position.x;

        const direction = Cartesian3.subtract(
          worldPosition,
          endPosition,
          scratchZoomDirection
        );
        Cartesian3.normalize(direction, direction);

        const d =
          (Cartesian3.distance(worldPosition, endPosition) * distance) /
          (camera.getMagnitude() * 0.5);
        camera.move(direction, d * 0.5);

        if (
          (camera.position.x < 0.0 && savedX > 0.0) ||
          (camera.position.x > 0.0 && savedX < 0.0)
        ) {
          pickedPosition = camera.getPickRay(startPosition, scratchZoomPickRay)
            .origin;
          pickedPosition = Cartesian3.fromElements(
            pickedPosition.y,
            pickedPosition.z,
            pickedPosition.x
          );
          object._zoomWorldPosition = Cartesian3.clone(
            pickedPosition,
            object._zoomWorldPosition
          );
        }
      }
    } else if (mode === SceneMode.SCENE3D) {
      const cameraPositionNormal = Cartesian3.normalize(
        camera.position,
        scratchCameraPositionNormal
      );
      if (
        object._cameraUnderground ||
        object._zoomingUnderground ||
        (camera.positionCartographic.height < 3000.0 &&
          Math.abs(Cartesian3.dot(camera.direction, cameraPositionNormal)) <
            0.6)
      ) {
        zoomOnVector = true;
      } else {
        const canvas = scene.canvas;

        const centerPixel = scratchCenterPixel;
        centerPixel.x = canvas.clientWidth / 2;
        centerPixel.y = canvas.clientHeight / 2;
        const centerPosition = pickGlobe(
          object,
          centerPixel,
          scratchCenterPosition
        );
        // If centerPosition is not defined, it means the globe does not cover the center position of screen

        if (!defined(centerPosition)) {
          zoomOnVector = true;
        } else if (camera.positionCartographic.height < 1000000) {
          // The math in the else block assumes the camera
          // points toward the earth surface, so we check it here.
          // Theoretically, we should check for 90 degree, but it doesn't behave well when parallel
          // to the earth surface
          if (Cartesian3.dot(camera.direction, cameraPositionNormal) >= -0.5) {
            zoomOnVector = true;
          } else {
            const cameraPosition = scratchCameraPosition;
            Cartesian3.clone(camera.position, cameraPosition);
            const target = object._zoomWorldPosition;

            let targetNormal = scratchTargetNormal;

            targetNormal = Cartesian3.normalize(target, targetNormal);

            if (Cartesian3.dot(targetNormal, cameraPositionNormal) < 0.0) {
              return;
            }

            const center = scratchCenter;
            const forward = scratchForwardNormal;
            Cartesian3.clone(camera.direction, forward);
            Cartesian3.add(
              cameraPosition,
              Cartesian3.multiplyByScalar(forward, 1000, scratchCartesian),
              center
            );

            const positionToTarget = scratchPositionToTarget;
            const positionToTargetNormal = scratchPositionToTargetNormal;
            Cartesian3.subtract(target, cameraPosition, positionToTarget);

            Cartesian3.normalize(positionToTarget, positionToTargetNormal);

            const alphaDot = Cartesian3.dot(
              cameraPositionNormal,
              positionToTargetNormal
            );
            if (alphaDot >= 0.0) {
              // We zoomed past the target, and this zoom is not valid anymore.
              // This line causes the next zoom movement to pick a new starting point.
              object._zoomMouseStart.x = -1;
              return;
            }
            const alpha = Math.acos(-alphaDot);
            const cameraDistance = Cartesian3.magnitude(cameraPosition);
            const targetDistance = Cartesian3.magnitude(target);
            const remainingDistance = cameraDistance - distance;
            const positionToTargetDistance = Cartesian3.magnitude(
              positionToTarget
            );

            const gamma = Math.asin(
              CesiumMath.clamp(
                (positionToTargetDistance / targetDistance) * Math.sin(alpha),
                -1.0,
                1.0
              )
            );
            const delta = Math.asin(
              CesiumMath.clamp(
                (remainingDistance / targetDistance) * Math.sin(alpha),
                -1.0,
                1.0
              )
            );
            const beta = gamma - delta + alpha;

            const up = scratchCameraUpNormal;
            Cartesian3.normalize(cameraPosition, up);
            let right = scratchCameraRightNormal;
            right = Cartesian3.cross(positionToTargetNormal, up, right);
            right = Cartesian3.normalize(right, right);

            Cartesian3.normalize(
              Cartesian3.cross(up, right, scratchCartesian),
              forward
            );

            // Calculate new position to move to
            Cartesian3.multiplyByScalar(
              Cartesian3.normalize(center, scratchCartesian),
              Cartesian3.magnitude(center) - distance,
              center
            );
            Cartesian3.normalize(cameraPosition, cameraPosition);
            Cartesian3.multiplyByScalar(
              cameraPosition,
              remainingDistance,
              cameraPosition
            );

            // Pan
            const pMid = scratchPan;
            Cartesian3.multiplyByScalar(
              Cartesian3.add(
                Cartesian3.multiplyByScalar(
                  up,
                  Math.cos(beta) - 1,
                  scratchCartesianTwo
                ),
                Cartesian3.multiplyByScalar(
                  forward,
                  Math.sin(beta),
                  scratchCartesianThree
                ),
                scratchCartesian
              ),
              remainingDistance,
              pMid
            );
            Cartesian3.add(cameraPosition, pMid, cameraPosition);

            Cartesian3.normalize(center, up);
            Cartesian3.normalize(
              Cartesian3.cross(up, right, scratchCartesian),
              forward
            );

            const cMid = scratchCenterMovement;
            Cartesian3.multiplyByScalar(
              Cartesian3.add(
                Cartesian3.multiplyByScalar(
                  up,
                  Math.cos(beta) - 1,
                  scratchCartesianTwo
                ),
                Cartesian3.multiplyByScalar(
                  forward,
                  Math.sin(beta),
                  scratchCartesianThree
                ),
                scratchCartesian
              ),
              Cartesian3.magnitude(center),
              cMid
            );
            Cartesian3.add(center, cMid, center);

            // Update camera

            // Set new position
            Cartesian3.clone(cameraPosition, camera.position);

            // Set new direction
            Cartesian3.normalize(
              Cartesian3.subtract(center, cameraPosition, scratchCartesian),
              camera.direction
            );
            Cartesian3.clone(camera.direction, camera.direction);

            // Set new right & up vectors
            Cartesian3.cross(camera.direction, camera.up, camera.right);
            Cartesian3.cross(camera.right, camera.direction, camera.up);

            camera.setView(scratchZoomViewOptions);
            return;
          }
        } else {
          const positionNormal = Cartesian3.normalize(
            centerPosition,
            scratchPositionNormal
          );
          const pickedNormal = Cartesian3.normalize(
            object._zoomWorldPosition,
            scratchPickNormal
          );
          const dotProduct = Cartesian3.dot(pickedNormal, positionNormal);

          if (dotProduct > 0.0 && dotProduct < 1.0) {
            const angle = CesiumMath.acosClamped(dotProduct);
            const axis = Cartesian3.cross(
              pickedNormal,
              positionNormal,
              scratchZoomAxis
            );

            const denom =
              Math.abs(angle) > CesiumMath.toRadians(20.0)
                ? camera.positionCartographic.height * 0.75
                : camera.positionCartographic.height - distance;
            const scalar = distance / denom;
            camera.rotate(axis, angle * scalar);
          }
        }
      }
    }

    object._rotatingZoom = !zoomOnVector;
  }

  if ((!sameStartPosition && zoomOnVector) || zoomingOnVector) {
    let ray;
    const zoomMouseStart = SceneTransforms.wgs84ToWindowCoordinates(
      scene,
      object._zoomWorldPosition,
      scratchZoomOffset
    );
    if (
      mode !== SceneMode.COLUMBUS_VIEW &&
      Cartesian2.equals(startPosition, object._zoomMouseStart) &&
      defined(zoomMouseStart)
    ) {
      ray = camera.getPickRay(zoomMouseStart, scratchZoomPickRay);
    } else {
      ray = camera.getPickRay(startPosition, scratchZoomPickRay);
    }

    const rayDirection = ray.direction;
    if (mode === SceneMode.COLUMBUS_VIEW || mode === SceneMode.SCENE2D) {
      Cartesian3.fromElements(
        rayDirection.y,
        rayDirection.z,
        rayDirection.x,
        rayDirection
      );
    }

    camera.move(rayDirection, distance);

    object._zoomingOnVector = true;
  } else {
    camera.zoomIn(distance);
  }

  if (!object._cameraUnderground) {
    camera.setView(scratchZoomViewOptions);
  }
}

const translate2DStart = new Ray();
const translate2DEnd = new Ray();
const scratchTranslateP0 = new Cartesian3();

function translate2D(controller, startPosition, movement) {
  const scene = controller._scene;
  const camera = scene.camera;
  let start = camera.getPickRay(movement.startPosition, translate2DStart)
    .origin;
  let end = camera.getPickRay(movement.endPosition, translate2DEnd).origin;

  start = Cartesian3.fromElements(start.y, start.z, start.x, start);
  end = Cartesian3.fromElements(end.y, end.z, end.x, end);

  const direction = Cartesian3.subtract(start, end, scratchTranslateP0);
  const distance = Cartesian3.magnitude(direction);

  if (distance > 0.0) {
    Cartesian3.normalize(direction, direction);
    camera.move(direction, distance);
  }
}

function zoom2D(controller, startPosition, movement) {
  if (defined(movement.distance)) {
    movement = movement.distance;
  }

  const scene = controller._scene;
  const camera = scene.camera;

  handleZoom(
    controller,
    startPosition,
    movement,
    controller._zoomFactor,
    camera.getMagnitude()
  );
}

const twist2DStart = new Cartesian2();
const twist2DEnd = new Cartesian2();

function twist2D(controller, startPosition, movement) {
  if (defined(movement.angleAndHeight)) {
    singleAxisTwist2D(controller, startPosition, movement.angleAndHeight);
    return;
  }

  const scene = controller._scene;
  const camera = scene.camera;
  const canvas = scene.canvas;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  let start = twist2DStart;
  start.x = (2.0 / width) * movement.startPosition.x - 1.0;
  start.y = (2.0 / height) * (height - movement.startPosition.y) - 1.0;
  start = Cartesian2.normalize(start, start);

  let end = twist2DEnd;
  end.x = (2.0 / width) * movement.endPosition.x - 1.0;
  end.y = (2.0 / height) * (height - movement.endPosition.y) - 1.0;
  end = Cartesian2.normalize(end, end);

  let startTheta = CesiumMath.acosClamped(start.x);
  if (start.y < 0) {
    startTheta = CesiumMath.TWO_PI - startTheta;
  }
  let endTheta = CesiumMath.acosClamped(end.x);
  if (end.y < 0) {
    endTheta = CesiumMath.TWO_PI - endTheta;
  }
  const theta = endTheta - startTheta;

  camera.twistRight(theta);
}

function singleAxisTwist2D(controller, startPosition, movement) {
  let rotateRate =
    controller._rotateFactor * controller._rotateRateRangeAdjustment;

  if (rotateRate > controller._maximumRotateRate) {
    rotateRate = controller._maximumRotateRate;
  }

  if (rotateRate < controller._minimumRotateRate) {
    rotateRate = controller._minimumRotateRate;
  }

  const scene = controller._scene;
  const camera = scene.camera;
  const canvas = scene.canvas;

  let phiWindowRatio =
    (movement.endPosition.x - movement.startPosition.x) / canvas.clientWidth;
  phiWindowRatio = Math.min(phiWindowRatio, controller.maximumMovementRatio);

  const deltaPhi = rotateRate * phiWindowRatio * Math.PI * 4.0;

  camera.twistRight(deltaPhi);
}

function update2D(controller) {
  const rotatable2D = controller._scene.mapMode2D === MapMode2D.ROTATE;
  if (!Matrix4.equals(Matrix4.IDENTITY, controller._scene.camera.transform)) {
    reactToInput(
      controller,
      controller.enableZoom,
      controller.zoomEventTypes,
      zoom2D,
      controller.inertiaZoom,
      "_lastInertiaZoomMovement"
    );
    if (rotatable2D) {
      reactToInput(
        controller,
        controller.enableRotate,
        controller.translateEventTypes,
        twist2D,
        controller.inertiaSpin,
        "_lastInertiaSpinMovement"
      );
    }
  } else {
    reactToInput(
      controller,
      controller.enableTranslate,
      controller.translateEventTypes,
      translate2D,
      controller.inertiaTranslate,
      "_lastInertiaTranslateMovement"
    );
    reactToInput(
      controller,
      controller.enableZoom,
      controller.zoomEventTypes,
      zoom2D,
      controller.inertiaZoom,
      "_lastInertiaZoomMovement"
    );
    if (rotatable2D) {
      reactToInput(
        controller,
        controller.enableRotate,
        controller.tiltEventTypes,
        twist2D,
        controller.inertiaSpin,
        "_lastInertiaTiltMovement"
      );
    }
  }
}

const pickGlobeScratchRay = new Ray();
const scratchDepthIntersection = new Cartesian3();
const scratchRayIntersection = new Cartesian3();

function pickGlobe(controller, mousePosition, result) {
  const scene = controller._scene;
  const globe = controller._globe;
  const camera = scene.camera;

  if (!defined(globe)) {
    return undefined;
  }

  const cullBackFaces = !controller._cameraUnderground;

  let depthIntersection;
  if (scene.pickPositionSupported) {
    depthIntersection = scene.pickPositionWorldCoordinates(
      mousePosition,
      scratchDepthIntersection
    );
  }

  const ray = camera.getPickRay(mousePosition, pickGlobeScratchRay);
  const rayIntersection = globe.pickWorldCoordinates(
    ray,
    scene,
    cullBackFaces,
    scratchRayIntersection
  );

  const pickDistance = defined(depthIntersection)
    ? Cartesian3.distance(depthIntersection, camera.positionWC)
    : Number.POSITIVE_INFINITY;
  const rayDistance = defined(rayIntersection)
    ? Cartesian3.distance(rayIntersection, camera.positionWC)
    : Number.POSITIVE_INFINITY;

  if (pickDistance < rayDistance) {
    return Cartesian3.clone(depthIntersection, result);
  }

  return Cartesian3.clone(rayIntersection, result);
}

const scratchDistanceCartographic = new Cartographic();

function getDistanceFromSurface(controller) {
  const ellipsoid = controller._ellipsoid;
  const scene = controller._scene;
  const camera = scene.camera;
  const mode = scene.mode;

  let height = 0.0;
  if (mode === SceneMode.SCENE3D) {
    const cartographic = ellipsoid.cartesianToCartographic(
      camera.position,
      scratchDistanceCartographic
    );
    if (defined(cartographic)) {
      height = cartographic.height;
    }
  } else {
    height = camera.position.z;
  }
  const globeHeight = defaultValue(controller._scene.globeHeight, 0.0);
  const distanceFromSurface = Math.abs(globeHeight - height);
  return distanceFromSurface;
}

const scratchSurfaceNormal = new Cartesian3();

function getZoomDistanceUnderground(controller, ray) {
  const origin = ray.origin;
  const direction = ray.direction;
  const distanceFromSurface = getDistanceFromSurface(controller);

  // Weight zoom distance based on how strongly the pick ray is pointing inward.
  // Geocentric normal is accurate enough for these purposes
  const surfaceNormal = Cartesian3.normalize(origin, scratchSurfaceNormal);
  let strength = Math.abs(Cartesian3.dot(surfaceNormal, direction));
  strength = Math.max(strength, 0.5) * 2.0;
  return distanceFromSurface * strength;
}

function getTiltCenterUnderground(controller, ray, pickedPosition, result) {
  let distance = Cartesian3.distance(ray.origin, pickedPosition);
  const distanceFromSurface = getDistanceFromSurface(controller);

  const maximumDistance = CesiumMath.clamp(
    distanceFromSurface * 5.0,
    controller._minimumUndergroundPickDistance,
    controller._maximumUndergroundPickDistance
  );

  if (distance > maximumDistance) {
    // Simulate look-at behavior by tilting around a small invisible sphere
    distance = Math.min(distance, distanceFromSurface / 5.0);
    distance = Math.max(distance, 100.0);
  }

  return Ray.getPoint(ray, distance, result);
}

function getStrafeStartPositionUnderground(
  controller,
  ray,
  pickedPosition,
  result
) {
  let distance;
  if (!defined(pickedPosition)) {
    distance = getDistanceFromSurface(controller);
  } else {
    distance = Cartesian3.distance(ray.origin, pickedPosition);
    if (distance > controller._maximumUndergroundPickDistance) {
      // If the picked position is too far away set the strafe speed based on the
      // camera's height from the globe surface
      distance = getDistanceFromSurface(controller);
    }
  }

  return Ray.getPoint(ray, distance, result);
}

const scratchInertialDelta = new Cartesian2();

function continueStrafing(controller, movement) {
  // Update the end position continually based on the inertial delta
  const originalEndPosition = movement.endPosition;
  const inertialDelta = Cartesian2.subtract(
    movement.endPosition,
    movement.startPosition,
    scratchInertialDelta
  );
  const endPosition = controller._strafeEndMousePosition;
  Cartesian2.add(endPosition, inertialDelta, endPosition);
  movement.endPosition = endPosition;
  strafe(controller, movement, controller._strafeStartPosition);
  movement.endPosition = originalEndPosition;
}

const translateCVStartRay = new Ray();
const translateCVEndRay = new Ray();
const translateCVStartPos = new Cartesian3();
const translateCVEndPos = new Cartesian3();
const translateCVDifference = new Cartesian3();
const translateCVOrigin = new Cartesian3();
const translateCVPlane = new Plane(Cartesian3.UNIT_X, 0.0);
const translateCVStartMouse = new Cartesian2();
const translateCVEndMouse = new Cartesian2();

function translateCV(controller, startPosition, movement) {
  if (!Cartesian3.equals(startPosition, controller._translateMousePosition)) {
    controller._looking = false;
  }

  if (!Cartesian3.equals(startPosition, controller._strafeMousePosition)) {
    controller._strafing = false;
  }

  if (controller._looking) {
    look3D(controller, startPosition, movement);
    return;
  }

  if (controller._strafing) {
    continueStrafing(controller, movement);
    return;
  }

  const scene = controller._scene;
  const camera = scene.camera;
  const cameraUnderground = controller._cameraUnderground;
  const startMouse = Cartesian2.clone(
    movement.startPosition,
    translateCVStartMouse
  );
  const endMouse = Cartesian2.clone(movement.endPosition, translateCVEndMouse);
  let startRay = camera.getPickRay(startMouse, translateCVStartRay);

  const origin = Cartesian3.clone(Cartesian3.ZERO, translateCVOrigin);
  const normal = Cartesian3.UNIT_X;

  let globePos;
  if (camera.position.z < controller._minimumPickingTerrainHeight) {
    globePos = pickGlobe(controller, startMouse, translateCVStartPos);
    if (defined(globePos)) {
      origin.x = globePos.x;
    }
  }

  if (
    cameraUnderground ||
    (origin.x > camera.position.z && defined(globePos))
  ) {
    let pickPosition = globePos;
    if (cameraUnderground) {
      pickPosition = getStrafeStartPositionUnderground(
        controller,
        startRay,
        globePos,
        translateCVStartPos
      );
    }
    Cartesian2.clone(startPosition, controller._strafeMousePosition);
    Cartesian2.clone(startPosition, controller._strafeEndMousePosition);
    Cartesian3.clone(pickPosition, controller._strafeStartPosition);
    controller._strafing = true;
    strafe(controller, movement, controller._strafeStartPosition);
    return;
  }

  const plane = Plane.fromPointNormal(origin, normal, translateCVPlane);

  startRay = camera.getPickRay(startMouse, translateCVStartRay);
  const startPlanePos = IntersectionTests.rayPlane(
    startRay,
    plane,
    translateCVStartPos
  );

  const endRay = camera.getPickRay(endMouse, translateCVEndRay);
  const endPlanePos = IntersectionTests.rayPlane(
    endRay,
    plane,
    translateCVEndPos
  );

  if (!defined(startPlanePos) || !defined(endPlanePos)) {
    controller._looking = true;
    look3D(controller, startPosition, movement);
    Cartesian2.clone(startPosition, controller._translateMousePosition);
    return;
  }

  const diff = Cartesian3.subtract(
    startPlanePos,
    endPlanePos,
    translateCVDifference
  );
  const temp = diff.x;
  diff.x = diff.y;
  diff.y = diff.z;
  diff.z = temp;
  const mag = Cartesian3.magnitude(diff);
  if (mag > CesiumMath.EPSILON6) {
    Cartesian3.normalize(diff, diff);
    camera.move(diff, mag);
  }
}

const rotateCVWindowPos = new Cartesian2();
const rotateCVWindowRay = new Ray();
const rotateCVCenter = new Cartesian3();
const rotateCVVerticalCenter = new Cartesian3();
const rotateCVTransform = new Matrix4();
const rotateCVVerticalTransform = new Matrix4();
const rotateCVOrigin = new Cartesian3();
const rotateCVPlane = new Plane(Cartesian3.UNIT_X, 0.0);
const rotateCVCartesian3 = new Cartesian3();
const rotateCVCart = new Cartographic();
const rotateCVOldTransform = new Matrix4();
const rotateCVQuaternion = new Quaternion();
const rotateCVMatrix = new Matrix3();
const tilt3DCartesian3 = new Cartesian3();

function rotateCV(controller, startPosition, movement) {
  if (defined(movement.angleAndHeight)) {
    movement = movement.angleAndHeight;
  }

  if (!Cartesian2.equals(startPosition, controller._tiltCenterMousePosition)) {
    controller._tiltCVOffMap = false;
    controller._looking = false;
  }

  if (controller._looking) {
    look3D(controller, startPosition, movement);
    return;
  }

  const scene = controller._scene;
  const camera = scene.camera;

  if (
    controller._tiltCVOffMap ||
    !controller.onMap() ||
    Math.abs(camera.position.z) > controller._minimumPickingTerrainHeight
  ) {
    controller._tiltCVOffMap = true;
    rotateCVOnPlane(controller, startPosition, movement);
  } else {
    rotateCVOnTerrain(controller, startPosition, movement);
  }
}

function rotateCVOnPlane(controller, startPosition, movement) {
  const scene = controller._scene;
  const camera = scene.camera;
  const canvas = scene.canvas;

  const windowPosition = rotateCVWindowPos;
  windowPosition.x = canvas.clientWidth / 2;
  windowPosition.y = canvas.clientHeight / 2;
  const ray = camera.getPickRay(windowPosition, rotateCVWindowRay);
  const normal = Cartesian3.UNIT_X;

  const position = ray.origin;
  const direction = ray.direction;
  let scalar;
  const normalDotDirection = Cartesian3.dot(normal, direction);
  if (Math.abs(normalDotDirection) > CesiumMath.EPSILON6) {
    scalar = -Cartesian3.dot(normal, position) / normalDotDirection;
  }

  if (!defined(scalar) || scalar <= 0.0) {
    controller._looking = true;
    look3D(controller, startPosition, movement);
    Cartesian2.clone(startPosition, controller._tiltCenterMousePosition);
    return;
  }

  const center = Cartesian3.multiplyByScalar(direction, scalar, rotateCVCenter);
  Cartesian3.add(position, center, center);

  const projection = scene.mapProjection;
  const ellipsoid = projection.ellipsoid;

  Cartesian3.fromElements(center.y, center.z, center.x, center);
  const cart = projection.unproject(center, rotateCVCart);
  ellipsoid.cartographicToCartesian(cart, center);

  const transform = Transforms.eastNorthUpToFixedFrame(
    center,
    ellipsoid,
    rotateCVTransform
  );

  const oldGlobe = controller._globe;
  const oldEllipsoid = controller._ellipsoid;
  controller._globe = undefined;
  controller._ellipsoid = Ellipsoid.UNIT_SPHERE;
  controller._rotateFactor = 1.0;
  controller._rotateRateRangeAdjustment = 1.0;

  const oldTransform = Matrix4.clone(camera.transform, rotateCVOldTransform);
  camera._setTransform(transform);

  rotate3D(controller, startPosition, movement, Cartesian3.UNIT_Z);

  camera._setTransform(oldTransform);
  controller._globe = oldGlobe;
  controller._ellipsoid = oldEllipsoid;

  const radius = oldEllipsoid.maximumRadius;
  controller._rotateFactor = 1.0 / radius;
  controller._rotateRateRangeAdjustment = radius;
}

function rotateCVOnTerrain(controller, startPosition, movement) {
  const scene = controller._scene;
  const camera = scene.camera;
  const cameraUnderground = controller._cameraUnderground;

  let center;
  let ray;
  const normal = Cartesian3.UNIT_X;

  if (Cartesian2.equals(startPosition, controller._tiltCenterMousePosition)) {
    center = Cartesian3.clone(controller._tiltCenter, rotateCVCenter);
  } else {
    if (camera.position.z < controller._minimumPickingTerrainHeight) {
      center = pickGlobe(controller, startPosition, rotateCVCenter);
    }

    if (!defined(center)) {
      ray = camera.getPickRay(startPosition, rotateCVWindowRay);
      const position = ray.origin;
      const direction = ray.direction;

      let scalar;
      const normalDotDirection = Cartesian3.dot(normal, direction);
      if (Math.abs(normalDotDirection) > CesiumMath.EPSILON6) {
        scalar = -Cartesian3.dot(normal, position) / normalDotDirection;
      }

      if (!defined(scalar) || scalar <= 0.0) {
        controller._looking = true;
        look3D(controller, startPosition, movement);
        Cartesian2.clone(startPosition, controller._tiltCenterMousePosition);
        return;
      }

      center = Cartesian3.multiplyByScalar(direction, scalar, rotateCVCenter);
      Cartesian3.add(position, center, center);
    }

    if (cameraUnderground) {
      if (!defined(ray)) {
        ray = camera.getPickRay(startPosition, rotateCVWindowRay);
      }
      getTiltCenterUnderground(controller, ray, center, center);
    }

    Cartesian2.clone(startPosition, controller._tiltCenterMousePosition);
    Cartesian3.clone(center, controller._tiltCenter);
  }

  const canvas = scene.canvas;

  const windowPosition = rotateCVWindowPos;
  windowPosition.x = canvas.clientWidth / 2;
  windowPosition.y = controller._tiltCenterMousePosition.y;
  ray = camera.getPickRay(windowPosition, rotateCVWindowRay);

  const origin = Cartesian3.clone(Cartesian3.ZERO, rotateCVOrigin);
  origin.x = center.x;

  const plane = Plane.fromPointNormal(origin, normal, rotateCVPlane);
  const verticalCenter = IntersectionTests.rayPlane(
    ray,
    plane,
    rotateCVVerticalCenter
  );

  const projection = camera._projection;
  const ellipsoid = projection.ellipsoid;

  Cartesian3.fromElements(center.y, center.z, center.x, center);
  let cart = projection.unproject(center, rotateCVCart);
  ellipsoid.cartographicToCartesian(cart, center);

  const transform = Transforms.eastNorthUpToFixedFrame(
    center,
    ellipsoid,
    rotateCVTransform
  );

  let verticalTransform;
  if (defined(verticalCenter)) {
    Cartesian3.fromElements(
      verticalCenter.y,
      verticalCenter.z,
      verticalCenter.x,
      verticalCenter
    );
    cart = projection.unproject(verticalCenter, rotateCVCart);
    ellipsoid.cartographicToCartesian(cart, verticalCenter);

    verticalTransform = Transforms.eastNorthUpToFixedFrame(
      verticalCenter,
      ellipsoid,
      rotateCVVerticalTransform
    );
  } else {
    verticalTransform = transform;
  }

  const oldGlobe = controller._globe;
  const oldEllipsoid = controller._ellipsoid;
  controller._globe = undefined;
  controller._ellipsoid = Ellipsoid.UNIT_SPHERE;
  controller._rotateFactor = 1.0;
  controller._rotateRateRangeAdjustment = 1.0;

  let constrainedAxis = Cartesian3.UNIT_Z;

  const oldTransform = Matrix4.clone(camera.transform, rotateCVOldTransform);
  camera._setTransform(transform);

  const tangent = Cartesian3.cross(
    Cartesian3.UNIT_Z,
    Cartesian3.normalize(camera.position, rotateCVCartesian3),
    rotateCVCartesian3
  );
  const dot = Cartesian3.dot(camera.right, tangent);

  rotate3D(controller, startPosition, movement, constrainedAxis, false, true);

  camera._setTransform(verticalTransform);
  if (dot < 0.0) {
    const movementDelta = movement.startPosition.y - movement.endPosition.y;
    if (
      (cameraUnderground && movementDelta < 0.0) ||
      (!cameraUnderground && movementDelta > 0.0)
    ) {
      // Prevent camera from flipping past the up axis
      constrainedAxis = undefined;
    }

    const oldConstrainedAxis = camera.constrainedAxis;
    camera.constrainedAxis = undefined;

    rotate3D(controller, startPosition, movement, constrainedAxis, true, false);

    camera.constrainedAxis = oldConstrainedAxis;
  } else {
    rotate3D(controller, startPosition, movement, constrainedAxis, true, false);
  }

  if (defined(camera.constrainedAxis)) {
    const right = Cartesian3.cross(
      camera.direction,
      camera.constrainedAxis,
      tilt3DCartesian3
    );
    if (
      !Cartesian3.equalsEpsilon(right, Cartesian3.ZERO, CesiumMath.EPSILON6)
    ) {
      if (Cartesian3.dot(right, camera.right) < 0.0) {
        Cartesian3.negate(right, right);
      }

      Cartesian3.cross(right, camera.direction, camera.up);
      Cartesian3.cross(camera.direction, camera.up, camera.right);

      Cartesian3.normalize(camera.up, camera.up);
      Cartesian3.normalize(camera.right, camera.right);
    }
  }

  camera._setTransform(oldTransform);
  controller._globe = oldGlobe;
  controller._ellipsoid = oldEllipsoid;

  const radius = oldEllipsoid.maximumRadius;
  controller._rotateFactor = 1.0 / radius;
  controller._rotateRateRangeAdjustment = radius;

  const originalPosition = Cartesian3.clone(
    camera.positionWC,
    rotateCVCartesian3
  );

  if (controller.enableCollisionDetection) {
    adjustHeightForTerrain(controller);
  }

  if (!Cartesian3.equals(camera.positionWC, originalPosition)) {
    camera._setTransform(verticalTransform);
    camera.worldToCameraCoordinatesPoint(originalPosition, originalPosition);

    const magSqrd = Cartesian3.magnitudeSquared(originalPosition);
    if (Cartesian3.magnitudeSquared(camera.position) > magSqrd) {
      Cartesian3.normalize(camera.position, camera.position);
      Cartesian3.multiplyByScalar(
        camera.position,
        Math.sqrt(magSqrd),
        camera.position
      );
    }

    const angle = Cartesian3.angleBetween(originalPosition, camera.position);
    const axis = Cartesian3.cross(
      originalPosition,
      camera.position,
      originalPosition
    );
    Cartesian3.normalize(axis, axis);

    const quaternion = Quaternion.fromAxisAngle(
      axis,
      angle,
      rotateCVQuaternion
    );
    const rotation = Matrix3.fromQuaternion(quaternion, rotateCVMatrix);
    Matrix3.multiplyByVector(rotation, camera.direction, camera.direction);
    Matrix3.multiplyByVector(rotation, camera.up, camera.up);
    Cartesian3.cross(camera.direction, camera.up, camera.right);
    Cartesian3.cross(camera.right, camera.direction, camera.up);

    camera._setTransform(oldTransform);
  }
}

const zoomCVWindowPos = new Cartesian2();
const zoomCVWindowRay = new Ray();
const zoomCVIntersection = new Cartesian3();

function zoomCV(controller, startPosition, movement) {
  if (defined(movement.distance)) {
    movement = movement.distance;
  }

  const scene = controller._scene;
  const camera = scene.camera;
  const canvas = scene.canvas;

  const cameraUnderground = controller._cameraUnderground;

  let windowPosition;

  if (cameraUnderground) {
    windowPosition = startPosition;
  } else {
    windowPosition = zoomCVWindowPos;
    windowPosition.x = canvas.clientWidth / 2;
    windowPosition.y = canvas.clientHeight / 2;
  }

  const ray = camera.getPickRay(windowPosition, zoomCVWindowRay);
  const position = ray.origin;
  const direction = ray.direction;
  const height = camera.position.z;

  let intersection;
  if (height < controller._minimumPickingTerrainHeight) {
    intersection = pickGlobe(controller, windowPosition, zoomCVIntersection);
  }

  let distance;
  if (defined(intersection)) {
    distance = Cartesian3.distance(position, intersection);
  }

  if (cameraUnderground) {
    const distanceUnderground = getZoomDistanceUnderground(
      controller,
      ray,
      height
    );
    if (defined(distance)) {
      distance = Math.min(distance, distanceUnderground);
    } else {
      distance = distanceUnderground;
    }
  }

  if (!defined(distance)) {
    const normal = Cartesian3.UNIT_X;
    distance =
      -Cartesian3.dot(normal, position) / Cartesian3.dot(normal, direction);
  }

  handleZoom(
    controller,
    startPosition,
    movement,
    controller._zoomFactor,
    distance
  );
}

function updateCV(controller) {
  const scene = controller._scene;
  const camera = scene.camera;

  if (!Matrix4.equals(Matrix4.IDENTITY, camera.transform)) {
    reactToInput(
      controller,
      controller.enableRotate,
      controller.rotateEventTypes,
      rotate3D,
      controller.inertiaSpin,
      "_lastInertiaSpinMovement"
    );
    reactToInput(
      controller,
      controller.enableZoom,
      controller.zoomEventTypes,
      zoom3D,
      controller.inertiaZoom,
      "_lastInertiaZoomMovement"
    );
  } else {
    const tweens = controller._tweens;

    if (controller._aggregator.anyButtonDown) {
      tweens.removeAll();
    }

    reactToInput(
      controller,
      controller.enableTilt,
      controller.tiltEventTypes,
      rotateCV,
      controller.inertiaSpin,
      "_lastInertiaTiltMovement"
    );
    reactToInput(
      controller,
      controller.enableTranslate,
      controller.translateEventTypes,
      translateCV,
      controller.inertiaTranslate,
      "_lastInertiaTranslateMovement"
    );
    reactToInput(
      controller,
      controller.enableZoom,
      controller.zoomEventTypes,
      zoomCV,
      controller.inertiaZoom,
      "_lastInertiaZoomMovement"
    );
    reactToInput(
      controller,
      controller.enableLook,
      controller.lookEventTypes,
      look3D
    );

    if (
      !controller._aggregator.anyButtonDown &&
      !tweens.contains(controller._tween)
    ) {
      const tween = camera.createCorrectPositionTween(
        controller.bounceAnimationTime
      );
      if (defined(tween)) {
        controller._tween = tweens.add(tween);
      }
    }

    tweens.update();
  }
}

const scratchStrafeRay = new Ray();
const scratchStrafePlane = new Plane(Cartesian3.UNIT_X, 0.0);
const scratchStrafeIntersection = new Cartesian3();
const scratchStrafeDirection = new Cartesian3();
const scratchMousePos = new Cartesian3();

function strafe(controller, movement, strafeStartPosition) {
  const scene = controller._scene;
  const camera = scene.camera;

  const ray = camera.getPickRay(movement.endPosition, scratchStrafeRay);

  let direction = Cartesian3.clone(camera.direction, scratchStrafeDirection);
  if (scene.mode === SceneMode.COLUMBUS_VIEW) {
    Cartesian3.fromElements(direction.z, direction.x, direction.y, direction);
  }

  const plane = Plane.fromPointNormal(
    strafeStartPosition,
    direction,
    scratchStrafePlane
  );
  const intersection = IntersectionTests.rayPlane(
    ray,
    plane,
    scratchStrafeIntersection
  );
  if (!defined(intersection)) {
    return;
  }

  direction = Cartesian3.subtract(strafeStartPosition, intersection, direction);
  if (scene.mode === SceneMode.COLUMBUS_VIEW) {
    Cartesian3.fromElements(direction.y, direction.z, direction.x, direction);
  }

  Cartesian3.add(camera.position, direction, camera.position);
}

const spin3DPick = new Cartesian3();
const scratchCartographic = new Cartographic();
const scratchRadii = new Cartesian3();
const scratchEllipsoid = new Ellipsoid();
const scratchLookUp = new Cartesian3();
const scratchNormal = new Cartesian3();

function spin3D(controller, startPosition, movement) {
  const scene = controller._scene;
  const camera = scene.camera;
  const cameraUnderground = controller._cameraUnderground;
  let ellipsoid = controller._ellipsoid;

  if (!Matrix4.equals(camera.transform, Matrix4.IDENTITY)) {
    rotate3D(controller, startPosition, movement);
    return;
  }

  let magnitude;
  let radii;

  const up = ellipsoid.geodeticSurfaceNormal(camera.position, scratchLookUp);

  if (Cartesian2.equals(startPosition, controller._rotateMousePosition)) {
    if (controller._looking) {
      look3D(controller, startPosition, movement, up);
    } else if (controller._rotating) {
      rotate3D(controller, startPosition, movement);
    } else if (controller._strafing) {
      continueStrafing(controller, movement);
    } else {
      if (
        Cartesian3.magnitude(camera.position) <
        Cartesian3.magnitude(controller._rotateStartPosition)
      ) {
        // Pan action is no longer valid if camera moves below the pan ellipsoid
        return;
      }
      magnitude = Cartesian3.magnitude(controller._rotateStartPosition);
      radii = scratchRadii;
      radii.x = radii.y = radii.z = magnitude;
      ellipsoid = Ellipsoid.fromCartesian3(radii, scratchEllipsoid);
      pan3D(controller, startPosition, movement, ellipsoid);
    }
    return;
  }
  controller._looking = false;
  controller._rotating = false;
  controller._strafing = false;

  const height = ellipsoid.cartesianToCartographic(
    camera.positionWC,
    scratchCartographic
  ).height;
  const globe = controller._globe;

  if (defined(globe) && height < controller._minimumPickingTerrainHeight) {
    const mousePos = pickGlobe(
      controller,
      movement.startPosition,
      scratchMousePos
    );
    if (defined(mousePos)) {
      let strafing = false;
      const ray = camera.getPickRay(
        movement.startPosition,
        pickGlobeScratchRay
      );

      if (cameraUnderground) {
        strafing = true;
        getStrafeStartPositionUnderground(controller, ray, mousePos, mousePos);
      } else {
        const normal = ellipsoid.geodeticSurfaceNormal(mousePos, scratchNormal);
        const tangentPick =
          Math.abs(Cartesian3.dot(ray.direction, normal)) < 0.05;

        if (tangentPick) {
          strafing = true;
        } else {
          strafing =
            Cartesian3.magnitude(camera.position) <
            Cartesian3.magnitude(mousePos);
        }
      }

      if (strafing) {
        Cartesian2.clone(startPosition, controller._strafeEndMousePosition);
        Cartesian3.clone(mousePos, controller._strafeStartPosition);
        controller._strafing = true;
        strafe(controller, movement, controller._strafeStartPosition);
      } else {
        magnitude = Cartesian3.magnitude(mousePos);
        radii = scratchRadii;
        radii.x = radii.y = radii.z = magnitude;
        ellipsoid = Ellipsoid.fromCartesian3(radii, scratchEllipsoid);
        pan3D(controller, startPosition, movement, ellipsoid);

        Cartesian3.clone(mousePos, controller._rotateStartPosition);
      }
    } else {
      controller._looking = true;
      look3D(controller, startPosition, movement, up);
    }
  } else if (
    defined(
      camera.pickEllipsoid(
        movement.startPosition,
        controller._ellipsoid,
        spin3DPick
      )
    )
  ) {
    pan3D(controller, startPosition, movement, controller._ellipsoid);
    Cartesian3.clone(spin3DPick, controller._rotateStartPosition);
  } else if (height > controller._minimumTrackBallHeight) {
    controller._rotating = true;
    rotate3D(controller, startPosition, movement);
  } else {
    controller._looking = true;
    look3D(controller, startPosition, movement, up);
  }

  Cartesian2.clone(startPosition, controller._rotateMousePosition);
}

function rotate3D(
  controller,
  startPosition,
  movement,
  constrainedAxis,
  rotateOnlyVertical,
  rotateOnlyHorizontal
) {
  rotateOnlyVertical = defaultValue(rotateOnlyVertical, false);
  rotateOnlyHorizontal = defaultValue(rotateOnlyHorizontal, false);

  const scene = controller._scene;
  const camera = scene.camera;
  const canvas = scene.canvas;

  const oldAxis = camera.constrainedAxis;
  if (defined(constrainedAxis)) {
    camera.constrainedAxis = constrainedAxis;
  }

  const rho = Cartesian3.magnitude(camera.position);
  let rotateRate =
    controller._rotateFactor * (rho - controller._rotateRateRangeAdjustment);

  if (rotateRate > controller._maximumRotateRate) {
    rotateRate = controller._maximumRotateRate;
  }

  if (rotateRate < controller._minimumRotateRate) {
    rotateRate = controller._minimumRotateRate;
  }

  let phiWindowRatio =
    (movement.startPosition.x - movement.endPosition.x) / canvas.clientWidth;
  let thetaWindowRatio =
    (movement.startPosition.y - movement.endPosition.y) / canvas.clientHeight;
  phiWindowRatio = Math.min(phiWindowRatio, controller.maximumMovementRatio);
  thetaWindowRatio = Math.min(
    thetaWindowRatio,
    controller.maximumMovementRatio
  );

  const deltaPhi = rotateRate * phiWindowRatio * Math.PI * 2.0;
  const deltaTheta = rotateRate * thetaWindowRatio * Math.PI;

  if (!rotateOnlyVertical) {
    camera.rotateRight(deltaPhi);
  }

  if (!rotateOnlyHorizontal) {
    camera.rotateUp(deltaTheta);
  }

  camera.constrainedAxis = oldAxis;
}

const pan3DP0 = Cartesian4.clone(Cartesian4.UNIT_W);
const pan3DP1 = Cartesian4.clone(Cartesian4.UNIT_W);
const pan3DTemp0 = new Cartesian3();
const pan3DTemp1 = new Cartesian3();
const pan3DTemp2 = new Cartesian3();
const pan3DTemp3 = new Cartesian3();
const pan3DStartMousePosition = new Cartesian2();
const pan3DEndMousePosition = new Cartesian2();

function pan3D(controller, startPosition, movement, ellipsoid) {
  const scene = controller._scene;
  const camera = scene.camera;

  const startMousePosition = Cartesian2.clone(
    movement.startPosition,
    pan3DStartMousePosition
  );
  const endMousePosition = Cartesian2.clone(
    movement.endPosition,
    pan3DEndMousePosition
  );

  let p0 = camera.pickEllipsoid(startMousePosition, ellipsoid, pan3DP0);
  let p1 = camera.pickEllipsoid(endMousePosition, ellipsoid, pan3DP1);

  if (!defined(p0) || !defined(p1)) {
    controller._rotating = true;
    rotate3D(controller, startPosition, movement);
    return;
  }

  p0 = camera.worldToCameraCoordinates(p0, p0);
  p1 = camera.worldToCameraCoordinates(p1, p1);

  if (!defined(camera.constrainedAxis)) {
    Cartesian3.normalize(p0, p0);
    Cartesian3.normalize(p1, p1);
    const dot = Cartesian3.dot(p0, p1);
    const axis = Cartesian3.cross(p0, p1, pan3DTemp0);

    if (
      dot < 1.0 &&
      !Cartesian3.equalsEpsilon(axis, Cartesian3.ZERO, CesiumMath.EPSILON14)
    ) {
      // dot is in [0, 1]
      const angle = Math.acos(dot);
      camera.rotate(axis, angle);
    }
  } else {
    const basis0 = camera.constrainedAxis;
    const basis1 = Cartesian3.mostOrthogonalAxis(basis0, pan3DTemp0);
    Cartesian3.cross(basis1, basis0, basis1);
    Cartesian3.normalize(basis1, basis1);
    const basis2 = Cartesian3.cross(basis0, basis1, pan3DTemp1);

    const startRho = Cartesian3.magnitude(p0);
    const startDot = Cartesian3.dot(basis0, p0);
    const startTheta = Math.acos(startDot / startRho);
    const startRej = Cartesian3.multiplyByScalar(basis0, startDot, pan3DTemp2);
    Cartesian3.subtract(p0, startRej, startRej);
    Cartesian3.normalize(startRej, startRej);

    const endRho = Cartesian3.magnitude(p1);
    const endDot = Cartesian3.dot(basis0, p1);
    const endTheta = Math.acos(endDot / endRho);
    const endRej = Cartesian3.multiplyByScalar(basis0, endDot, pan3DTemp3);
    Cartesian3.subtract(p1, endRej, endRej);
    Cartesian3.normalize(endRej, endRej);

    let startPhi = Math.acos(Cartesian3.dot(startRej, basis1));
    if (Cartesian3.dot(startRej, basis2) < 0) {
      startPhi = CesiumMath.TWO_PI - startPhi;
    }

    let endPhi = Math.acos(Cartesian3.dot(endRej, basis1));
    if (Cartesian3.dot(endRej, basis2) < 0) {
      endPhi = CesiumMath.TWO_PI - endPhi;
    }

    const deltaPhi = startPhi - endPhi;

    let east;
    if (
      Cartesian3.equalsEpsilon(basis0, camera.position, CesiumMath.EPSILON2)
    ) {
      east = camera.right;
    } else {
      east = Cartesian3.cross(basis0, camera.position, pan3DTemp0);
    }

    const planeNormal = Cartesian3.cross(basis0, east, pan3DTemp0);
    const side0 = Cartesian3.dot(
      planeNormal,
      Cartesian3.subtract(p0, basis0, pan3DTemp1)
    );
    const side1 = Cartesian3.dot(
      planeNormal,
      Cartesian3.subtract(p1, basis0, pan3DTemp1)
    );

    let deltaTheta;
    if (side0 > 0 && side1 > 0) {
      deltaTheta = endTheta - startTheta;
    } else if (side0 > 0 && side1 <= 0) {
      if (Cartesian3.dot(camera.position, basis0) > 0) {
        deltaTheta = -startTheta - endTheta;
      } else {
        deltaTheta = startTheta + endTheta;
      }
    } else {
      deltaTheta = startTheta - endTheta;
    }

    camera.rotateRight(deltaPhi);
    camera.rotateUp(deltaTheta);
  }
}

const zoom3DUnitPosition = new Cartesian3();
const zoom3DCartographic = new Cartographic();

function zoom3D(controller, startPosition, movement) {
  if (defined(movement.distance)) {
    movement = movement.distance;
  }

  const ellipsoid = controller._ellipsoid;
  const scene = controller._scene;
  const camera = scene.camera;
  const canvas = scene.canvas;

  const cameraUnderground = controller._cameraUnderground;

  let windowPosition;

  if (cameraUnderground) {
    windowPosition = startPosition;
  } else {
    windowPosition = zoomCVWindowPos;
    windowPosition.x = canvas.clientWidth / 2;
    windowPosition.y = canvas.clientHeight / 2;
  }

  const ray = camera.getPickRay(windowPosition, zoomCVWindowRay);

  let intersection;
  const height = ellipsoid.cartesianToCartographic(
    camera.position,
    zoom3DCartographic
  ).height;
  if (height < controller._minimumPickingTerrainHeight) {
    intersection = pickGlobe(controller, windowPosition, zoomCVIntersection);
  }

  let distance;
  if (defined(intersection)) {
    distance = Cartesian3.distance(ray.origin, intersection);
  }

  if (cameraUnderground) {
    const distanceUnderground = getZoomDistanceUnderground(
      controller,
      ray,
      height
    );
    if (defined(distance)) {
      distance = Math.min(distance, distanceUnderground);
    } else {
      distance = distanceUnderground;
    }
  }

  if (!defined(distance)) {
    distance = height;
  }

  const unitPosition = Cartesian3.normalize(
    camera.position,
    zoom3DUnitPosition
  );
  handleZoom(
    controller,
    startPosition,
    movement,
    controller._zoomFactor,
    distance,
    Cartesian3.dot(unitPosition, camera.direction)
  );
}

const tilt3DWindowPos = new Cartesian2();
const tilt3DRay = new Ray();
const tilt3DCenter = new Cartesian3();
const tilt3DVerticalCenter = new Cartesian3();
const tilt3DTransform = new Matrix4();
const tilt3DVerticalTransform = new Matrix4();
const tilt3DOldTransform = new Matrix4();
const tilt3DQuaternion = new Quaternion();
const tilt3DMatrix = new Matrix3();
const tilt3DCart = new Cartographic();
const tilt3DLookUp = new Cartesian3();

function tilt3D(controller, startPosition, movement) {
  const scene = controller._scene;
  const camera = scene.camera;

  if (!Matrix4.equals(camera.transform, Matrix4.IDENTITY)) {
    return;
  }

  if (defined(movement.angleAndHeight)) {
    movement = movement.angleAndHeight;
  }

  if (!Cartesian2.equals(startPosition, controller._tiltCenterMousePosition)) {
    controller._tiltOnEllipsoid = false;
    controller._looking = false;
  }

  if (controller._looking) {
    const up = controller._ellipsoid.geodeticSurfaceNormal(
      camera.position,
      tilt3DLookUp
    );
    look3D(controller, startPosition, movement, up);
    return;
  }

  const ellipsoid = controller._ellipsoid;
  const cartographic = ellipsoid.cartesianToCartographic(
    camera.position,
    tilt3DCart
  );

  if (
    controller._tiltOnEllipsoid ||
    cartographic.height > controller._minimumCollisionTerrainHeight
  ) {
    controller._tiltOnEllipsoid = true;
    tilt3DOnEllipsoid(controller, startPosition, movement);
  } else {
    tilt3DOnTerrain(controller, startPosition, movement);
  }
}

const tilt3DOnEllipsoidCartographic = new Cartographic();

function tilt3DOnEllipsoid(controller, startPosition, movement) {
  const ellipsoid = controller._ellipsoid;
  const scene = controller._scene;
  const camera = scene.camera;
  const minHeight = controller.minimumZoomDistance * 0.25;
  const height = ellipsoid.cartesianToCartographic(
    camera.positionWC,
    tilt3DOnEllipsoidCartographic
  ).height;
  if (
    height - minHeight - 1.0 < CesiumMath.EPSILON3 &&
    movement.endPosition.y - movement.startPosition.y < 0
  ) {
    return;
  }

  const canvas = scene.canvas;

  const windowPosition = tilt3DWindowPos;
  windowPosition.x = canvas.clientWidth / 2;
  windowPosition.y = canvas.clientHeight / 2;
  const ray = camera.getPickRay(windowPosition, tilt3DRay);

  let center;
  const intersection = IntersectionTests.rayEllipsoid(ray, ellipsoid);
  if (defined(intersection)) {
    center = Ray.getPoint(ray, intersection.start, tilt3DCenter);
  } else if (height > controller._minimumTrackBallHeight) {
    const grazingAltitudeLocation = IntersectionTests.grazingAltitudeLocation(
      ray,
      ellipsoid
    );
    if (!defined(grazingAltitudeLocation)) {
      return;
    }
    const grazingAltitudeCart = ellipsoid.cartesianToCartographic(
      grazingAltitudeLocation,
      tilt3DCart
    );
    grazingAltitudeCart.height = 0.0;
    center = ellipsoid.cartographicToCartesian(
      grazingAltitudeCart,
      tilt3DCenter
    );
  } else {
    controller._looking = true;
    const up = controller._ellipsoid.geodeticSurfaceNormal(
      camera.position,
      tilt3DLookUp
    );
    look3D(controller, startPosition, movement, up);
    Cartesian2.clone(startPosition, controller._tiltCenterMousePosition);
    return;
  }

  const transform = Transforms.eastNorthUpToFixedFrame(
    center,
    ellipsoid,
    tilt3DTransform
  );

  const oldGlobe = controller._globe;
  const oldEllipsoid = controller._ellipsoid;
  controller._globe = undefined;
  controller._ellipsoid = Ellipsoid.UNIT_SPHERE;
  controller._rotateFactor = 1.0;
  controller._rotateRateRangeAdjustment = 1.0;

  const oldTransform = Matrix4.clone(camera.transform, tilt3DOldTransform);
  camera._setTransform(transform);

  rotate3D(controller, startPosition, movement, Cartesian3.UNIT_Z);

  camera._setTransform(oldTransform);
  controller._globe = oldGlobe;
  controller._ellipsoid = oldEllipsoid;

  const radius = oldEllipsoid.maximumRadius;
  controller._rotateFactor = 1.0 / radius;
  controller._rotateRateRangeAdjustment = radius;
}

function tilt3DOnTerrain(controller, startPosition, movement) {
  const ellipsoid = controller._ellipsoid;
  const scene = controller._scene;
  const camera = scene.camera;
  const cameraUnderground = controller._cameraUnderground;

  let center;
  let ray;
  let intersection;

  if (Cartesian2.equals(startPosition, controller._tiltCenterMousePosition)) {
    center = Cartesian3.clone(controller._tiltCenter, tilt3DCenter);
  } else {
    center = pickGlobe(controller, startPosition, tilt3DCenter);

    if (!defined(center)) {
      ray = camera.getPickRay(startPosition, tilt3DRay);
      intersection = IntersectionTests.rayEllipsoid(ray, ellipsoid);
      if (!defined(intersection)) {
        const cartographic = ellipsoid.cartesianToCartographic(
          camera.position,
          tilt3DCart
        );
        if (cartographic.height <= controller._minimumTrackBallHeight) {
          controller._looking = true;
          const up = controller._ellipsoid.geodeticSurfaceNormal(
            camera.position,
            tilt3DLookUp
          );
          look3D(controller, startPosition, movement, up);
          Cartesian2.clone(startPosition, controller._tiltCenterMousePosition);
        }
        return;
      }
      center = Ray.getPoint(ray, intersection.start, tilt3DCenter);
    }

    if (cameraUnderground) {
      if (!defined(ray)) {
        ray = camera.getPickRay(startPosition, tilt3DRay);
      }
      getTiltCenterUnderground(controller, ray, center, center);
    }

    Cartesian2.clone(startPosition, controller._tiltCenterMousePosition);
    Cartesian3.clone(center, controller._tiltCenter);
  }

  const canvas = scene.canvas;

  const windowPosition = tilt3DWindowPos;
  windowPosition.x = canvas.clientWidth / 2;
  windowPosition.y = controller._tiltCenterMousePosition.y;
  ray = camera.getPickRay(windowPosition, tilt3DRay);

  const mag = Cartesian3.magnitude(center);
  const radii = Cartesian3.fromElements(mag, mag, mag, scratchRadii);
  const newEllipsoid = Ellipsoid.fromCartesian3(radii, scratchEllipsoid);

  intersection = IntersectionTests.rayEllipsoid(ray, newEllipsoid);
  if (!defined(intersection)) {
    return;
  }

  const t =
    Cartesian3.magnitude(ray.origin) > mag
      ? intersection.start
      : intersection.stop;
  const verticalCenter = Ray.getPoint(ray, t, tilt3DVerticalCenter);

  const transform = Transforms.eastNorthUpToFixedFrame(
    center,
    ellipsoid,
    tilt3DTransform
  );
  const verticalTransform = Transforms.eastNorthUpToFixedFrame(
    verticalCenter,
    newEllipsoid,
    tilt3DVerticalTransform
  );

  const oldGlobe = controller._globe;
  const oldEllipsoid = controller._ellipsoid;
  controller._globe = undefined;
  controller._ellipsoid = Ellipsoid.UNIT_SPHERE;
  controller._rotateFactor = 1.0;
  controller._rotateRateRangeAdjustment = 1.0;

  let constrainedAxis = Cartesian3.UNIT_Z;

  const oldTransform = Matrix4.clone(camera.transform, tilt3DOldTransform);
  camera._setTransform(verticalTransform);

  const tangent = Cartesian3.cross(
    verticalCenter,
    camera.positionWC,
    tilt3DCartesian3
  );
  const dot = Cartesian3.dot(camera.rightWC, tangent);

  if (dot < 0.0) {
    const movementDelta = movement.startPosition.y - movement.endPosition.y;
    if (
      (cameraUnderground && movementDelta < 0.0) ||
      (!cameraUnderground && movementDelta > 0.0)
    ) {
      // Prevent camera from flipping past the up axis
      constrainedAxis = undefined;
    }

    const oldConstrainedAxis = camera.constrainedAxis;
    camera.constrainedAxis = undefined;

    rotate3D(controller, startPosition, movement, constrainedAxis, true, false);

    camera.constrainedAxis = oldConstrainedAxis;
  } else {
    rotate3D(controller, startPosition, movement, constrainedAxis, true, false);
  }

  camera._setTransform(transform);
  rotate3D(controller, startPosition, movement, constrainedAxis, false, true);

  if (defined(camera.constrainedAxis)) {
    const right = Cartesian3.cross(
      camera.direction,
      camera.constrainedAxis,
      tilt3DCartesian3
    );
    if (
      !Cartesian3.equalsEpsilon(right, Cartesian3.ZERO, CesiumMath.EPSILON6)
    ) {
      if (Cartesian3.dot(right, camera.right) < 0.0) {
        Cartesian3.negate(right, right);
      }

      Cartesian3.cross(right, camera.direction, camera.up);
      Cartesian3.cross(camera.direction, camera.up, camera.right);

      Cartesian3.normalize(camera.up, camera.up);
      Cartesian3.normalize(camera.right, camera.right);
    }
  }

  camera._setTransform(oldTransform);
  controller._globe = oldGlobe;
  controller._ellipsoid = oldEllipsoid;

  const radius = oldEllipsoid.maximumRadius;
  controller._rotateFactor = 1.0 / radius;
  controller._rotateRateRangeAdjustment = radius;

  const originalPosition = Cartesian3.clone(
    camera.positionWC,
    tilt3DCartesian3
  );

  if (controller.enableCollisionDetection) {
    adjustHeightForTerrain(controller);
  }

  if (!Cartesian3.equals(camera.positionWC, originalPosition)) {
    camera._setTransform(verticalTransform);
    camera.worldToCameraCoordinatesPoint(originalPosition, originalPosition);

    const magSqrd = Cartesian3.magnitudeSquared(originalPosition);
    if (Cartesian3.magnitudeSquared(camera.position) > magSqrd) {
      Cartesian3.normalize(camera.position, camera.position);
      Cartesian3.multiplyByScalar(
        camera.position,
        Math.sqrt(magSqrd),
        camera.position
      );
    }

    const angle = Cartesian3.angleBetween(originalPosition, camera.position);
    const axis = Cartesian3.cross(
      originalPosition,
      camera.position,
      originalPosition
    );
    Cartesian3.normalize(axis, axis);

    const quaternion = Quaternion.fromAxisAngle(axis, angle, tilt3DQuaternion);
    const rotation = Matrix3.fromQuaternion(quaternion, tilt3DMatrix);
    Matrix3.multiplyByVector(rotation, camera.direction, camera.direction);
    Matrix3.multiplyByVector(rotation, camera.up, camera.up);
    Cartesian3.cross(camera.direction, camera.up, camera.right);
    Cartesian3.cross(camera.right, camera.direction, camera.up);

    camera._setTransform(oldTransform);
  }
}

const look3DStartPos = new Cartesian2();
const look3DEndPos = new Cartesian2();
const look3DStartRay = new Ray();
const look3DEndRay = new Ray();
const look3DNegativeRot = new Cartesian3();
const look3DTan = new Cartesian3();

function look3D(controller, startPosition, movement, rotationAxis) {
  const scene = controller._scene;
  const camera = scene.camera;

  const startPos = look3DStartPos;
  startPos.x = movement.startPosition.x;
  startPos.y = 0.0;
  const endPos = look3DEndPos;
  endPos.x = movement.endPosition.x;
  endPos.y = 0.0;

  let startRay = camera.getPickRay(startPos, look3DStartRay);
  let endRay = camera.getPickRay(endPos, look3DEndRay);
  let angle = 0.0;
  let start;
  let end;

  if (camera.frustum instanceof OrthographicFrustum) {
    start = startRay.origin;
    end = endRay.origin;

    Cartesian3.add(camera.direction, start, start);
    Cartesian3.add(camera.direction, end, end);

    Cartesian3.subtract(start, camera.position, start);
    Cartesian3.subtract(end, camera.position, end);

    Cartesian3.normalize(start, start);
    Cartesian3.normalize(end, end);
  } else {
    start = startRay.direction;
    end = endRay.direction;
  }

  let dot = Cartesian3.dot(start, end);
  if (dot < 1.0) {
    // dot is in [0, 1]
    angle = Math.acos(dot);
  }

  angle = movement.startPosition.x > movement.endPosition.x ? -angle : angle;

  const horizontalRotationAxis = controller._horizontalRotationAxis;
  if (defined(rotationAxis)) {
    camera.look(rotationAxis, -angle);
  } else if (defined(horizontalRotationAxis)) {
    camera.look(horizontalRotationAxis, -angle);
  } else {
    camera.lookLeft(angle);
  }

  startPos.x = 0.0;
  startPos.y = movement.startPosition.y;
  endPos.x = 0.0;
  endPos.y = movement.endPosition.y;

  startRay = camera.getPickRay(startPos, look3DStartRay);
  endRay = camera.getPickRay(endPos, look3DEndRay);
  angle = 0.0;

  if (camera.frustum instanceof OrthographicFrustum) {
    start = startRay.origin;
    end = endRay.origin;

    Cartesian3.add(camera.direction, start, start);
    Cartesian3.add(camera.direction, end, end);

    Cartesian3.subtract(start, camera.position, start);
    Cartesian3.subtract(end, camera.position, end);

    Cartesian3.normalize(start, start);
    Cartesian3.normalize(end, end);
  } else {
    start = startRay.direction;
    end = endRay.direction;
  }

  dot = Cartesian3.dot(start, end);
  if (dot < 1.0) {
    // dot is in [0, 1]
    angle = Math.acos(dot);
  }
  angle = movement.startPosition.y > movement.endPosition.y ? -angle : angle;

  rotationAxis = defaultValue(rotationAxis, horizontalRotationAxis);
  if (defined(rotationAxis)) {
    const direction = camera.direction;
    const negativeRotationAxis = Cartesian3.negate(
      rotationAxis,
      look3DNegativeRot
    );
    const northParallel = Cartesian3.equalsEpsilon(
      direction,
      rotationAxis,
      CesiumMath.EPSILON2
    );
    const southParallel = Cartesian3.equalsEpsilon(
      direction,
      negativeRotationAxis,
      CesiumMath.EPSILON2
    );
    if (!northParallel && !southParallel) {
      dot = Cartesian3.dot(direction, rotationAxis);
      let angleToAxis = CesiumMath.acosClamped(dot);
      if (angle > 0 && angle > angleToAxis) {
        angle = angleToAxis - CesiumMath.EPSILON4;
      }

      dot = Cartesian3.dot(direction, negativeRotationAxis);
      angleToAxis = CesiumMath.acosClamped(dot);
      if (angle < 0 && -angle > angleToAxis) {
        angle = -angleToAxis + CesiumMath.EPSILON4;
      }

      const tangent = Cartesian3.cross(rotationAxis, direction, look3DTan);
      camera.look(tangent, angle);
    } else if ((northParallel && angle < 0) || (southParallel && angle > 0)) {
      camera.look(camera.right, -angle);
    }
  } else {
    camera.lookUp(angle);
  }
}

function update3D(controller) {
  reactToInput(
    controller,
    controller.enableRotate,
    controller.rotateEventTypes,
    spin3D,
    controller.inertiaSpin,
    "_lastInertiaSpinMovement"
  );
  reactToInput(
    controller,
    controller.enableZoom,
    controller.zoomEventTypes,
    zoom3D,
    controller.inertiaZoom,
    "_lastInertiaZoomMovement"
  );
  reactToInput(
    controller,
    controller.enableTilt,
    controller.tiltEventTypes,
    tilt3D,
    controller.inertiaSpin,
    "_lastInertiaTiltMovement"
  );
  reactToInput(
    controller,
    controller.enableLook,
    controller.lookEventTypes,
    look3D
  );
}

const scratchAdjustHeightTransform = new Matrix4();
const scratchAdjustHeightCartographic = new Cartographic();

function adjustHeightForTerrain(controller) {
  controller._adjustedHeightForTerrain = true;

  const scene = controller._scene;
  const mode = scene.mode;
  const globe = scene.globe;

  if (
    !defined(globe) ||
    mode === SceneMode.SCENE2D ||
    mode === SceneMode.MORPHING
  ) {
    return;
  }

  const camera = scene.camera;
  const ellipsoid = globe.ellipsoid;
  const projection = scene.mapProjection;

  let transform;
  let mag;
  if (!Matrix4.equals(camera.transform, Matrix4.IDENTITY)) {
    transform = Matrix4.clone(camera.transform, scratchAdjustHeightTransform);
    mag = Cartesian3.magnitude(camera.position);
    camera._setTransform(Matrix4.IDENTITY);
  }

  const cartographic = scratchAdjustHeightCartographic;
  if (mode === SceneMode.SCENE3D) {
    ellipsoid.cartesianToCartographic(camera.position, cartographic);
  } else {
    projection.unproject(camera.position, cartographic);
  }

  let heightUpdated = false;
  if (cartographic.height < controller._minimumCollisionTerrainHeight) {
    const globeHeight = controller._scene.globeHeight;
    if (defined(globeHeight)) {
      const height = globeHeight + controller.minimumZoomDistance;
      if (cartographic.height < height) {
        cartographic.height = height;
        if (mode === SceneMode.SCENE3D) {
          ellipsoid.cartographicToCartesian(cartographic, camera.position);
        } else {
          projection.project(cartographic, camera.position);
        }
        heightUpdated = true;
      }
    }
  }

  if (defined(transform)) {
    camera._setTransform(transform);
    if (heightUpdated) {
      Cartesian3.normalize(camera.position, camera.position);
      Cartesian3.negate(camera.position, camera.direction);
      Cartesian3.multiplyByScalar(
        camera.position,
        Math.max(mag, controller.minimumZoomDistance),
        camera.position
      );
      Cartesian3.normalize(camera.direction, camera.direction);
      Cartesian3.cross(camera.direction, camera.up, camera.right);
      Cartesian3.cross(camera.right, camera.direction, camera.up);
    }
  }
}

/**
 * @private
 */
ScreenSpaceCameraController.prototype.onMap = function () {
  const scene = this._scene;
  const mode = scene.mode;
  const camera = scene.camera;

  if (mode === SceneMode.COLUMBUS_VIEW) {
    return (
      Math.abs(camera.position.x) - this._maxCoord.x < 0 &&
      Math.abs(camera.position.y) - this._maxCoord.y < 0
    );
  }

  return true;
};

const scratchPreviousPosition = new Cartesian3();
const scratchPreviousDirection = new Cartesian3();

/**
 * @private
 */
ScreenSpaceCameraController.prototype.update = function () {
  const scene = this._scene;
  const camera = scene.camera;
  const globe = scene.globe;
  const mode = scene.mode;

  if (!Matrix4.equals(camera.transform, Matrix4.IDENTITY)) {
    this._globe = undefined;
    this._ellipsoid = Ellipsoid.UNIT_SPHERE;
  } else {
    this._globe = globe;
    this._ellipsoid = defined(this._globe)
      ? this._globe.ellipsoid
      : scene.mapProjection.ellipsoid;
  }

  const exaggeration = defined(this._globe)
    ? this._globe.terrainExaggeration
    : 1.0;
  const exaggerationRelativeHeight = defined(this._globe)
    ? this._globe.terrainExaggerationRelativeHeight
    : 0.0;
  this._minimumCollisionTerrainHeight = TerrainExaggeration.getHeight(
    this.minimumCollisionTerrainHeight,
    exaggeration,
    exaggerationRelativeHeight
  );
  this._minimumPickingTerrainHeight = TerrainExaggeration.getHeight(
    this.minimumPickingTerrainHeight,
    exaggeration,
    exaggerationRelativeHeight
  );
  this._minimumTrackBallHeight = TerrainExaggeration.getHeight(
    this.minimumTrackBallHeight,
    exaggeration,
    exaggerationRelativeHeight
  );

  this._cameraUnderground = scene.cameraUnderground && defined(this._globe);

  const radius = this._ellipsoid.maximumRadius;
  this._rotateFactor = 1.0 / radius;
  this._rotateRateRangeAdjustment = radius;

  this._adjustedHeightForTerrain = false;
  const previousPosition = Cartesian3.clone(
    camera.positionWC,
    scratchPreviousPosition
  );
  const previousDirection = Cartesian3.clone(
    camera.directionWC,
    scratchPreviousDirection
  );

  if (mode === SceneMode.SCENE2D) {
    update2D(this);
  } else if (mode === SceneMode.COLUMBUS_VIEW) {
    this._horizontalRotationAxis = Cartesian3.UNIT_Z;
    updateCV(this);
  } else if (mode === SceneMode.SCENE3D) {
    this._horizontalRotationAxis = undefined;
    update3D(this);
  }

  if (this.enableCollisionDetection && !this._adjustedHeightForTerrain) {
    // Adjust the camera height if the camera moved at all (user input or inertia) and an action didn't already adjust the camera height
    const cameraChanged =
      !Cartesian3.equals(previousPosition, camera.positionWC) ||
      !Cartesian3.equals(previousDirection, camera.directionWC);
    if (cameraChanged) {
      adjustHeightForTerrain(this);
    }
  }

  this._aggregator.reset();
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see ScreenSpaceCameraController#destroy
 */
ScreenSpaceCameraController.prototype.isDestroyed = function () {
  return false;
};

/**
 * Removes mouse listeners held by this object.
 * <br /><br />
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 *
 * @example
 * controller = controller && controller.destroy();
 *
 * @see ScreenSpaceCameraController#isDestroyed
 */
ScreenSpaceCameraController.prototype.destroy = function () {
  this._tweens.removeAll();
  this._aggregator = this._aggregator && this._aggregator.destroy();
  return destroyObject(this);
};
export default ScreenSpaceCameraController;
