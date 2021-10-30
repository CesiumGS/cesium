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
var CameraFlightPath = {};

function getAltitude(frustum, dx, dy) {
  var near;
  var top;
  var right;
  if (frustum instanceof PerspectiveFrustum) {
    var tanTheta = Math.tan(0.5 * frustum.fovy);
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

var scratchCart = new Cartesian3();
var scratchCart2 = new Cartesian3();

function createPitchFunction(
  startPitch,
  endPitch,
  heightFunction,
  pitchAdjustHeight
) {
  if (defined(pitchAdjustHeight) && heightFunction(0.5) > pitchAdjustHeight) {
    var startHeight = heightFunction(0.0);
    var endHeight = heightFunction(1.0);
    var middleHeight = heightFunction(0.5);

    var d1 = middleHeight - startHeight;
    var d2 = middleHeight - endHeight;

    return function (time) {
      var altitude = heightFunction(time);
      if (time <= 0.5) {
        var t1 = (altitude - startHeight) / d1;
        return CesiumMath.lerp(startPitch, -CesiumMath.PI_OVER_TWO, t1);
      }

      var t2 = (altitude - endHeight) / d2;
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
  optionAltitude
) {
  var altitude = optionAltitude;
  var maxHeight = Math.max(startHeight, endHeight);

  if (!defined(altitude)) {
    var start = camera.position;
    var end = destination;
    var up = camera.up;
    var right = camera.right;
    var frustum = camera.frustum;

    var diff = Cartesian3.subtract(start, end, scratchCart);
    var verticalDistance = Cartesian3.magnitude(
      Cartesian3.multiplyByScalar(up, Cartesian3.dot(diff, up), scratchCart2)
    );
    var horizontalDistance = Cartesian3.magnitude(
      Cartesian3.multiplyByScalar(
        right,
        Cartesian3.dot(diff, right),
        scratchCart2
      )
    );

    altitude = Math.min(
      getAltitude(frustum, verticalDistance, horizontalDistance) * 0.2,
      1000000000.0
    );
  }

  if (maxHeight < altitude) {
    var power = 8.0;
    var factor = 1000000.0;

    var s = -Math.pow((altitude - startHeight) * factor, 1.0 / power);
    var e = Math.pow((altitude - endHeight) * factor, 1.0 / power);

    return function (t) {
      var x = t * (e - s) + s;
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
      CesiumMath.EPSILON11
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

var scratchStart = new Cartesian3();

function createUpdateCV(
  scene,
  duration,
  destination,
  heading,
  pitch,
  roll,
  optionAltitude,
  optionPitchAdjustHeight
) {
  var camera = scene.camera;

  var start = Cartesian3.clone(camera.position, scratchStart);
  var startPitch = camera.pitch;
  var startHeading = adjustAngleForLERP(camera.heading, heading);
  var startRoll = adjustAngleForLERP(camera.roll, roll);

  var heightFunction = createHeightFunction(
    camera,
    destination,
    start.z,
    destination.z,
    optionAltitude
  );

  var pitchFunction = createPitchFunction(
    startPitch,
    pitch,
    heightFunction,
    optionPitchAdjustHeight
  );

  function update(value) {
    var time = value.time / duration;

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
  var diff = startCart.longitude - destCart.longitude;
  if (diff < -CesiumMath.PI) {
    startCart.longitude += CesiumMath.TWO_PI;
  } else if (diff > CesiumMath.PI) {
    destCart.longitude += CesiumMath.TWO_PI;
  }
}

var scratchStartCart = new Cartographic();
var scratchEndCart = new Cartographic();

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
  optionPitchAdjustHeight
) {
  var camera = scene.camera;
  var projection = scene.mapProjection;
  var ellipsoid = projection.ellipsoid;

  var startCart = Cartographic.clone(
    camera.positionCartographic,
    scratchStartCart
  );
  var startPitch = camera.pitch;
  var startHeading = adjustAngleForLERP(camera.heading, heading);
  var startRoll = adjustAngleForLERP(camera.roll, roll);

  var destCart = ellipsoid.cartesianToCartographic(destination, scratchEndCart);
  startCart.longitude = CesiumMath.zeroToTwoPi(startCart.longitude);
  destCart.longitude = CesiumMath.zeroToTwoPi(destCart.longitude);

  var useLongFlight = false;

  if (defined(optionFlyOverLongitude)) {
    var hitLon = CesiumMath.zeroToTwoPi(optionFlyOverLongitude);

    var lonMin = Math.min(startCart.longitude, destCart.longitude);
    var lonMax = Math.max(startCart.longitude, destCart.longitude);

    var hitInside = hitLon >= lonMin && hitLon <= lonMax;

    if (defined(optionFlyOverLongitudeWeight)) {
      // Distance inside  (0...2Pi)
      var din = Math.abs(startCart.longitude - destCart.longitude);
      // Distance outside (0...2Pi)
      var dot = CesiumMath.TWO_PI - din;

      var hitDistance = hitInside ? din : dot;
      var offDistance = hitInside ? dot : din;

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

  var heightFunction = createHeightFunction(
    camera,
    destination,
    startCart.height,
    destCart.height,
    optionAltitude
  );
  var pitchFunction = createPitchFunction(
    startPitch,
    pitch,
    heightFunction,
    optionPitchAdjustHeight
  );

  // Isolate scope for update function.
  // to have local copies of vars used in lerp
  // Othervise, if you call nex
  // createUpdate3D (createAnimationTween)
  // before you played animation, variables will be overwriten.
  function isolateUpdateFunction() {
    var startLongitude = startCart.longitude;
    var destLongitude = destCart.longitude;
    var startLatitude = startCart.latitude;
    var destLatitude = destCart.latitude;

    return function update(value) {
      var time = value.time / duration;

      var position = Cartesian3.fromRadians(
        CesiumMath.lerp(startLongitude, destLongitude, time),
        CesiumMath.lerp(startLatitude, destLatitude, time),
        heightFunction(time),
        ellipsoid
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
  optionAltitude
) {
  var camera = scene.camera;

  var start = Cartesian3.clone(camera.position, scratchStart);
  var startHeading = adjustAngleForLERP(camera.heading, heading);

  var startHeight = camera.frustum.right - camera.frustum.left;
  var heightFunction = createHeightFunction(
    camera,
    destination,
    startHeight,
    destination.z,
    optionAltitude
  );

  function update(value) {
    var time = value.time / duration;

    camera.setView({
      orientation: {
        heading: CesiumMath.lerp(startHeading, heading, time),
      },
    });

    Cartesian2.lerp(start, destination, time, camera.position);

    var zoom = heightFunction(time);

    var frustum = camera.frustum;
    var ratio = frustum.top / frustum.right;

    var incrementAmount = (zoom - (frustum.right - frustum.left)) * 0.5;
    frustum.right += incrementAmount;
    frustum.left -= incrementAmount;
    frustum.top = ratio * frustum.right;
    frustum.bottom = -frustum.top;
  }
  return update;
}

var scratchCartographic = new Cartographic();
var scratchDestination = new Cartesian3();

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
  var destination = options.destination;

  //>>includeStart('debug', pragmas.debug);
  if (!defined(scene)) {
    throw new DeveloperError("scene is required.");
  }
  if (!defined(destination)) {
    throw new DeveloperError("destination is required.");
  }
  //>>includeEnd('debug');
  var mode = scene.mode;

  if (mode === SceneMode.MORPHING) {
    return emptyFlight();
  }

  var convert = defaultValue(options.convert, true);
  var projection = scene.mapProjection;
  var ellipsoid = projection.ellipsoid;
  var maximumHeight = options.maximumHeight;
  var flyOverLongitude = options.flyOverLongitude;
  var flyOverLongitudeWeight = options.flyOverLongitudeWeight;
  var pitchAdjustHeight = options.pitchAdjustHeight;
  var easingFunction = options.easingFunction;

  if (convert && mode !== SceneMode.SCENE3D) {
    ellipsoid.cartesianToCartographic(destination, scratchCartographic);
    destination = projection.project(scratchCartographic, scratchDestination);
  }

  var camera = scene.camera;
  var transform = options.endTransform;
  if (defined(transform)) {
    camera._setTransform(transform);
  }

  var duration = options.duration;
  if (!defined(duration)) {
    duration =
      Math.ceil(Cartesian3.distance(camera.position, destination) / 1000000.0) +
      2.0;
    duration = Math.min(duration, 3.0);
  }

  var heading = defaultValue(options.heading, 0.0);
  var pitch = defaultValue(options.pitch, -CesiumMath.PI_OVER_TWO);
  var roll = defaultValue(options.roll, 0.0);

  var controller = scene.screenSpaceCameraController;
  controller.enableInputs = false;

  var complete = wrapCallback(controller, options.complete);
  var cancel = wrapCallback(controller, options.cancel);

  var frustum = camera.frustum;

  var empty = scene.mode === SceneMode.SCENE2D;
  empty =
    empty &&
    Cartesian2.equalsEpsilon(camera.position, destination, CesiumMath.EPSILON6);
  empty =
    empty &&
    CesiumMath.equalsEpsilon(
      Math.max(frustum.right - frustum.left, frustum.top - frustum.bottom),
      destination.z,
      CesiumMath.EPSILON6
    );

  empty =
    empty ||
    (scene.mode !== SceneMode.SCENE2D &&
      Cartesian3.equalsEpsilon(
        destination,
        camera.position,
        CesiumMath.EPSILON10
      ));

  empty =
    empty &&
    CesiumMath.equalsEpsilon(
      CesiumMath.negativePiToPi(heading),
      CesiumMath.negativePiToPi(camera.heading),
      CesiumMath.EPSILON10
    ) &&
    CesiumMath.equalsEpsilon(
      CesiumMath.negativePiToPi(pitch),
      CesiumMath.negativePiToPi(camera.pitch),
      CesiumMath.EPSILON10
    ) &&
    CesiumMath.equalsEpsilon(
      CesiumMath.negativePiToPi(roll),
      CesiumMath.negativePiToPi(camera.roll),
      CesiumMath.EPSILON10
    );

  if (empty) {
    return emptyFlight(complete, cancel);
  }

  var updateFunctions = new Array(4);
  updateFunctions[SceneMode.SCENE2D] = createUpdate2D;
  updateFunctions[SceneMode.SCENE3D] = createUpdate3D;
  updateFunctions[SceneMode.COLUMBUS_VIEW] = createUpdateCV;

  if (duration <= 0.0) {
    var newOnComplete = function () {
      var update = updateFunctions[mode](
        scene,
        1.0,
        destination,
        heading,
        pitch,
        roll,
        maximumHeight,
        flyOverLongitude,
        flyOverLongitudeWeight,
        pitchAdjustHeight
      );
      update({ time: 1.0 });

      if (typeof complete === "function") {
        complete();
      }
    };
    return emptyFlight(newOnComplete, cancel);
  }

  var update = updateFunctions[mode](
    scene,
    duration,
    destination,
    heading,
    pitch,
    roll,
    maximumHeight,
    flyOverLongitude,
    flyOverLongitudeWeight,
    pitchAdjustHeight
  );

  if (!defined(easingFunction)) {
    var startHeight = camera.positionCartographic.height;
    var endHeight =
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
