import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartographic from "../Core/Cartographic.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import EasingFunction from "../Core/EasingFunction.js";
import CesiumMath from "../Core/Math.js";
import PerspectiveFrustum from "../Core/PerspectiveFrustum.js";
import PerspectiveOffCenterFrustum from "../Core/PerspectiveOffCenterFrustum.js";
import SceneMode from "./SceneMode.js";

/**
 * Creates tweens for camera flights.
 * <br /><br />
 * Mouse interaction is disabled during flights.
 *
 * @private
 */
const CameraFlightPath = {};

function getAltitude(frustum, dx, dy) {
  let near;
  let top;
  let right;
  if (frustum instanceof PerspectiveFrustum) {
    const tanTheta = Math.tan(0.5 * frustum.fovy);
    near = frustum.near;
    top = frustum.near * tanTheta;
    right = frustum.aspectRatio * top;
    return Math.max((dx * near) / right, (dy * near) / top);
  } else if (frustum instanceof PerspectiveOffCenterFrustum) {
    near = frustum.near;
    top = frustum.top;
    right = frustum.right;
    return Math.max((dx * near) / right, (dy * near) / top);
  }

  return Math.max(dx, dy);
}

const scratchCart = new Cartesian3();
const scratchCart2 = new Cartesian3();

function createPitchFunction(
  startPitch,
  endPitch,
  heightFunction,
  pitchAdjustHeight,
) {
  if (defined(pitchAdjustHeight) && heightFunction(0.5) > pitchAdjustHeight) {
    const startHeight = heightFunction(0.0);
    const endHeight = heightFunction(1.0);
    const middleHeight = heightFunction(0.5);

    const d1 = middleHeight - startHeight;
    const d2 = middleHeight - endHeight;

    return function (time) {
      const altitude = heightFunction(time);
      if (time <= 0.5) {
        const t1 = (altitude - startHeight) / d1;
        return CesiumMath.lerp(startPitch, -CesiumMath.PI_OVER_TWO, t1);
      }

      const t2 = (altitude - endHeight) / d2;
      return CesiumMath.lerp(-CesiumMath.PI_OVER_TWO, endPitch, 1 - t2);
    };
  }
  return function (time) {
    return CesiumMath.lerp(startPitch, endPitch, time);
  };
}

function createHeightFunction(
  camera,
  destination,
  startHeight,
  endHeight,
  optionAltitude,
) {
  let altitude = optionAltitude;
  const maxHeight = Math.max(startHeight, endHeight);

  if (!defined(altitude)) {
    const start = camera.position;
    const end = destination;
    const up = camera.up;
    const right = camera.right;
    const frustum = camera.frustum;

    const diff = Cartesian3.subtract(start, end, scratchCart);
    const verticalDistance = Cartesian3.magnitude(
      Cartesian3.multiplyByScalar(up, Cartesian3.dot(diff, up), scratchCart2),
    );
    const horizontalDistance = Cartesian3.magnitude(
      Cartesian3.multiplyByScalar(
        right,
        Cartesian3.dot(diff, right),
        scratchCart2,
      ),
    );

    altitude = Math.min(
      getAltitude(frustum, verticalDistance, horizontalDistance) * 0.2,
      1000000000.0,
    );
  }

  if (maxHeight < altitude) {
    const power = 8.0;
    const factor = 1000000.0;

    const s = -Math.pow((altitude - startHeight) * factor, 1.0 / power);
    const e = Math.pow((altitude - endHeight) * factor, 1.0 / power);

    return function (t) {
      const x = t * (e - s) + s;
      return -Math.pow(x, power) / factor + altitude;
    };
  }

  return function (t) {
    return CesiumMath.lerp(startHeight, endHeight, t);
  };
}

function adjustAngleForLERP(startAngle, endAngle) {
  if (
    CesiumMath.equalsEpsilon(
      startAngle,
      CesiumMath.TWO_PI,
      CesiumMath.EPSILON11,
    )
  ) {
    startAngle = 0.0;
  }

  if (endAngle > startAngle + Math.PI) {
    startAngle += CesiumMath.TWO_PI;
  } else if (endAngle < startAngle - Math.PI) {
    startAngle -= CesiumMath.TWO_PI;
  }

  return startAngle;
}

const scratchStart = new Cartesian3();

function createUpdateCV(
  scene,
  duration,
  destination,
  heading,
  pitch,
  roll,
  optionAltitude,
  optionPitchAdjustHeight,
) {
  const camera = scene.camera;

  const start = Cartesian3.clone(camera.position, scratchStart);
  const startPitch = camera.pitch;
  const startHeading = adjustAngleForLERP(camera.heading, heading);
  const startRoll = adjustAngleForLERP(camera.roll, roll);

  const heightFunction = createHeightFunction(
    camera,
    destination,
    start.z,
    destination.z,
    optionAltitude,
  );

  const pitchFunction = createPitchFunction(
    startPitch,
    pitch,
    heightFunction,
    optionPitchAdjustHeight,
  );

  function update(value) {
    const time = value.time / duration;

    camera.setView({
      orientation: {
        heading: CesiumMath.lerp(startHeading, heading, time),
        pitch: pitchFunction(time),
        roll: CesiumMath.lerp(startRoll, roll, time),
      },
    });

    Cartesian2.lerp(start, destination, time, camera.position);
    camera.position.z = heightFunction(time);
  }
  return update;
}

function useLongestFlight(startCart, destCart) {
  if (startCart.longitude < destCart.longitude) {
    startCart.longitude += CesiumMath.TWO_PI;
  } else {
    destCart.longitude += CesiumMath.TWO_PI;
  }
}

function useShortestFlight(startCart, destCart) {
  const diff = startCart.longitude - destCart.longitude;
  if (diff < -CesiumMath.PI) {
    startCart.longitude += CesiumMath.TWO_PI;
  } else if (diff > CesiumMath.PI) {
    destCart.longitude += CesiumMath.TWO_PI;
  }
}

const scratchStartCart = new Cartographic();
const scratchEndCart = new Cartographic();

function createUpdate3D(
  scene,
  duration,
  destination,
  heading,
  pitch,
  roll,
  optionAltitude,
  optionFlyOverLongitude,
  optionFlyOverLongitudeWeight,
  optionPitchAdjustHeight,
) {
  const camera = scene.camera;
  const projection = scene.mapProjection;
  const ellipsoid = projection.ellipsoid;

  const startCart = Cartographic.clone(
    camera.positionCartographic,
    scratchStartCart,
  );
  const startPitch = camera.pitch;
  const startHeading = adjustAngleForLERP(camera.heading, heading);
  const startRoll = adjustAngleForLERP(camera.roll, roll);

  const destCart = ellipsoid.cartesianToCartographic(
    destination,
    scratchEndCart,
  );
  startCart.longitude = CesiumMath.zeroToTwoPi(startCart.longitude);
  destCart.longitude = CesiumMath.zeroToTwoPi(destCart.longitude);

  let useLongFlight = false;

  if (defined(optionFlyOverLongitude)) {
    const hitLon = CesiumMath.zeroToTwoPi(optionFlyOverLongitude);

    const lonMin = Math.min(startCart.longitude, destCart.longitude);
    const lonMax = Math.max(startCart.longitude, destCart.longitude);

    const hitInside = hitLon >= lonMin && hitLon <= lonMax;

    if (defined(optionFlyOverLongitudeWeight)) {
      // Distance inside  (0...2Pi)
      const din = Math.abs(startCart.longitude - destCart.longitude);
      // Distance outside (0...2Pi)
      const dot = CesiumMath.TWO_PI - din;

      const hitDistance = hitInside ? din : dot;
      const offDistance = hitInside ? dot : din;

      if (
        hitDistance < offDistance * optionFlyOverLongitudeWeight &&
        !hitInside
      ) {
        useLongFlight = true;
      }
    } else if (!hitInside) {
      useLongFlight = true;
    }
  }

  if (useLongFlight) {
    useLongestFlight(startCart, destCart);
  } else {
    useShortestFlight(startCart, destCart);
  }

  const heightFunction = createHeightFunction(
    camera,
    destination,
    startCart.height,
    destCart.height,
    optionAltitude,
  );
  const pitchFunction = createPitchFunction(
    startPitch,
    pitch,
    heightFunction,
    optionPitchAdjustHeight,
  );

  // Isolate scope for update function.
  // to have local copies of vars used in lerp
  // Othervise, if you call nex
  // createUpdate3D (createAnimationTween)
  // before you played animation, variables will be overwriten.
  function isolateUpdateFunction() {
    const startLongitude = startCart.longitude;
    const destLongitude = destCart.longitude;
    const startLatitude = startCart.latitude;
    const destLatitude = destCart.latitude;

    return function update(value) {
      const time = value.time / duration;

      const position = Cartesian3.fromRadians(
        CesiumMath.lerp(startLongitude, destLongitude, time),
        CesiumMath.lerp(startLatitude, destLatitude, time),
        heightFunction(time),
        ellipsoid,
      );

      camera.setView({
        destination: position,
        orientation: {
          heading: CesiumMath.lerp(startHeading, heading, time),
          pitch: pitchFunction(time),
          roll: CesiumMath.lerp(startRoll, roll, time),
        },
      });
    };
  }
  return isolateUpdateFunction();
}

function createUpdate2D(
  scene,
  duration,
  destination,
  heading,
  pitch,
  roll,
  optionAltitude,
) {
  const camera = scene.camera;

  const start = Cartesian3.clone(camera.position, scratchStart);
  const startHeading = adjustAngleForLERP(camera.heading, heading);

  const startHeight = camera.frustum.right - camera.frustum.left;
  const heightFunction = createHeightFunction(
    camera,
    destination,
    startHeight,
    destination.z,
    optionAltitude,
  );

  function update(value) {
    const time = value.time / duration;

    camera.setView({
      orientation: {
        heading: CesiumMath.lerp(startHeading, heading, time),
      },
    });

    Cartesian2.lerp(start, destination, time, camera.position);

    const zoom = heightFunction(time);

    const frustum = camera.frustum;
    const ratio = frustum.top / frustum.right;

    const incrementAmount = (zoom - (frustum.right - frustum.left)) * 0.5;
    frustum.right += incrementAmount;
    frustum.left -= incrementAmount;
    frustum.top = ratio * frustum.right;
    frustum.bottom = -frustum.top;
  }
  return update;
}

const scratchCartographic = new Cartographic();
const scratchDestination = new Cartesian3();

function emptyFlight(complete, cancel) {
  return {
    startObject: {},
    stopObject: {},
    duration: 0.0,
    complete: complete,
    cancel: cancel,
  };
}

function wrapCallback(controller, cb) {
  function wrapped() {
    if (typeof cb === "function") {
      cb();
    }

    controller.enableInputs = true;
  }
  return wrapped;
}

CameraFlightPath.createTween = function (scene, options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  let destination = options.destination;

  //>>includeStart('debug', pragmas.debug);
  if (!defined(scene)) {
    throw new DeveloperError("scene is required.");
  }
  if (!defined(destination)) {
    throw new DeveloperError("destination is required.");
  }
  //>>includeEnd('debug');
  const mode = scene.mode;

  if (mode === SceneMode.MORPHING) {
    return emptyFlight();
  }

  const convert = defaultValue(options.convert, true);
  const projection = scene.mapProjection;
  const ellipsoid = projection.ellipsoid;
  const maximumHeight = options.maximumHeight;
  const flyOverLongitude = options.flyOverLongitude;
  const flyOverLongitudeWeight = options.flyOverLongitudeWeight;
  const pitchAdjustHeight = options.pitchAdjustHeight;
  let easingFunction = options.easingFunction;

  if (convert && mode !== SceneMode.SCENE3D) {
    ellipsoid.cartesianToCartographic(destination, scratchCartographic);
    destination = projection.project(scratchCartographic, scratchDestination);
  }

  const camera = scene.camera;
  const transform = options.endTransform;
  if (defined(transform)) {
    camera._setTransform(transform);
  }

  let duration = options.duration;
  if (!defined(duration)) {
    duration =
      Math.ceil(Cartesian3.distance(camera.position, destination) / 1000000.0) +
      2.0;
    duration = Math.min(duration, 3.0);
  }

  const heading = defaultValue(options.heading, 0.0);
  const pitch = defaultValue(options.pitch, -CesiumMath.PI_OVER_TWO);
  const roll = defaultValue(options.roll, 0.0);

  const controller = scene.screenSpaceCameraController;
  controller.enableInputs = false;

  const complete = wrapCallback(controller, options.complete);
  const cancel = wrapCallback(controller, options.cancel);

  const frustum = camera.frustum;

  let empty = scene.mode === SceneMode.SCENE2D;
  empty =
    empty &&
    Cartesian2.equalsEpsilon(camera.position, destination, CesiumMath.EPSILON6);
  empty =
    empty &&
    CesiumMath.equalsEpsilon(
      Math.max(frustum.right - frustum.left, frustum.top - frustum.bottom),
      destination.z,
      CesiumMath.EPSILON6,
    );

  empty =
    empty ||
    (scene.mode !== SceneMode.SCENE2D &&
      Cartesian3.equalsEpsilon(
        destination,
        camera.position,
        CesiumMath.EPSILON10,
      ));

  empty =
    empty &&
    CesiumMath.equalsEpsilon(
      CesiumMath.negativePiToPi(heading),
      CesiumMath.negativePiToPi(camera.heading),
      CesiumMath.EPSILON10,
    ) &&
    CesiumMath.equalsEpsilon(
      CesiumMath.negativePiToPi(pitch),
      CesiumMath.negativePiToPi(camera.pitch),
      CesiumMath.EPSILON10,
    ) &&
    CesiumMath.equalsEpsilon(
      CesiumMath.negativePiToPi(roll),
      CesiumMath.negativePiToPi(camera.roll),
      CesiumMath.EPSILON10,
    );

  if (empty) {
    return emptyFlight(complete, cancel);
  }

  const updateFunctions = new Array(4);
  updateFunctions[SceneMode.SCENE2D] = createUpdate2D;
  updateFunctions[SceneMode.SCENE3D] = createUpdate3D;
  updateFunctions[SceneMode.COLUMBUS_VIEW] = createUpdateCV;

  if (duration <= 0.0) {
    const newOnComplete = function () {
      const update = updateFunctions[mode](
        scene,
        1.0,
        destination,
        heading,
        pitch,
        roll,
        maximumHeight,
        flyOverLongitude,
        flyOverLongitudeWeight,
        pitchAdjustHeight,
      );
      update({ time: 1.0 });

      if (typeof complete === "function") {
        complete();
      }
    };
    return emptyFlight(newOnComplete, cancel);
  }

  const update = updateFunctions[mode](
    scene,
    duration,
    destination,
    heading,
    pitch,
    roll,
    maximumHeight,
    flyOverLongitude,
    flyOverLongitudeWeight,
    pitchAdjustHeight,
  );

  if (!defined(easingFunction)) {
    const startHeight = camera.positionCartographic.height;
    const endHeight =
      mode === SceneMode.SCENE3D
        ? ellipsoid.cartesianToCartographic(destination).height
        : destination.z;

    if (startHeight > endHeight && startHeight > 11500.0) {
      easingFunction = EasingFunction.CUBIC_OUT;
    } else {
      easingFunction = EasingFunction.QUINTIC_IN_OUT;
    }
  }

  return {
    duration: duration,
    easingFunction: easingFunction,
    startObject: {
      time: 0.0,
    },
    stopObject: {
      time: duration,
    },
    update: update,
    complete: complete,
    cancel: cancel,
  };
};
export default CameraFlightPath;
