import BoundingSphere from "../Core/BoundingSphere.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import Cartographic from "../Core/Cartographic.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import EasingFunction from "../Core/EasingFunction.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import EllipsoidGeodesic from "../Core/EllipsoidGeodesic.js";
import Event from "../Core/Event.js";
import getTimestamp from "../Core/getTimestamp.js";
import HeadingPitchRange from "../Core/HeadingPitchRange.js";
import HeadingPitchRoll from "../Core/HeadingPitchRoll.js";
import Intersect from "../Core/Intersect.js";
import IntersectionTests from "../Core/IntersectionTests.js";
import CesiumMath from "../Core/Math.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";
import OrthographicFrustum from "../Core/OrthographicFrustum.js";
import OrthographicOffCenterFrustum from "../Core/OrthographicOffCenterFrustum.js";
import PerspectiveFrustum from "../Core/PerspectiveFrustum.js";
import Quaternion from "../Core/Quaternion.js";
import Ray from "../Core/Ray.js";
import Rectangle from "../Core/Rectangle.js";
import Transforms from "../Core/Transforms.js";
import CameraFlightPath from "./CameraFlightPath.js";
import MapMode2D from "./MapMode2D.js";
import SceneMode from "./SceneMode.js";

/**
 * The camera is defined by a position, orientation, and view frustum.
 * <br /><br />
 * The orientation forms an orthonormal basis with a view, up and right = view x up unit vectors.
 * <br /><br />
 * The viewing frustum is defined by 6 planes.
 * Each plane is represented by a {@link Cartesian4} object, where the x, y, and z components
 * define the unit vector normal to the plane, and the w component is the distance of the
 * plane from the origin/camera position.
 *
 * @alias Camera
 *
 * @constructor
 *
 * @param {Scene} scene The scene.
 *
 * @demo {@link https://sandcastle.cesium.com/index.html?src=Camera.html|Cesium Sandcastle Camera Demo}
 * @demo {@link https://sandcastle.cesium.com/index.html?src=Camera%20Tutorial.html|Cesium Sandcastle Camera Tutorial Example}
 * @demo {@link https://cesium.com/learn/cesiumjs-learn/cesiumjs-camera|Camera Tutorial}
 *
 * @example
 * // Create a camera looking down the negative z-axis, positioned at the origin,
 * // with a field of view of 60 degrees, and 1:1 aspect ratio.
 * var camera = new Cesium.Camera(scene);
 * camera.position = new Cesium.Cartesian3();
 * camera.direction = Cesium.Cartesian3.negate(Cesium.Cartesian3.UNIT_Z, new Cesium.Cartesian3());
 * camera.up = Cesium.Cartesian3.clone(Cesium.Cartesian3.UNIT_Y);
 * camera.frustum.fov = Cesium.Math.PI_OVER_THREE;
 * camera.frustum.near = 1.0;
 * camera.frustum.far = 2.0;
 */
function Camera(scene) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(scene)) {
    throw new DeveloperError("scene is required.");
  }
  //>>includeEnd('debug');
  this._scene = scene;

  this._transform = Matrix4.clone(Matrix4.IDENTITY);
  this._invTransform = Matrix4.clone(Matrix4.IDENTITY);
  this._actualTransform = Matrix4.clone(Matrix4.IDENTITY);
  this._actualInvTransform = Matrix4.clone(Matrix4.IDENTITY);
  this._transformChanged = false;

  /**
   * The position of the camera.
   *
   * @type {Cartesian3}
   */
  this.position = new Cartesian3();
  this._position = new Cartesian3();
  this._positionWC = new Cartesian3();
  this._positionCartographic = new Cartographic();
  this._oldPositionWC = undefined;

  /**
   * The position delta magnitude.
   *
   * @private
   */
  this.positionWCDeltaMagnitude = 0.0;

  /**
   * The position delta magnitude last frame.
   *
   * @private
   */
  this.positionWCDeltaMagnitudeLastFrame = 0.0;

  /**
   * How long in seconds since the camera has stopped moving
   *
   * @private
   */
  this.timeSinceMoved = 0.0;
  this._lastMovedTimestamp = 0.0;

  /**
   * The view direction of the camera.
   *
   * @type {Cartesian3}
   */
  this.direction = new Cartesian3();
  this._direction = new Cartesian3();
  this._directionWC = new Cartesian3();

  /**
   * The up direction of the camera.
   *
   * @type {Cartesian3}
   */
  this.up = new Cartesian3();
  this._up = new Cartesian3();
  this._upWC = new Cartesian3();

  /**
   * The right direction of the camera.
   *
   * @type {Cartesian3}
   */
  this.right = new Cartesian3();
  this._right = new Cartesian3();
  this._rightWC = new Cartesian3();

  /**
   * The region of space in view.
   *
   * @type {PerspectiveFrustum|PerspectiveOffCenterFrustum|OrthographicFrustum}
   * @default PerspectiveFrustum()
   *
   * @see PerspectiveFrustum
   * @see PerspectiveOffCenterFrustum
   * @see OrthographicFrustum
   */
  this.frustum = new PerspectiveFrustum();
  this.frustum.aspectRatio =
    scene.drawingBufferWidth / scene.drawingBufferHeight;
  this.frustum.fov = CesiumMath.toRadians(60.0);

  /**
   * The default amount to move the camera when an argument is not
   * provided to the move methods.
   * @type {Number}
   * @default 100000.0;
   */
  this.defaultMoveAmount = 100000.0;
  /**
   * The default amount to rotate the camera when an argument is not
   * provided to the look methods.
   * @type {Number}
   * @default Math.PI / 60.0
   */
  this.defaultLookAmount = Math.PI / 60.0;
  /**
   * The default amount to rotate the camera when an argument is not
   * provided to the rotate methods.
   * @type {Number}
   * @default Math.PI / 3600.0
   */
  this.defaultRotateAmount = Math.PI / 3600.0;
  /**
   * The default amount to move the camera when an argument is not
   * provided to the zoom methods.
   * @type {Number}
   * @default 100000.0;
   */
  this.defaultZoomAmount = 100000.0;
  /**
   * If set, the camera will not be able to rotate past this axis in either direction.
   * @type {Cartesian3}
   * @default undefined
   */
  this.constrainedAxis = undefined;
  /**
   * The factor multiplied by the the map size used to determine where to clamp the camera position
   * when zooming out from the surface. The default is 1.5. Only valid for 2D and the map is rotatable.
   * @type {Number}
   * @default 1.5
   */
  this.maximumZoomFactor = 1.5;

  this._moveStart = new Event();
  this._moveEnd = new Event();

  this._changed = new Event();
  this._changedPosition = undefined;
  this._changedDirection = undefined;
  this._changedFrustum = undefined;
  this._changedHeading = undefined;

  /**
   * The amount the camera has to change before the <code>changed</code> event is raised. The value is a percentage in the [0, 1] range.
   * @type {number}
   * @default 0.5
   */
  this.percentageChanged = 0.5;

  this._viewMatrix = new Matrix4();
  this._invViewMatrix = new Matrix4();
  updateViewMatrix(this);

  this._mode = SceneMode.SCENE3D;
  this._modeChanged = true;
  var projection = scene.mapProjection;
  this._projection = projection;
  this._maxCoord = projection.project(
    new Cartographic(Math.PI, CesiumMath.PI_OVER_TWO)
  );
  this._max2Dfrustum = undefined;

  // set default view
  rectangleCameraPosition3D(
    this,
    Camera.DEFAULT_VIEW_RECTANGLE,
    this.position,
    true
  );

  var mag = Cartesian3.magnitude(this.position);
  mag += mag * Camera.DEFAULT_VIEW_FACTOR;
  Cartesian3.normalize(this.position, this.position);
  Cartesian3.multiplyByScalar(this.position, mag, this.position);
}

/**
 * @private
 */
Camera.TRANSFORM_2D = new Matrix4(
  0.0,
  0.0,
  1.0,
  0.0,
  1.0,
  0.0,
  0.0,
  0.0,
  0.0,
  1.0,
  0.0,
  0.0,
  0.0,
  0.0,
  0.0,
  1.0
);

/**
 * @private
 */
Camera.TRANSFORM_2D_INVERSE = Matrix4.inverseTransformation(
  Camera.TRANSFORM_2D,
  new Matrix4()
);

/**
 * The default rectangle the camera will view on creation.
 * @type Rectangle
 */
Camera.DEFAULT_VIEW_RECTANGLE = Rectangle.fromDegrees(
  -95.0,
  -20.0,
  -70.0,
  90.0
);

/**
 * A scalar to multiply to the camera position and add it back after setting the camera to view the rectangle.
 * A value of zero means the camera will view the entire {@link Camera#DEFAULT_VIEW_RECTANGLE}, a value greater than zero
 * will move it further away from the extent, and a value less than zero will move it close to the extent.
 * @type Number
 */
Camera.DEFAULT_VIEW_FACTOR = 0.5;

/**
 * The default heading/pitch/range that is used when the camera flies to a location that contains a bounding sphere.
 * @type HeadingPitchRange
 */
Camera.DEFAULT_OFFSET = new HeadingPitchRange(
  0.0,
  -CesiumMath.PI_OVER_FOUR,
  0.0
);

function updateViewMatrix(camera) {
  Matrix4.computeView(
    camera._position,
    camera._direction,
    camera._up,
    camera._right,
    camera._viewMatrix
  );
  Matrix4.multiply(
    camera._viewMatrix,
    camera._actualInvTransform,
    camera._viewMatrix
  );
  Matrix4.inverseTransformation(camera._viewMatrix, camera._invViewMatrix);
}

function updateCameraDeltas(camera) {
  if (!defined(camera._oldPositionWC)) {
    camera._oldPositionWC = Cartesian3.clone(
      camera.positionWC,
      camera._oldPositionWC
    );
  } else {
    camera.positionWCDeltaMagnitudeLastFrame = camera.positionWCDeltaMagnitude;
    var delta = Cartesian3.subtract(
      camera.positionWC,
      camera._oldPositionWC,
      camera._oldPositionWC
    );
    camera.positionWCDeltaMagnitude = Cartesian3.magnitude(delta);
    camera._oldPositionWC = Cartesian3.clone(
      camera.positionWC,
      camera._oldPositionWC
    );

    // Update move timers
    if (camera.positionWCDeltaMagnitude > 0.0) {
      camera.timeSinceMoved = 0.0;
      camera._lastMovedTimestamp = getTimestamp();
    } else {
      camera.timeSinceMoved =
        Math.max(getTimestamp() - camera._lastMovedTimestamp, 0.0) / 1000.0;
    }
  }
}

/**
 * Checks if there's a camera flight with preload for this camera.
 *
 * @returns {Boolean} Whether or not this camera has a current flight with a valid preloadFlightCamera in scene.
 *
 * @private
 *
 */
Camera.prototype.canPreloadFlight = function () {
  return defined(this._currentFlight) && this._mode !== SceneMode.SCENE2D;
};

Camera.prototype._updateCameraChanged = function () {
  var camera = this;

  updateCameraDeltas(camera);

  if (camera._changed.numberOfListeners === 0) {
    return;
  }

  var percentageChanged = camera.percentageChanged;

  var currentHeading = camera.heading;

  if (!defined(camera._changedHeading)) {
    camera._changedHeading = currentHeading;
  }

  var delta =
    Math.abs(camera._changedHeading - currentHeading) % CesiumMath.TWO_PI;
  delta = delta > CesiumMath.PI ? CesiumMath.TWO_PI - delta : delta;

  // Since delta is computed as the shortest distance between two angles
  // the percentage is relative to the half circle.
  var headingChangedPercentage = delta / Math.PI;

  if (headingChangedPercentage > percentageChanged) {
    camera._changed.raiseEvent(headingChangedPercentage);
    camera._changedHeading = currentHeading;
  }

  if (camera._mode === SceneMode.SCENE2D) {
    if (!defined(camera._changedFrustum)) {
      camera._changedPosition = Cartesian3.clone(
        camera.position,
        camera._changedPosition
      );
      camera._changedFrustum = camera.frustum.clone();
      return;
    }

    var position = camera.position;
    var lastPosition = camera._changedPosition;

    var frustum = camera.frustum;
    var lastFrustum = camera._changedFrustum;

    var x0 = position.x + frustum.left;
    var x1 = position.x + frustum.right;
    var x2 = lastPosition.x + lastFrustum.left;
    var x3 = lastPosition.x + lastFrustum.right;

    var y0 = position.y + frustum.bottom;
    var y1 = position.y + frustum.top;
    var y2 = lastPosition.y + lastFrustum.bottom;
    var y3 = lastPosition.y + lastFrustum.top;

    var leftX = Math.max(x0, x2);
    var rightX = Math.min(x1, x3);
    var bottomY = Math.max(y0, y2);
    var topY = Math.min(y1, y3);

    var areaPercentage;
    if (leftX >= rightX || bottomY >= y1) {
      areaPercentage = 1.0;
    } else {
      var areaRef = lastFrustum;
      if (x0 < x2 && x1 > x3 && y0 < y2 && y1 > y3) {
        areaRef = frustum;
      }
      areaPercentage =
        1.0 -
        ((rightX - leftX) * (topY - bottomY)) /
          ((areaRef.right - areaRef.left) * (areaRef.top - areaRef.bottom));
    }

    if (areaPercentage > percentageChanged) {
      camera._changed.raiseEvent(areaPercentage);
      camera._changedPosition = Cartesian3.clone(
        camera.position,
        camera._changedPosition
      );
      camera._changedFrustum = camera.frustum.clone(camera._changedFrustum);
    }
    return;
  }

  if (!defined(camera._changedDirection)) {
    camera._changedPosition = Cartesian3.clone(
      camera.positionWC,
      camera._changedPosition
    );
    camera._changedDirection = Cartesian3.clone(
      camera.directionWC,
      camera._changedDirection
    );
    return;
  }

  var dirAngle = CesiumMath.acosClamped(
    Cartesian3.dot(camera.directionWC, camera._changedDirection)
  );

  var dirPercentage;
  if (defined(camera.frustum.fovy)) {
    dirPercentage = dirAngle / (camera.frustum.fovy * 0.5);
  } else {
    dirPercentage = dirAngle;
  }

  var distance = Cartesian3.distance(
    camera.positionWC,
    camera._changedPosition
  );
  var heightPercentage = distance / camera.positionCartographic.height;

  if (
    dirPercentage > percentageChanged ||
    heightPercentage > percentageChanged
  ) {
    camera._changed.raiseEvent(Math.max(dirPercentage, heightPercentage));
    camera._changedPosition = Cartesian3.clone(
      camera.positionWC,
      camera._changedPosition
    );
    camera._changedDirection = Cartesian3.clone(
      camera.directionWC,
      camera._changedDirection
    );
  }
};

function convertTransformForColumbusView(camera) {
  Transforms.basisTo2D(
    camera._projection,
    camera._transform,
    camera._actualTransform
  );
}

var scratchCartographic = new Cartographic();
var scratchCartesian3Projection = new Cartesian3();
var scratchCartesian3 = new Cartesian3();
var scratchCartesian4Origin = new Cartesian4();
var scratchCartesian4NewOrigin = new Cartesian4();
var scratchCartesian4NewXAxis = new Cartesian4();
var scratchCartesian4NewYAxis = new Cartesian4();
var scratchCartesian4NewZAxis = new Cartesian4();

function convertTransformFor2D(camera) {
  var projection = camera._projection;
  var ellipsoid = projection.ellipsoid;

  var origin = Matrix4.getColumn(camera._transform, 3, scratchCartesian4Origin);
  var cartographic = ellipsoid.cartesianToCartographic(
    origin,
    scratchCartographic
  );

  var projectedPosition = projection.project(
    cartographic,
    scratchCartesian3Projection
  );
  var newOrigin = scratchCartesian4NewOrigin;
  newOrigin.x = projectedPosition.z;
  newOrigin.y = projectedPosition.x;
  newOrigin.z = projectedPosition.y;
  newOrigin.w = 1.0;

  var newZAxis = Cartesian4.clone(Cartesian4.UNIT_X, scratchCartesian4NewZAxis);

  var xAxis = Cartesian4.add(
    Matrix4.getColumn(camera._transform, 0, scratchCartesian3),
    origin,
    scratchCartesian3
  );
  ellipsoid.cartesianToCartographic(xAxis, cartographic);

  projection.project(cartographic, projectedPosition);
  var newXAxis = scratchCartesian4NewXAxis;
  newXAxis.x = projectedPosition.z;
  newXAxis.y = projectedPosition.x;
  newXAxis.z = projectedPosition.y;
  newXAxis.w = 0.0;

  Cartesian3.subtract(newXAxis, newOrigin, newXAxis);
  newXAxis.x = 0.0;

  var newYAxis = scratchCartesian4NewYAxis;
  if (Cartesian3.magnitudeSquared(newXAxis) > CesiumMath.EPSILON10) {
    Cartesian3.cross(newZAxis, newXAxis, newYAxis);
  } else {
    var yAxis = Cartesian4.add(
      Matrix4.getColumn(camera._transform, 1, scratchCartesian3),
      origin,
      scratchCartesian3
    );
    ellipsoid.cartesianToCartographic(yAxis, cartographic);

    projection.project(cartographic, projectedPosition);
    newYAxis.x = projectedPosition.z;
    newYAxis.y = projectedPosition.x;
    newYAxis.z = projectedPosition.y;
    newYAxis.w = 0.0;

    Cartesian3.subtract(newYAxis, newOrigin, newYAxis);
    newYAxis.x = 0.0;

    if (Cartesian3.magnitudeSquared(newYAxis) < CesiumMath.EPSILON10) {
      Cartesian4.clone(Cartesian4.UNIT_Y, newXAxis);
      Cartesian4.clone(Cartesian4.UNIT_Z, newYAxis);
    }
  }

  Cartesian3.cross(newYAxis, newZAxis, newXAxis);
  Cartesian3.normalize(newXAxis, newXAxis);
  Cartesian3.cross(newZAxis, newXAxis, newYAxis);
  Cartesian3.normalize(newYAxis, newYAxis);

  Matrix4.setColumn(
    camera._actualTransform,
    0,
    newXAxis,
    camera._actualTransform
  );
  Matrix4.setColumn(
    camera._actualTransform,
    1,
    newYAxis,
    camera._actualTransform
  );
  Matrix4.setColumn(
    camera._actualTransform,
    2,
    newZAxis,
    camera._actualTransform
  );
  Matrix4.setColumn(
    camera._actualTransform,
    3,
    newOrigin,
    camera._actualTransform
  );
}

var scratchCartesian = new Cartesian3();

function updateMembers(camera) {
  var mode = camera._mode;

  var heightChanged = false;
  var height = 0.0;
  if (mode === SceneMode.SCENE2D) {
    height = camera.frustum.right - camera.frustum.left;
    heightChanged = height !== camera._positionCartographic.height;
  }

  var position = camera._position;
  var positionChanged =
    !Cartesian3.equals(position, camera.position) || heightChanged;
  if (positionChanged) {
    position = Cartesian3.clone(camera.position, camera._position);
  }

  var direction = camera._direction;
  var directionChanged = !Cartesian3.equals(direction, camera.direction);
  if (directionChanged) {
    Cartesian3.normalize(camera.direction, camera.direction);
    direction = Cartesian3.clone(camera.direction, camera._direction);
  }

  var up = camera._up;
  var upChanged = !Cartesian3.equals(up, camera.up);
  if (upChanged) {
    Cartesian3.normalize(camera.up, camera.up);
    up = Cartesian3.clone(camera.up, camera._up);
  }

  var right = camera._right;
  var rightChanged = !Cartesian3.equals(right, camera.right);
  if (rightChanged) {
    Cartesian3.normalize(camera.right, camera.right);
    right = Cartesian3.clone(camera.right, camera._right);
  }

  var transformChanged = camera._transformChanged || camera._modeChanged;
  camera._transformChanged = false;

  if (transformChanged) {
    Matrix4.inverseTransformation(camera._transform, camera._invTransform);

    if (
      camera._mode === SceneMode.COLUMBUS_VIEW ||
      camera._mode === SceneMode.SCENE2D
    ) {
      if (Matrix4.equals(Matrix4.IDENTITY, camera._transform)) {
        Matrix4.clone(Camera.TRANSFORM_2D, camera._actualTransform);
      } else if (camera._mode === SceneMode.COLUMBUS_VIEW) {
        convertTransformForColumbusView(camera);
      } else {
        convertTransformFor2D(camera);
      }
    } else {
      Matrix4.clone(camera._transform, camera._actualTransform);
    }

    Matrix4.inverseTransformation(
      camera._actualTransform,
      camera._actualInvTransform
    );

    camera._modeChanged = false;
  }

  var transform = camera._actualTransform;

  if (positionChanged || transformChanged) {
    camera._positionWC = Matrix4.multiplyByPoint(
      transform,
      position,
      camera._positionWC
    );

    // Compute the Cartographic position of the camera.
    if (mode === SceneMode.SCENE3D || mode === SceneMode.MORPHING) {
      camera._positionCartographic = camera._projection.ellipsoid.cartesianToCartographic(
        camera._positionWC,
        camera._positionCartographic
      );
    } else {
      // The camera position is expressed in the 2D coordinate system where the Y axis is to the East,
      // the Z axis is to the North, and the X axis is out of the map.  Express them instead in the ENU axes where
      // X is to the East, Y is to the North, and Z is out of the local horizontal plane.
      var positionENU = scratchCartesian;
      positionENU.x = camera._positionWC.y;
      positionENU.y = camera._positionWC.z;
      positionENU.z = camera._positionWC.x;

      // In 2D, the camera height is always 12.7 million meters.
      // The apparent height is equal to half the frustum width.
      if (mode === SceneMode.SCENE2D) {
        positionENU.z = height;
      }

      camera._projection.unproject(positionENU, camera._positionCartographic);
    }
  }

  if (directionChanged || upChanged || rightChanged) {
    var det = Cartesian3.dot(
      direction,
      Cartesian3.cross(up, right, scratchCartesian)
    );
    if (Math.abs(1.0 - det) > CesiumMath.EPSILON2) {
      //orthonormalize axes
      var invUpMag = 1.0 / Cartesian3.magnitudeSquared(up);
      var scalar = Cartesian3.dot(up, direction) * invUpMag;
      var w0 = Cartesian3.multiplyByScalar(direction, scalar, scratchCartesian);
      up = Cartesian3.normalize(
        Cartesian3.subtract(up, w0, camera._up),
        camera._up
      );
      Cartesian3.clone(up, camera.up);

      right = Cartesian3.cross(direction, up, camera._right);
      Cartesian3.clone(right, camera.right);
    }
  }

  if (directionChanged || transformChanged) {
    camera._directionWC = Matrix4.multiplyByPointAsVector(
      transform,
      direction,
      camera._directionWC
    );
    Cartesian3.normalize(camera._directionWC, camera._directionWC);
  }

  if (upChanged || transformChanged) {
    camera._upWC = Matrix4.multiplyByPointAsVector(transform, up, camera._upWC);
    Cartesian3.normalize(camera._upWC, camera._upWC);
  }

  if (rightChanged || transformChanged) {
    camera._rightWC = Matrix4.multiplyByPointAsVector(
      transform,
      right,
      camera._rightWC
    );
    Cartesian3.normalize(camera._rightWC, camera._rightWC);
  }

  if (
    positionChanged ||
    directionChanged ||
    upChanged ||
    rightChanged ||
    transformChanged
  ) {
    updateViewMatrix(camera);
  }
}

function getHeading(direction, up) {
  var heading;
  if (
    !CesiumMath.equalsEpsilon(Math.abs(direction.z), 1.0, CesiumMath.EPSILON3)
  ) {
    heading = Math.atan2(direction.y, direction.x) - CesiumMath.PI_OVER_TWO;
  } else {
    heading = Math.atan2(up.y, up.x) - CesiumMath.PI_OVER_TWO;
  }

  return CesiumMath.TWO_PI - CesiumMath.zeroToTwoPi(heading);
}

function getPitch(direction) {
  return CesiumMath.PI_OVER_TWO - CesiumMath.acosClamped(direction.z);
}

function getRoll(direction, up, right) {
  var roll = 0.0;
  if (
    !CesiumMath.equalsEpsilon(Math.abs(direction.z), 1.0, CesiumMath.EPSILON3)
  ) {
    roll = Math.atan2(-right.z, up.z);
    roll = CesiumMath.zeroToTwoPi(roll + CesiumMath.TWO_PI);
  }

  return roll;
}

var scratchHPRMatrix1 = new Matrix4();
var scratchHPRMatrix2 = new Matrix4();

Object.defineProperties(Camera.prototype, {
  /**
   * Gets the camera's reference frame. The inverse of this transformation is appended to the view matrix.
   * @memberof Camera.prototype
   *
   * @type {Matrix4}
   * @readonly
   *
   * @default {@link Matrix4.IDENTITY}
   */
  transform: {
    get: function () {
      return this._transform;
    },
  },

  /**
   * Gets the inverse camera transform.
   * @memberof Camera.prototype
   *
   * @type {Matrix4}
   * @readonly
   *
   * @default {@link Matrix4.IDENTITY}
   */
  inverseTransform: {
    get: function () {
      updateMembers(this);
      return this._invTransform;
    },
  },

  /**
   * Gets the view matrix.
   * @memberof Camera.prototype
   *
   * @type {Matrix4}
   * @readonly
   *
   * @see Camera#inverseViewMatrix
   */
  viewMatrix: {
    get: function () {
      updateMembers(this);
      return this._viewMatrix;
    },
  },

  /**
   * Gets the inverse view matrix.
   * @memberof Camera.prototype
   *
   * @type {Matrix4}
   * @readonly
   *
   * @see Camera#viewMatrix
   */
  inverseViewMatrix: {
    get: function () {
      updateMembers(this);
      return this._invViewMatrix;
    },
  },

  /**
   * Gets the {@link Cartographic} position of the camera, with longitude and latitude
   * expressed in radians and height in meters.  In 2D and Columbus View, it is possible
   * for the returned longitude and latitude to be outside the range of valid longitudes
   * and latitudes when the camera is outside the map.
   * @memberof Camera.prototype
   *
   * @type {Cartographic}
   * @readonly
   */
  positionCartographic: {
    get: function () {
      updateMembers(this);
      return this._positionCartographic;
    },
  },

  /**
   * Gets the position of the camera in world coordinates.
   * @memberof Camera.prototype
   *
   * @type {Cartesian3}
   * @readonly
   */
  positionWC: {
    get: function () {
      updateMembers(this);
      return this._positionWC;
    },
  },

  /**
   * Gets the view direction of the camera in world coordinates.
   * @memberof Camera.prototype
   *
   * @type {Cartesian3}
   * @readonly
   */
  directionWC: {
    get: function () {
      updateMembers(this);
      return this._directionWC;
    },
  },

  /**
   * Gets the up direction of the camera in world coordinates.
   * @memberof Camera.prototype
   *
   * @type {Cartesian3}
   * @readonly
   */
  upWC: {
    get: function () {
      updateMembers(this);
      return this._upWC;
    },
  },

  /**
   * Gets the right direction of the camera in world coordinates.
   * @memberof Camera.prototype
   *
   * @type {Cartesian3}
   * @readonly
   */
  rightWC: {
    get: function () {
      updateMembers(this);
      return this._rightWC;
    },
  },

  /**
   * Gets the camera heading in radians.
   * @memberof Camera.prototype
   *
   * @type {Number}
   * @readonly
   */
  heading: {
    get: function () {
      if (this._mode !== SceneMode.MORPHING) {
        var ellipsoid = this._projection.ellipsoid;

        var oldTransform = Matrix4.clone(this._transform, scratchHPRMatrix1);
        var transform = Transforms.eastNorthUpToFixedFrame(
          this.positionWC,
          ellipsoid,
          scratchHPRMatrix2
        );
        this._setTransform(transform);

        var heading = getHeading(this.direction, this.up);

        this._setTransform(oldTransform);

        return heading;
      }

      return undefined;
    },
  },

  /**
   * Gets the camera pitch in radians.
   * @memberof Camera.prototype
   *
   * @type {Number}
   * @readonly
   */
  pitch: {
    get: function () {
      if (this._mode !== SceneMode.MORPHING) {
        var ellipsoid = this._projection.ellipsoid;

        var oldTransform = Matrix4.clone(this._transform, scratchHPRMatrix1);
        var transform = Transforms.eastNorthUpToFixedFrame(
          this.positionWC,
          ellipsoid,
          scratchHPRMatrix2
        );
        this._setTransform(transform);

        var pitch = getPitch(this.direction);

        this._setTransform(oldTransform);

        return pitch;
      }

      return undefined;
    },
  },

  /**
   * Gets the camera roll in radians.
   * @memberof Camera.prototype
   *
   * @type {Number}
   * @readonly
   */
  roll: {
    get: function () {
      if (this._mode !== SceneMode.MORPHING) {
        var ellipsoid = this._projection.ellipsoid;

        var oldTransform = Matrix4.clone(this._transform, scratchHPRMatrix1);
        var transform = Transforms.eastNorthUpToFixedFrame(
          this.positionWC,
          ellipsoid,
          scratchHPRMatrix2
        );
        this._setTransform(transform);

        var roll = getRoll(this.direction, this.up, this.right);

        this._setTransform(oldTransform);

        return roll;
      }

      return undefined;
    },
  },

  /**
   * Gets the event that will be raised at when the camera starts to move.
   * @memberof Camera.prototype
   * @type {Event}
   * @readonly
   */
  moveStart: {
    get: function () {
      return this._moveStart;
    },
  },

  /**
   * Gets the event that will be raised when the camera has stopped moving.
   * @memberof Camera.prototype
   * @type {Event}
   * @readonly
   */
  moveEnd: {
    get: function () {
      return this._moveEnd;
    },
  },

  /**
   * Gets the event that will be raised when the camera has changed by <code>percentageChanged</code>.
   * @memberof Camera.prototype
   * @type {Event}
   * @readonly
   */
  changed: {
    get: function () {
      return this._changed;
    },
  },
});

/**
 * @private
 */
Camera.prototype.update = function (mode) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(mode)) {
    throw new DeveloperError("mode is required.");
  }
  if (
    mode === SceneMode.SCENE2D &&
    !(this.frustum instanceof OrthographicOffCenterFrustum)
  ) {
    throw new DeveloperError(
      "An OrthographicOffCenterFrustum is required in 2D."
    );
  }
  if (
    (mode === SceneMode.SCENE3D || mode === SceneMode.COLUMBUS_VIEW) &&
    !(this.frustum instanceof PerspectiveFrustum) &&
    !(this.frustum instanceof OrthographicFrustum)
  ) {
    throw new DeveloperError(
      "A PerspectiveFrustum or OrthographicFrustum is required in 3D and Columbus view"
    );
  }
  //>>includeEnd('debug');

  var updateFrustum = false;
  if (mode !== this._mode) {
    this._mode = mode;
    this._modeChanged = mode !== SceneMode.MORPHING;
    updateFrustum = this._mode === SceneMode.SCENE2D;
  }

  if (updateFrustum) {
    var frustum = (this._max2Dfrustum = this.frustum.clone());

    //>>includeStart('debug', pragmas.debug);
    if (!(frustum instanceof OrthographicOffCenterFrustum)) {
      throw new DeveloperError(
        "The camera frustum is expected to be orthographic for 2D camera control."
      );
    }
    //>>includeEnd('debug');

    var maxZoomOut = 2.0;
    var ratio = frustum.top / frustum.right;
    frustum.right = this._maxCoord.x * maxZoomOut;
    frustum.left = -frustum.right;
    frustum.top = ratio * frustum.right;
    frustum.bottom = -frustum.top;
  }

  if (this._mode === SceneMode.SCENE2D) {
    clampMove2D(this, this.position);
  }
};

var setTransformPosition = new Cartesian3();
var setTransformUp = new Cartesian3();
var setTransformDirection = new Cartesian3();

Camera.prototype._setTransform = function (transform) {
  var position = Cartesian3.clone(this.positionWC, setTransformPosition);
  var up = Cartesian3.clone(this.upWC, setTransformUp);
  var direction = Cartesian3.clone(this.directionWC, setTransformDirection);

  Matrix4.clone(transform, this._transform);
  this._transformChanged = true;
  updateMembers(this);
  var inverse = this._actualInvTransform;

  Matrix4.multiplyByPoint(inverse, position, this.position);
  Matrix4.multiplyByPointAsVector(inverse, direction, this.direction);
  Matrix4.multiplyByPointAsVector(inverse, up, this.up);
  Cartesian3.cross(this.direction, this.up, this.right);

  updateMembers(this);
};

var scratchAdjustOrthographicFrustumMousePosition = new Cartesian2();
var scratchPickRay = new Ray();
var scratchRayIntersection = new Cartesian3();
var scratchDepthIntersection = new Cartesian3();

function calculateOrthographicFrustumWidth(camera) {
  // Camera is fixed to an object, so keep frustum width constant.
  if (!Matrix4.equals(Matrix4.IDENTITY, camera.transform)) {
    return Cartesian3.magnitude(camera.position);
  }

  var scene = camera._scene;
  var globe = scene.globe;

  var mousePosition = scratchAdjustOrthographicFrustumMousePosition;
  mousePosition.x = scene.drawingBufferWidth / 2.0;
  mousePosition.y = scene.drawingBufferHeight / 2.0;

  var rayIntersection;
  if (defined(globe)) {
    var ray = camera.getPickRay(mousePosition, scratchPickRay);
    rayIntersection = globe.pickWorldCoordinates(
      ray,
      scene,
      true,
      scratchRayIntersection
    );
  }

  var depthIntersection;
  if (scene.pickPositionSupported) {
    depthIntersection = scene.pickPositionWorldCoordinates(
      mousePosition,
      scratchDepthIntersection
    );
  }

  var distance;
  if (defined(rayIntersection) || defined(depthIntersection)) {
    var depthDistance = defined(depthIntersection)
      ? Cartesian3.distance(depthIntersection, camera.positionWC)
      : Number.POSITIVE_INFINITY;
    var rayDistance = defined(rayIntersection)
      ? Cartesian3.distance(rayIntersection, camera.positionWC)
      : Number.POSITIVE_INFINITY;
    distance = Math.min(depthDistance, rayDistance);
  } else {
    distance = Math.max(camera.positionCartographic.height, 0.0);
  }
  return distance;
}

Camera.prototype._adjustOrthographicFrustum = function (zooming) {
  if (!(this.frustum instanceof OrthographicFrustum)) {
    return;
  }

  if (!zooming && this._positionCartographic.height < 150000.0) {
    return;
  }

  this.frustum.width = calculateOrthographicFrustumWidth(this);
};

var scratchSetViewCartesian = new Cartesian3();
var scratchSetViewTransform1 = new Matrix4();
var scratchSetViewTransform2 = new Matrix4();
var scratchSetViewQuaternion = new Quaternion();
var scratchSetViewMatrix3 = new Matrix3();
var scratchSetViewCartographic = new Cartographic();

function setView3D(camera, position, hpr) {
  var currentTransform = Matrix4.clone(
    camera.transform,
    scratchSetViewTransform1
  );
  var localTransform = Transforms.eastNorthUpToFixedFrame(
    position,
    camera._projection.ellipsoid,
    scratchSetViewTransform2
  );
  camera._setTransform(localTransform);

  Cartesian3.clone(Cartesian3.ZERO, camera.position);
  hpr.heading = hpr.heading - CesiumMath.PI_OVER_TWO;

  var rotQuat = Quaternion.fromHeadingPitchRoll(hpr, scratchSetViewQuaternion);
  var rotMat = Matrix3.fromQuaternion(rotQuat, scratchSetViewMatrix3);

  Matrix3.getColumn(rotMat, 0, camera.direction);
  Matrix3.getColumn(rotMat, 2, camera.up);
  Cartesian3.cross(camera.direction, camera.up, camera.right);

  camera._setTransform(currentTransform);

  camera._adjustOrthographicFrustum(true);
}

function setViewCV(camera, position, hpr, convert) {
  var currentTransform = Matrix4.clone(
    camera.transform,
    scratchSetViewTransform1
  );
  camera._setTransform(Matrix4.IDENTITY);

  if (!Cartesian3.equals(position, camera.positionWC)) {
    if (convert) {
      var projection = camera._projection;
      var cartographic = projection.ellipsoid.cartesianToCartographic(
        position,
        scratchSetViewCartographic
      );
      position = projection.project(cartographic, scratchSetViewCartesian);
    }
    Cartesian3.clone(position, camera.position);
  }
  hpr.heading = hpr.heading - CesiumMath.PI_OVER_TWO;

  var rotQuat = Quaternion.fromHeadingPitchRoll(hpr, scratchSetViewQuaternion);
  var rotMat = Matrix3.fromQuaternion(rotQuat, scratchSetViewMatrix3);

  Matrix3.getColumn(rotMat, 0, camera.direction);
  Matrix3.getColumn(rotMat, 2, camera.up);
  Cartesian3.cross(camera.direction, camera.up, camera.right);

  camera._setTransform(currentTransform);

  camera._adjustOrthographicFrustum(true);
}

function setView2D(camera, position, hpr, convert) {
  var currentTransform = Matrix4.clone(
    camera.transform,
    scratchSetViewTransform1
  );
  camera._setTransform(Matrix4.IDENTITY);

  if (!Cartesian3.equals(position, camera.positionWC)) {
    if (convert) {
      var projection = camera._projection;
      var cartographic = projection.ellipsoid.cartesianToCartographic(
        position,
        scratchSetViewCartographic
      );
      position = projection.project(cartographic, scratchSetViewCartesian);
    }

    Cartesian2.clone(position, camera.position);

    var newLeft = -position.z * 0.5;
    var newRight = -newLeft;

    var frustum = camera.frustum;
    if (newRight > newLeft) {
      var ratio = frustum.top / frustum.right;
      frustum.right = newRight;
      frustum.left = newLeft;
      frustum.top = frustum.right * ratio;
      frustum.bottom = -frustum.top;
    }
  }

  if (camera._scene.mapMode2D === MapMode2D.ROTATE) {
    hpr.heading = hpr.heading - CesiumMath.PI_OVER_TWO;
    hpr.pitch = -CesiumMath.PI_OVER_TWO;
    hpr.roll = 0.0;
    var rotQuat = Quaternion.fromHeadingPitchRoll(
      hpr,
      scratchSetViewQuaternion
    );
    var rotMat = Matrix3.fromQuaternion(rotQuat, scratchSetViewMatrix3);

    Matrix3.getColumn(rotMat, 2, camera.up);
    Cartesian3.cross(camera.direction, camera.up, camera.right);
  }

  camera._setTransform(currentTransform);
}

var scratchToHPRDirection = new Cartesian3();
var scratchToHPRUp = new Cartesian3();
var scratchToHPRRight = new Cartesian3();

function directionUpToHeadingPitchRoll(camera, position, orientation, result) {
  var direction = Cartesian3.clone(
    orientation.direction,
    scratchToHPRDirection
  );
  var up = Cartesian3.clone(orientation.up, scratchToHPRUp);

  if (camera._scene.mode === SceneMode.SCENE3D) {
    var ellipsoid = camera._projection.ellipsoid;
    var transform = Transforms.eastNorthUpToFixedFrame(
      position,
      ellipsoid,
      scratchHPRMatrix1
    );
    var invTransform = Matrix4.inverseTransformation(
      transform,
      scratchHPRMatrix2
    );

    Matrix4.multiplyByPointAsVector(invTransform, direction, direction);
    Matrix4.multiplyByPointAsVector(invTransform, up, up);
  }

  var right = Cartesian3.cross(direction, up, scratchToHPRRight);

  result.heading = getHeading(direction, up);
  result.pitch = getPitch(direction);
  result.roll = getRoll(direction, up, right);

  return result;
}

var scratchSetViewOptions = {
  destination: undefined,
  orientation: {
    direction: undefined,
    up: undefined,
    heading: undefined,
    pitch: undefined,
    roll: undefined,
  },
  convert: undefined,
  endTransform: undefined,
};

var scratchHpr = new HeadingPitchRoll();
/**
 * Sets the camera position, orientation and transform.
 *
 * @param {Object} options Object with the following properties:
 * @param {Cartesian3|Rectangle} [options.destination] The final position of the camera in WGS84 (world) coordinates or a rectangle that would be visible from a top-down view.
 * @param {Object} [options.orientation] An object that contains either direction and up properties or heading, pitch and roll properties. By default, the direction will point
 * towards the center of the frame in 3D and in the negative z direction in Columbus view. The up direction will point towards local north in 3D and in the positive
 * y direction in Columbus view. Orientation is not used in 2D when in infinite scrolling mode.
 * @param {Matrix4} [options.endTransform] Transform matrix representing the reference frame of the camera.
 * @param {Boolean} [options.convert] Whether to convert the destination from world coordinates to scene coordinates (only relevant when not using 3D). Defaults to <code>true</code>.
 *
 * @example
 * // 1. Set position with a top-down view
 * viewer.camera.setView({
 *     destination : Cesium.Cartesian3.fromDegrees(-117.16, 32.71, 15000.0)
 * });
 *
 * // 2 Set view with heading, pitch and roll
 * viewer.camera.setView({
 *     destination : cartesianPosition,
 *     orientation: {
 *         heading : Cesium.Math.toRadians(90.0), // east, default value is 0.0 (north)
 *         pitch : Cesium.Math.toRadians(-90),    // default value (looking down)
 *         roll : 0.0                             // default value
 *     }
 * });
 *
 * // 3. Change heading, pitch and roll with the camera position remaining the same.
 * viewer.camera.setView({
 *     orientation: {
 *         heading : Cesium.Math.toRadians(90.0), // east, default value is 0.0 (north)
 *         pitch : Cesium.Math.toRadians(-90),    // default value (looking down)
 *         roll : 0.0                             // default value
 *     }
 * });
 *
 *
 * // 4. View rectangle with a top-down view
 * viewer.camera.setView({
 *     destination : Cesium.Rectangle.fromDegrees(west, south, east, north)
 * });
 *
 * // 5. Set position with an orientation using unit vectors.
 * viewer.camera.setView({
 *     destination : Cesium.Cartesian3.fromDegrees(-122.19, 46.25, 5000.0),
 *     orientation : {
 *         direction : new Cesium.Cartesian3(-0.04231243104240401, -0.20123236049443421, -0.97862924300734),
 *         up : new Cesium.Cartesian3(-0.47934589305293746, -0.8553216253114552, 0.1966022179118339)
 *     }
 * });
 */
Camera.prototype.setView = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var orientation = defaultValue(
    options.orientation,
    defaultValue.EMPTY_OBJECT
  );

  var mode = this._mode;
  if (mode === SceneMode.MORPHING) {
    return;
  }

  if (defined(options.endTransform)) {
    this._setTransform(options.endTransform);
  }

  var convert = defaultValue(options.convert, true);
  var destination = defaultValue(
    options.destination,
    Cartesian3.clone(this.positionWC, scratchSetViewCartesian)
  );
  if (defined(destination) && defined(destination.west)) {
    destination = this.getRectangleCameraCoordinates(
      destination,
      scratchSetViewCartesian
    );
    convert = false;
  }

  if (defined(orientation.direction)) {
    orientation = directionUpToHeadingPitchRoll(
      this,
      destination,
      orientation,
      scratchSetViewOptions.orientation
    );
  }

  scratchHpr.heading = defaultValue(orientation.heading, 0.0);
  scratchHpr.pitch = defaultValue(orientation.pitch, -CesiumMath.PI_OVER_TWO);
  scratchHpr.roll = defaultValue(orientation.roll, 0.0);

  if (mode === SceneMode.SCENE3D) {
    setView3D(this, destination, scratchHpr);
  } else if (mode === SceneMode.SCENE2D) {
    setView2D(this, destination, scratchHpr, convert);
  } else {
    setViewCV(this, destination, scratchHpr, convert);
  }
};

var pitchScratch = new Cartesian3();
/**
 * Fly the camera to the home view.  Use {@link Camera#.DEFAULT_VIEW_RECTANGLE} to set
 * the default view for the 3D scene.  The home view for 2D and columbus view shows the
 * entire map.
 *
 * @param {Number} [duration] The duration of the flight in seconds. If omitted, Cesium attempts to calculate an ideal duration based on the distance to be traveled by the flight. See {@link Camera#flyTo}
 */
Camera.prototype.flyHome = function (duration) {
  var mode = this._mode;

  if (mode === SceneMode.MORPHING) {
    this._scene.completeMorph();
  }

  if (mode === SceneMode.SCENE2D) {
    this.flyTo({
      destination: Camera.DEFAULT_VIEW_RECTANGLE,
      duration: duration,
      endTransform: Matrix4.IDENTITY,
    });
  } else if (mode === SceneMode.SCENE3D) {
    var destination = this.getRectangleCameraCoordinates(
      Camera.DEFAULT_VIEW_RECTANGLE
    );

    var mag = Cartesian3.magnitude(destination);
    mag += mag * Camera.DEFAULT_VIEW_FACTOR;
    Cartesian3.normalize(destination, destination);
    Cartesian3.multiplyByScalar(destination, mag, destination);

    this.flyTo({
      destination: destination,
      duration: duration,
      endTransform: Matrix4.IDENTITY,
    });
  } else if (mode === SceneMode.COLUMBUS_VIEW) {
    var maxRadii = this._projection.ellipsoid.maximumRadius;
    var position = new Cartesian3(0.0, -1.0, 1.0);
    position = Cartesian3.multiplyByScalar(
      Cartesian3.normalize(position, position),
      5.0 * maxRadii,
      position
    );
    this.flyTo({
      destination: position,
      duration: duration,
      orientation: {
        heading: 0.0,
        pitch: -Math.acos(Cartesian3.normalize(position, pitchScratch).z),
        roll: 0.0,
      },
      endTransform: Matrix4.IDENTITY,
      convert: false,
    });
  }
};

/**
 * Transform a vector or point from world coordinates to the camera's reference frame.
 *
 * @param {Cartesian4} cartesian The vector or point to transform.
 * @param {Cartesian4} [result] The object onto which to store the result.
 * @returns {Cartesian4} The transformed vector or point.
 */
Camera.prototype.worldToCameraCoordinates = function (cartesian, result) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(cartesian)) {
    throw new DeveloperError("cartesian is required.");
  }
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = new Cartesian4();
  }
  updateMembers(this);
  return Matrix4.multiplyByVector(this._actualInvTransform, cartesian, result);
};

/**
 * Transform a point from world coordinates to the camera's reference frame.
 *
 * @param {Cartesian3} cartesian The point to transform.
 * @param {Cartesian3} [result] The object onto which to store the result.
 * @returns {Cartesian3} The transformed point.
 */
Camera.prototype.worldToCameraCoordinatesPoint = function (cartesian, result) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(cartesian)) {
    throw new DeveloperError("cartesian is required.");
  }
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = new Cartesian3();
  }
  updateMembers(this);
  return Matrix4.multiplyByPoint(this._actualInvTransform, cartesian, result);
};

/**
 * Transform a vector from world coordinates to the camera's reference frame.
 *
 * @param {Cartesian3} cartesian The vector to transform.
 * @param {Cartesian3} [result] The object onto which to store the result.
 * @returns {Cartesian3} The transformed vector.
 */
Camera.prototype.worldToCameraCoordinatesVector = function (cartesian, result) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(cartesian)) {
    throw new DeveloperError("cartesian is required.");
  }
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = new Cartesian3();
  }
  updateMembers(this);
  return Matrix4.multiplyByPointAsVector(
    this._actualInvTransform,
    cartesian,
    result
  );
};

/**
 * Transform a vector or point from the camera's reference frame to world coordinates.
 *
 * @param {Cartesian4} cartesian The vector or point to transform.
 * @param {Cartesian4} [result] The object onto which to store the result.
 * @returns {Cartesian4} The transformed vector or point.
 */
Camera.prototype.cameraToWorldCoordinates = function (cartesian, result) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(cartesian)) {
    throw new DeveloperError("cartesian is required.");
  }
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = new Cartesian4();
  }
  updateMembers(this);
  return Matrix4.multiplyByVector(this._actualTransform, cartesian, result);
};

/**
 * Transform a point from the camera's reference frame to world coordinates.
 *
 * @param {Cartesian3} cartesian The point to transform.
 * @param {Cartesian3} [result] The object onto which to store the result.
 * @returns {Cartesian3} The transformed point.
 */
Camera.prototype.cameraToWorldCoordinatesPoint = function (cartesian, result) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(cartesian)) {
    throw new DeveloperError("cartesian is required.");
  }
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = new Cartesian3();
  }
  updateMembers(this);
  return Matrix4.multiplyByPoint(this._actualTransform, cartesian, result);
};

/**
 * Transform a vector from the camera's reference frame to world coordinates.
 *
 * @param {Cartesian3} cartesian The vector to transform.
 * @param {Cartesian3} [result] The object onto which to store the result.
 * @returns {Cartesian3} The transformed vector.
 */
Camera.prototype.cameraToWorldCoordinatesVector = function (cartesian, result) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(cartesian)) {
    throw new DeveloperError("cartesian is required.");
  }
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = new Cartesian3();
  }
  updateMembers(this);
  return Matrix4.multiplyByPointAsVector(
    this._actualTransform,
    cartesian,
    result
  );
};

function clampMove2D(camera, position) {
  var rotatable2D = camera._scene.mapMode2D === MapMode2D.ROTATE;
  var maxProjectedX = camera._maxCoord.x;
  var maxProjectedY = camera._maxCoord.y;

  var minX;
  var maxX;
  if (rotatable2D) {
    maxX = maxProjectedX;
    minX = -maxX;
  } else {
    maxX = position.x - maxProjectedX * 2.0;
    minX = position.x + maxProjectedX * 2.0;
  }

  if (position.x > maxProjectedX) {
    position.x = maxX;
  }
  if (position.x < -maxProjectedX) {
    position.x = minX;
  }

  if (position.y > maxProjectedY) {
    position.y = maxProjectedY;
  }
  if (position.y < -maxProjectedY) {
    position.y = -maxProjectedY;
  }
}

var moveScratch = new Cartesian3();
/**
 * Translates the camera's position by <code>amount</code> along <code>direction</code>.
 *
 * @param {Cartesian3} direction The direction to move.
 * @param {Number} [amount] The amount, in meters, to move. Defaults to <code>defaultMoveAmount</code>.
 *
 * @see Camera#moveBackward
 * @see Camera#moveForward
 * @see Camera#moveLeft
 * @see Camera#moveRight
 * @see Camera#moveUp
 * @see Camera#moveDown
 */
Camera.prototype.move = function (direction, amount) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(direction)) {
    throw new DeveloperError("direction is required.");
  }
  //>>includeEnd('debug');

  var cameraPosition = this.position;
  Cartesian3.multiplyByScalar(direction, amount, moveScratch);
  Cartesian3.add(cameraPosition, moveScratch, cameraPosition);

  if (this._mode === SceneMode.SCENE2D) {
    clampMove2D(this, cameraPosition);
  }
  this._adjustOrthographicFrustum(true);
};

/**
 * Translates the camera's position by <code>amount</code> along the camera's view vector.
 * When in 2D mode, this will zoom in the camera instead of translating the camera's position.
 *
 * @param {Number} [amount] The amount, in meters, to move. Defaults to <code>defaultMoveAmount</code>.
 *
 * @see Camera#moveBackward
 */
Camera.prototype.moveForward = function (amount) {
  amount = defaultValue(amount, this.defaultMoveAmount);

  if (this._mode === SceneMode.SCENE2D) {
    // 2D mode
    zoom2D(this, amount);
  } else {
    // 3D or Columbus view mode
    this.move(this.direction, amount);
  }
};

/**
 * Translates the camera's position by <code>amount</code> along the opposite direction
 * of the camera's view vector.
 * When in 2D mode, this will zoom out the camera instead of translating the camera's position.
 *
 * @param {Number} [amount] The amount, in meters, to move. Defaults to <code>defaultMoveAmount</code>.
 *
 * @see Camera#moveForward
 */
Camera.prototype.moveBackward = function (amount) {
  amount = defaultValue(amount, this.defaultMoveAmount);

  if (this._mode === SceneMode.SCENE2D) {
    // 2D mode
    zoom2D(this, -amount);
  } else {
    // 3D or Columbus view mode
    this.move(this.direction, -amount);
  }
};

/**
 * Translates the camera's position by <code>amount</code> along the camera's up vector.
 *
 * @param {Number} [amount] The amount, in meters, to move. Defaults to <code>defaultMoveAmount</code>.
 *
 * @see Camera#moveDown
 */
Camera.prototype.moveUp = function (amount) {
  amount = defaultValue(amount, this.defaultMoveAmount);
  this.move(this.up, amount);
};

/**
 * Translates the camera's position by <code>amount</code> along the opposite direction
 * of the camera's up vector.
 *
 * @param {Number} [amount] The amount, in meters, to move. Defaults to <code>defaultMoveAmount</code>.
 *
 * @see Camera#moveUp
 */
Camera.prototype.moveDown = function (amount) {
  amount = defaultValue(amount, this.defaultMoveAmount);
  this.move(this.up, -amount);
};

/**
 * Translates the camera's position by <code>amount</code> along the camera's right vector.
 *
 * @param {Number} [amount] The amount, in meters, to move. Defaults to <code>defaultMoveAmount</code>.
 *
 * @see Camera#moveLeft
 */
Camera.prototype.moveRight = function (amount) {
  amount = defaultValue(amount, this.defaultMoveAmount);
  this.move(this.right, amount);
};

/**
 * Translates the camera's position by <code>amount</code> along the opposite direction
 * of the camera's right vector.
 *
 * @param {Number} [amount] The amount, in meters, to move. Defaults to <code>defaultMoveAmount</code>.
 *
 * @see Camera#moveRight
 */
Camera.prototype.moveLeft = function (amount) {
  amount = defaultValue(amount, this.defaultMoveAmount);
  this.move(this.right, -amount);
};

/**
 * Rotates the camera around its up vector by amount, in radians, in the opposite direction
 * of its right vector if not in 2D mode.
 *
 * @param {Number} [amount] The amount, in radians, to rotate by. Defaults to <code>defaultLookAmount</code>.
 *
 * @see Camera#lookRight
 */
Camera.prototype.lookLeft = function (amount) {
  amount = defaultValue(amount, this.defaultLookAmount);

  // only want view of map to change in 3D mode, 2D visual is incorrect when look changes
  if (this._mode !== SceneMode.SCENE2D) {
    this.look(this.up, -amount);
  }
};

/**
 * Rotates the camera around its up vector by amount, in radians, in the direction
 * of its right vector if not in 2D mode.
 *
 * @param {Number} [amount] The amount, in radians, to rotate by. Defaults to <code>defaultLookAmount</code>.
 *
 * @see Camera#lookLeft
 */
Camera.prototype.lookRight = function (amount) {
  amount = defaultValue(amount, this.defaultLookAmount);

  // only want view of map to change in 3D mode, 2D visual is incorrect when look changes
  if (this._mode !== SceneMode.SCENE2D) {
    this.look(this.up, amount);
  }
};

/**
 * Rotates the camera around its right vector by amount, in radians, in the direction
 * of its up vector if not in 2D mode.
 *
 * @param {Number} [amount] The amount, in radians, to rotate by. Defaults to <code>defaultLookAmount</code>.
 *
 * @see Camera#lookDown
 */
Camera.prototype.lookUp = function (amount) {
  amount = defaultValue(amount, this.defaultLookAmount);

  // only want view of map to change in 3D mode, 2D visual is incorrect when look changes
  if (this._mode !== SceneMode.SCENE2D) {
    this.look(this.right, -amount);
  }
};

/**
 * Rotates the camera around its right vector by amount, in radians, in the opposite direction
 * of its up vector if not in 2D mode.
 *
 * @param {Number} [amount] The amount, in radians, to rotate by. Defaults to <code>defaultLookAmount</code>.
 *
 * @see Camera#lookUp
 */
Camera.prototype.lookDown = function (amount) {
  amount = defaultValue(amount, this.defaultLookAmount);

  // only want view of map to change in 3D mode, 2D visual is incorrect when look changes
  if (this._mode !== SceneMode.SCENE2D) {
    this.look(this.right, amount);
  }
};

var lookScratchQuaternion = new Quaternion();
var lookScratchMatrix = new Matrix3();
/**
 * Rotate each of the camera's orientation vectors around <code>axis</code> by <code>angle</code>
 *
 * @param {Cartesian3} axis The axis to rotate around.
 * @param {Number} [angle] The angle, in radians, to rotate by. Defaults to <code>defaultLookAmount</code>.
 *
 * @see Camera#lookUp
 * @see Camera#lookDown
 * @see Camera#lookLeft
 * @see Camera#lookRight
 */
Camera.prototype.look = function (axis, angle) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(axis)) {
    throw new DeveloperError("axis is required.");
  }
  //>>includeEnd('debug');

  var turnAngle = defaultValue(angle, this.defaultLookAmount);
  var quaternion = Quaternion.fromAxisAngle(
    axis,
    -turnAngle,
    lookScratchQuaternion
  );
  var rotation = Matrix3.fromQuaternion(quaternion, lookScratchMatrix);

  var direction = this.direction;
  var up = this.up;
  var right = this.right;

  Matrix3.multiplyByVector(rotation, direction, direction);
  Matrix3.multiplyByVector(rotation, up, up);
  Matrix3.multiplyByVector(rotation, right, right);
};

/**
 * Rotate the camera counter-clockwise around its direction vector by amount, in radians.
 *
 * @param {Number} [amount] The amount, in radians, to rotate by. Defaults to <code>defaultLookAmount</code>.
 *
 * @see Camera#twistRight
 */
Camera.prototype.twistLeft = function (amount) {
  amount = defaultValue(amount, this.defaultLookAmount);
  this.look(this.direction, amount);
};

/**
 * Rotate the camera clockwise around its direction vector by amount, in radians.
 *
 * @param {Number} [amount] The amount, in radians, to rotate by. Defaults to <code>defaultLookAmount</code>.
 *
 * @see Camera#twistLeft
 */
Camera.prototype.twistRight = function (amount) {
  amount = defaultValue(amount, this.defaultLookAmount);
  this.look(this.direction, -amount);
};

var rotateScratchQuaternion = new Quaternion();
var rotateScratchMatrix = new Matrix3();
/**
 * Rotates the camera around <code>axis</code> by <code>angle</code>. The distance
 * of the camera's position to the center of the camera's reference frame remains the same.
 *
 * @param {Cartesian3} axis The axis to rotate around given in world coordinates.
 * @param {Number} [angle] The angle, in radians, to rotate by. Defaults to <code>defaultRotateAmount</code>.
 *
 * @see Camera#rotateUp
 * @see Camera#rotateDown
 * @see Camera#rotateLeft
 * @see Camera#rotateRight
 */
Camera.prototype.rotate = function (axis, angle) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(axis)) {
    throw new DeveloperError("axis is required.");
  }
  //>>includeEnd('debug');

  var turnAngle = defaultValue(angle, this.defaultRotateAmount);
  var quaternion = Quaternion.fromAxisAngle(
    axis,
    -turnAngle,
    rotateScratchQuaternion
  );
  var rotation = Matrix3.fromQuaternion(quaternion, rotateScratchMatrix);
  Matrix3.multiplyByVector(rotation, this.position, this.position);
  Matrix3.multiplyByVector(rotation, this.direction, this.direction);
  Matrix3.multiplyByVector(rotation, this.up, this.up);
  Cartesian3.cross(this.direction, this.up, this.right);
  Cartesian3.cross(this.right, this.direction, this.up);

  this._adjustOrthographicFrustum(false);
};

/**
 * Rotates the camera around the center of the camera's reference frame by angle downwards.
 *
 * @param {Number} [angle] The angle, in radians, to rotate by. Defaults to <code>defaultRotateAmount</code>.
 *
 * @see Camera#rotateUp
 * @see Camera#rotate
 */
Camera.prototype.rotateDown = function (angle) {
  angle = defaultValue(angle, this.defaultRotateAmount);
  rotateVertical(this, angle);
};

/**
 * Rotates the camera around the center of the camera's reference frame by angle upwards.
 *
 * @param {Number} [angle] The angle, in radians, to rotate by. Defaults to <code>defaultRotateAmount</code>.
 *
 * @see Camera#rotateDown
 * @see Camera#rotate
 */
Camera.prototype.rotateUp = function (angle) {
  angle = defaultValue(angle, this.defaultRotateAmount);
  rotateVertical(this, -angle);
};

var rotateVertScratchP = new Cartesian3();
var rotateVertScratchA = new Cartesian3();
var rotateVertScratchTan = new Cartesian3();
var rotateVertScratchNegate = new Cartesian3();
function rotateVertical(camera, angle) {
  var position = camera.position;
  if (
    defined(camera.constrainedAxis) &&
    !Cartesian3.equalsEpsilon(
      camera.position,
      Cartesian3.ZERO,
      CesiumMath.EPSILON2
    )
  ) {
    var p = Cartesian3.normalize(position, rotateVertScratchP);
    var northParallel = Cartesian3.equalsEpsilon(
      p,
      camera.constrainedAxis,
      CesiumMath.EPSILON2
    );
    var southParallel = Cartesian3.equalsEpsilon(
      p,
      Cartesian3.negate(camera.constrainedAxis, rotateVertScratchNegate),
      CesiumMath.EPSILON2
    );
    if (!northParallel && !southParallel) {
      var constrainedAxis = Cartesian3.normalize(
        camera.constrainedAxis,
        rotateVertScratchA
      );

      var dot = Cartesian3.dot(p, constrainedAxis);
      var angleToAxis = CesiumMath.acosClamped(dot);
      if (angle > 0 && angle > angleToAxis) {
        angle = angleToAxis - CesiumMath.EPSILON4;
      }

      dot = Cartesian3.dot(
        p,
        Cartesian3.negate(constrainedAxis, rotateVertScratchNegate)
      );
      angleToAxis = CesiumMath.acosClamped(dot);
      if (angle < 0 && -angle > angleToAxis) {
        angle = -angleToAxis + CesiumMath.EPSILON4;
      }

      var tangent = Cartesian3.cross(constrainedAxis, p, rotateVertScratchTan);
      camera.rotate(tangent, angle);
    } else if ((northParallel && angle < 0) || (southParallel && angle > 0)) {
      camera.rotate(camera.right, angle);
    }
  } else {
    camera.rotate(camera.right, angle);
  }
}

/**
 * Rotates the camera around the center of the camera's reference frame by angle to the right.
 *
 * @param {Number} [angle] The angle, in radians, to rotate by. Defaults to <code>defaultRotateAmount</code>.
 *
 * @see Camera#rotateLeft
 * @see Camera#rotate
 */
Camera.prototype.rotateRight = function (angle) {
  angle = defaultValue(angle, this.defaultRotateAmount);
  rotateHorizontal(this, -angle);
};

/**
 * Rotates the camera around the center of the camera's reference frame by angle to the left.
 *
 * @param {Number} [angle] The angle, in radians, to rotate by. Defaults to <code>defaultRotateAmount</code>.
 *
 * @see Camera#rotateRight
 * @see Camera#rotate
 */
Camera.prototype.rotateLeft = function (angle) {
  angle = defaultValue(angle, this.defaultRotateAmount);
  rotateHorizontal(this, angle);
};

function rotateHorizontal(camera, angle) {
  if (defined(camera.constrainedAxis)) {
    camera.rotate(camera.constrainedAxis, angle);
  } else {
    camera.rotate(camera.up, angle);
  }
}

function zoom2D(camera, amount) {
  var frustum = camera.frustum;

  //>>includeStart('debug', pragmas.debug);
  if (
    !(frustum instanceof OrthographicOffCenterFrustum) ||
    !defined(frustum.left) ||
    !defined(frustum.right) ||
    !defined(frustum.bottom) ||
    !defined(frustum.top)
  ) {
    throw new DeveloperError(
      "The camera frustum is expected to be orthographic for 2D camera control."
    );
  }
  //>>includeEnd('debug');

  var ratio;
  amount = amount * 0.5;

  if (
    Math.abs(frustum.top) + Math.abs(frustum.bottom) >
    Math.abs(frustum.left) + Math.abs(frustum.right)
  ) {
    var newTop = frustum.top - amount;
    var newBottom = frustum.bottom + amount;

    var maxBottom = camera._maxCoord.y;
    if (camera._scene.mapMode2D === MapMode2D.ROTATE) {
      maxBottom *= camera.maximumZoomFactor;
    }

    if (newBottom > maxBottom) {
      newBottom = maxBottom;
      newTop = -maxBottom;
    }

    if (newTop <= newBottom) {
      newTop = 1.0;
      newBottom = -1.0;
    }

    ratio = frustum.right / frustum.top;
    frustum.top = newTop;
    frustum.bottom = newBottom;
    frustum.right = frustum.top * ratio;
    frustum.left = -frustum.right;
  } else {
    var newRight = frustum.right - amount;
    var newLeft = frustum.left + amount;

    var maxRight = camera._maxCoord.x;
    if (camera._scene.mapMode2D === MapMode2D.ROTATE) {
      maxRight *= camera.maximumZoomFactor;
    }

    if (newRight > maxRight) {
      newRight = maxRight;
      newLeft = -maxRight;
    }

    if (newRight <= newLeft) {
      newRight = 1.0;
      newLeft = -1.0;
    }
    ratio = frustum.top / frustum.right;
    frustum.right = newRight;
    frustum.left = newLeft;
    frustum.top = frustum.right * ratio;
    frustum.bottom = -frustum.top;
  }
}

function zoom3D(camera, amount) {
  camera.move(camera.direction, amount);
}

/**
 * Zooms <code>amount</code> along the camera's view vector.
 *
 * @param {Number} [amount] The amount to move. Defaults to <code>defaultZoomAmount</code>.
 *
 * @see Camera#zoomOut
 */
Camera.prototype.zoomIn = function (amount) {
  amount = defaultValue(amount, this.defaultZoomAmount);
  if (this._mode === SceneMode.SCENE2D) {
    zoom2D(this, amount);
  } else {
    zoom3D(this, amount);
  }
};

/**
 * Zooms <code>amount</code> along the opposite direction of
 * the camera's view vector.
 *
 * @param {Number} [amount] The amount to move. Defaults to <code>defaultZoomAmount</code>.
 *
 * @see Camera#zoomIn
 */
Camera.prototype.zoomOut = function (amount) {
  amount = defaultValue(amount, this.defaultZoomAmount);
  if (this._mode === SceneMode.SCENE2D) {
    zoom2D(this, -amount);
  } else {
    zoom3D(this, -amount);
  }
};

/**
 * Gets the magnitude of the camera position. In 3D, this is the vector magnitude. In 2D and
 * Columbus view, this is the distance to the map.
 *
 * @returns {Number} The magnitude of the position.
 */
Camera.prototype.getMagnitude = function () {
  if (this._mode === SceneMode.SCENE3D) {
    return Cartesian3.magnitude(this.position);
  } else if (this._mode === SceneMode.COLUMBUS_VIEW) {
    return Math.abs(this.position.z);
  } else if (this._mode === SceneMode.SCENE2D) {
    return Math.max(
      this.frustum.right - this.frustum.left,
      this.frustum.top - this.frustum.bottom
    );
  }
};

var scratchLookAtMatrix4 = new Matrix4();

/**
 * Sets the camera position and orientation using a target and offset. The target must be given in
 * world coordinates. The offset can be either a cartesian or heading/pitch/range in the local east-north-up reference frame centered at the target.
 * If the offset is a cartesian, then it is an offset from the center of the reference frame defined by the transformation matrix. If the offset
 * is heading/pitch/range, then the heading and the pitch angles are defined in the reference frame defined by the transformation matrix.
 * The heading is the angle from y axis and increasing towards the x axis. Pitch is the rotation from the xy-plane. Positive pitch
 * angles are below the plane. Negative pitch angles are above the plane. The range is the distance from the center.
 *
 * In 2D, there must be a top down view. The camera will be placed above the target looking down. The height above the
 * target will be the magnitude of the offset. The heading will be determined from the offset. If the heading cannot be
 * determined from the offset, the heading will be north.
 *
 * @param {Cartesian3} target The target position in world coordinates.
 * @param {Cartesian3|HeadingPitchRange} offset The offset from the target in the local east-north-up reference frame centered at the target.
 *
 * @exception {DeveloperError} lookAt is not supported while morphing.
 *
 * @example
 * // 1. Using a cartesian offset
 * var center = Cesium.Cartesian3.fromDegrees(-98.0, 40.0);
 * viewer.camera.lookAt(center, new Cesium.Cartesian3(0.0, -4790000.0, 3930000.0));
 *
 * // 2. Using a HeadingPitchRange offset
 * var center = Cesium.Cartesian3.fromDegrees(-72.0, 40.0);
 * var heading = Cesium.Math.toRadians(50.0);
 * var pitch = Cesium.Math.toRadians(-20.0);
 * var range = 5000.0;
 * viewer.camera.lookAt(center, new Cesium.HeadingPitchRange(heading, pitch, range));
 */
Camera.prototype.lookAt = function (target, offset) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(target)) {
    throw new DeveloperError("target is required");
  }
  if (!defined(offset)) {
    throw new DeveloperError("offset is required");
  }
  if (this._mode === SceneMode.MORPHING) {
    throw new DeveloperError("lookAt is not supported while morphing.");
  }
  //>>includeEnd('debug');

  var transform = Transforms.eastNorthUpToFixedFrame(
    target,
    Ellipsoid.WGS84,
    scratchLookAtMatrix4
  );
  this.lookAtTransform(transform, offset);
};

var scratchLookAtHeadingPitchRangeOffset = new Cartesian3();
var scratchLookAtHeadingPitchRangeQuaternion1 = new Quaternion();
var scratchLookAtHeadingPitchRangeQuaternion2 = new Quaternion();
var scratchHeadingPitchRangeMatrix3 = new Matrix3();

function offsetFromHeadingPitchRange(heading, pitch, range) {
  pitch = CesiumMath.clamp(
    pitch,
    -CesiumMath.PI_OVER_TWO,
    CesiumMath.PI_OVER_TWO
  );
  heading = CesiumMath.zeroToTwoPi(heading) - CesiumMath.PI_OVER_TWO;

  var pitchQuat = Quaternion.fromAxisAngle(
    Cartesian3.UNIT_Y,
    -pitch,
    scratchLookAtHeadingPitchRangeQuaternion1
  );
  var headingQuat = Quaternion.fromAxisAngle(
    Cartesian3.UNIT_Z,
    -heading,
    scratchLookAtHeadingPitchRangeQuaternion2
  );
  var rotQuat = Quaternion.multiply(headingQuat, pitchQuat, headingQuat);
  var rotMatrix = Matrix3.fromQuaternion(
    rotQuat,
    scratchHeadingPitchRangeMatrix3
  );

  var offset = Cartesian3.clone(
    Cartesian3.UNIT_X,
    scratchLookAtHeadingPitchRangeOffset
  );
  Matrix3.multiplyByVector(rotMatrix, offset, offset);
  Cartesian3.negate(offset, offset);
  Cartesian3.multiplyByScalar(offset, range, offset);
  return offset;
}

/**
 * Sets the camera position and orientation using a target and transformation matrix. The offset can be either a cartesian or heading/pitch/range.
 * If the offset is a cartesian, then it is an offset from the center of the reference frame defined by the transformation matrix. If the offset
 * is heading/pitch/range, then the heading and the pitch angles are defined in the reference frame defined by the transformation matrix.
 * The heading is the angle from y axis and increasing towards the x axis. Pitch is the rotation from the xy-plane. Positive pitch
 * angles are below the plane. Negative pitch angles are above the plane. The range is the distance from the center.
 *
 * In 2D, there must be a top down view. The camera will be placed above the center of the reference frame. The height above the
 * target will be the magnitude of the offset. The heading will be determined from the offset. If the heading cannot be
 * determined from the offset, the heading will be north.
 *
 * @param {Matrix4} transform The transformation matrix defining the reference frame.
 * @param {Cartesian3|HeadingPitchRange} [offset] The offset from the target in a reference frame centered at the target.
 *
 * @exception {DeveloperError} lookAtTransform is not supported while morphing.
 *
 * @example
 * // 1. Using a cartesian offset
 * var transform = Cesium.Transforms.eastNorthUpToFixedFrame(Cesium.Cartesian3.fromDegrees(-98.0, 40.0));
 * viewer.camera.lookAtTransform(transform, new Cesium.Cartesian3(0.0, -4790000.0, 3930000.0));
 *
 * // 2. Using a HeadingPitchRange offset
 * var transform = Cesium.Transforms.eastNorthUpToFixedFrame(Cesium.Cartesian3.fromDegrees(-72.0, 40.0));
 * var heading = Cesium.Math.toRadians(50.0);
 * var pitch = Cesium.Math.toRadians(-20.0);
 * var range = 5000.0;
 * viewer.camera.lookAtTransform(transform, new Cesium.HeadingPitchRange(heading, pitch, range));
 */
Camera.prototype.lookAtTransform = function (transform, offset) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(transform)) {
    throw new DeveloperError("transform is required");
  }
  if (this._mode === SceneMode.MORPHING) {
    throw new DeveloperError(
      "lookAtTransform is not supported while morphing."
    );
  }
  //>>includeEnd('debug');

  this._setTransform(transform);
  if (!defined(offset)) {
    return;
  }

  var cartesianOffset;
  if (defined(offset.heading)) {
    cartesianOffset = offsetFromHeadingPitchRange(
      offset.heading,
      offset.pitch,
      offset.range
    );
  } else {
    cartesianOffset = offset;
  }

  if (this._mode === SceneMode.SCENE2D) {
    Cartesian2.clone(Cartesian2.ZERO, this.position);

    Cartesian3.negate(cartesianOffset, this.up);
    this.up.z = 0.0;

    if (Cartesian3.magnitudeSquared(this.up) < CesiumMath.EPSILON10) {
      Cartesian3.clone(Cartesian3.UNIT_Y, this.up);
    }

    Cartesian3.normalize(this.up, this.up);

    this._setTransform(Matrix4.IDENTITY);

    Cartesian3.negate(Cartesian3.UNIT_Z, this.direction);
    Cartesian3.cross(this.direction, this.up, this.right);
    Cartesian3.normalize(this.right, this.right);

    var frustum = this.frustum;
    var ratio = frustum.top / frustum.right;
    frustum.right = Cartesian3.magnitude(cartesianOffset) * 0.5;
    frustum.left = -frustum.right;
    frustum.top = ratio * frustum.right;
    frustum.bottom = -frustum.top;

    this._setTransform(transform);

    return;
  }

  Cartesian3.clone(cartesianOffset, this.position);
  Cartesian3.negate(this.position, this.direction);
  Cartesian3.normalize(this.direction, this.direction);
  Cartesian3.cross(this.direction, Cartesian3.UNIT_Z, this.right);

  if (Cartesian3.magnitudeSquared(this.right) < CesiumMath.EPSILON10) {
    Cartesian3.clone(Cartesian3.UNIT_X, this.right);
  }

  Cartesian3.normalize(this.right, this.right);
  Cartesian3.cross(this.right, this.direction, this.up);
  Cartesian3.normalize(this.up, this.up);

  this._adjustOrthographicFrustum(true);
};

var viewRectangle3DCartographic1 = new Cartographic();
var viewRectangle3DCartographic2 = new Cartographic();
var viewRectangle3DNorthEast = new Cartesian3();
var viewRectangle3DSouthWest = new Cartesian3();
var viewRectangle3DNorthWest = new Cartesian3();
var viewRectangle3DSouthEast = new Cartesian3();
var viewRectangle3DNorthCenter = new Cartesian3();
var viewRectangle3DSouthCenter = new Cartesian3();
var viewRectangle3DCenter = new Cartesian3();
var viewRectangle3DEquator = new Cartesian3();
var defaultRF = {
  direction: new Cartesian3(),
  right: new Cartesian3(),
  up: new Cartesian3(),
};
var viewRectangle3DEllipsoidGeodesic;

function computeD(direction, upOrRight, corner, tanThetaOrPhi) {
  var opposite = Math.abs(Cartesian3.dot(upOrRight, corner));
  return opposite / tanThetaOrPhi - Cartesian3.dot(direction, corner);
}

function rectangleCameraPosition3D(camera, rectangle, result, updateCamera) {
  var ellipsoid = camera._projection.ellipsoid;
  var cameraRF = updateCamera ? camera : defaultRF;

  var north = rectangle.north;
  var south = rectangle.south;
  var east = rectangle.east;
  var west = rectangle.west;

  // If we go across the International Date Line
  if (west > east) {
    east += CesiumMath.TWO_PI;
  }

  // Find the midpoint latitude.
  //
  // EllipsoidGeodesic will fail if the north and south edges are very close to being on opposite sides of the ellipsoid.
  // Ideally we'd just call EllipsoidGeodesic.setEndPoints and let it throw when it detects this case, but sadly it doesn't
  // even look for this case in optimized builds, so we have to test for it here instead.
  //
  // Fortunately, this case can only happen (here) when north is very close to the north pole and south is very close to the south pole,
  // so handle it just by using 0 latitude as the center.  It's certainliy possible to use a smaller tolerance
  // than one degree here, but one degree is safe and putting the center at 0 latitude should be good enough for any
  // rectangle that spans 178+ of the 180 degrees of latitude.
  var longitude = (west + east) * 0.5;
  var latitude;
  if (
    south < -CesiumMath.PI_OVER_TWO + CesiumMath.RADIANS_PER_DEGREE &&
    north > CesiumMath.PI_OVER_TWO - CesiumMath.RADIANS_PER_DEGREE
  ) {
    latitude = 0.0;
  } else {
    var northCartographic = viewRectangle3DCartographic1;
    northCartographic.longitude = longitude;
    northCartographic.latitude = north;
    northCartographic.height = 0.0;

    var southCartographic = viewRectangle3DCartographic2;
    southCartographic.longitude = longitude;
    southCartographic.latitude = south;
    southCartographic.height = 0.0;

    var ellipsoidGeodesic = viewRectangle3DEllipsoidGeodesic;
    if (
      !defined(ellipsoidGeodesic) ||
      ellipsoidGeodesic.ellipsoid !== ellipsoid
    ) {
      viewRectangle3DEllipsoidGeodesic = ellipsoidGeodesic = new EllipsoidGeodesic(
        undefined,
        undefined,
        ellipsoid
      );
    }

    ellipsoidGeodesic.setEndPoints(northCartographic, southCartographic);
    latitude = ellipsoidGeodesic.interpolateUsingFraction(
      0.5,
      viewRectangle3DCartographic1
    ).latitude;
  }

  var centerCartographic = viewRectangle3DCartographic1;
  centerCartographic.longitude = longitude;
  centerCartographic.latitude = latitude;
  centerCartographic.height = 0.0;

  var center = ellipsoid.cartographicToCartesian(
    centerCartographic,
    viewRectangle3DCenter
  );

  var cart = viewRectangle3DCartographic1;
  cart.longitude = east;
  cart.latitude = north;
  var northEast = ellipsoid.cartographicToCartesian(
    cart,
    viewRectangle3DNorthEast
  );
  cart.longitude = west;
  var northWest = ellipsoid.cartographicToCartesian(
    cart,
    viewRectangle3DNorthWest
  );
  cart.longitude = longitude;
  var northCenter = ellipsoid.cartographicToCartesian(
    cart,
    viewRectangle3DNorthCenter
  );
  cart.latitude = south;
  var southCenter = ellipsoid.cartographicToCartesian(
    cart,
    viewRectangle3DSouthCenter
  );
  cart.longitude = east;
  var southEast = ellipsoid.cartographicToCartesian(
    cart,
    viewRectangle3DSouthEast
  );
  cart.longitude = west;
  var southWest = ellipsoid.cartographicToCartesian(
    cart,
    viewRectangle3DSouthWest
  );

  Cartesian3.subtract(northWest, center, northWest);
  Cartesian3.subtract(southEast, center, southEast);
  Cartesian3.subtract(northEast, center, northEast);
  Cartesian3.subtract(southWest, center, southWest);
  Cartesian3.subtract(northCenter, center, northCenter);
  Cartesian3.subtract(southCenter, center, southCenter);

  var direction = ellipsoid.geodeticSurfaceNormal(center, cameraRF.direction);
  Cartesian3.negate(direction, direction);
  var right = Cartesian3.cross(direction, Cartesian3.UNIT_Z, cameraRF.right);
  Cartesian3.normalize(right, right);
  var up = Cartesian3.cross(right, direction, cameraRF.up);

  var d;
  if (camera.frustum instanceof OrthographicFrustum) {
    var width = Math.max(
      Cartesian3.distance(northEast, northWest),
      Cartesian3.distance(southEast, southWest)
    );
    var height = Math.max(
      Cartesian3.distance(northEast, southEast),
      Cartesian3.distance(northWest, southWest)
    );

    var rightScalar;
    var topScalar;
    var ratio =
      camera.frustum._offCenterFrustum.right /
      camera.frustum._offCenterFrustum.top;
    var heightRatio = height * ratio;
    if (width > heightRatio) {
      rightScalar = width;
      topScalar = rightScalar / ratio;
    } else {
      topScalar = height;
      rightScalar = heightRatio;
    }

    d = Math.max(rightScalar, topScalar);
  } else {
    var tanPhi = Math.tan(camera.frustum.fovy * 0.5);
    var tanTheta = camera.frustum.aspectRatio * tanPhi;

    d = Math.max(
      computeD(direction, up, northWest, tanPhi),
      computeD(direction, up, southEast, tanPhi),
      computeD(direction, up, northEast, tanPhi),
      computeD(direction, up, southWest, tanPhi),
      computeD(direction, up, northCenter, tanPhi),
      computeD(direction, up, southCenter, tanPhi),
      computeD(direction, right, northWest, tanTheta),
      computeD(direction, right, southEast, tanTheta),
      computeD(direction, right, northEast, tanTheta),
      computeD(direction, right, southWest, tanTheta),
      computeD(direction, right, northCenter, tanTheta),
      computeD(direction, right, southCenter, tanTheta)
    );

    // If the rectangle crosses the equator, compute D at the equator, too, because that's the
    // widest part of the rectangle when projected onto the globe.
    if (south < 0 && north > 0) {
      var equatorCartographic = viewRectangle3DCartographic1;
      equatorCartographic.longitude = west;
      equatorCartographic.latitude = 0.0;
      equatorCartographic.height = 0.0;
      var equatorPosition = ellipsoid.cartographicToCartesian(
        equatorCartographic,
        viewRectangle3DEquator
      );
      Cartesian3.subtract(equatorPosition, center, equatorPosition);
      d = Math.max(
        d,
        computeD(direction, up, equatorPosition, tanPhi),
        computeD(direction, right, equatorPosition, tanTheta)
      );

      equatorCartographic.longitude = east;
      equatorPosition = ellipsoid.cartographicToCartesian(
        equatorCartographic,
        viewRectangle3DEquator
      );
      Cartesian3.subtract(equatorPosition, center, equatorPosition);
      d = Math.max(
        d,
        computeD(direction, up, equatorPosition, tanPhi),
        computeD(direction, right, equatorPosition, tanTheta)
      );
    }
  }

  return Cartesian3.add(
    center,
    Cartesian3.multiplyByScalar(direction, -d, viewRectangle3DEquator),
    result
  );
}

var viewRectangleCVCartographic = new Cartographic();
var viewRectangleCVNorthEast = new Cartesian3();
var viewRectangleCVSouthWest = new Cartesian3();
function rectangleCameraPositionColumbusView(camera, rectangle, result) {
  var projection = camera._projection;
  if (rectangle.west > rectangle.east) {
    rectangle = Rectangle.MAX_VALUE;
  }
  var transform = camera._actualTransform;
  var invTransform = camera._actualInvTransform;

  var cart = viewRectangleCVCartographic;
  cart.longitude = rectangle.east;
  cart.latitude = rectangle.north;
  var northEast = projection.project(cart, viewRectangleCVNorthEast);
  Matrix4.multiplyByPoint(transform, northEast, northEast);
  Matrix4.multiplyByPoint(invTransform, northEast, northEast);

  cart.longitude = rectangle.west;
  cart.latitude = rectangle.south;
  var southWest = projection.project(cart, viewRectangleCVSouthWest);
  Matrix4.multiplyByPoint(transform, southWest, southWest);
  Matrix4.multiplyByPoint(invTransform, southWest, southWest);

  result.x = (northEast.x - southWest.x) * 0.5 + southWest.x;
  result.y = (northEast.y - southWest.y) * 0.5 + southWest.y;

  if (defined(camera.frustum.fovy)) {
    var tanPhi = Math.tan(camera.frustum.fovy * 0.5);
    var tanTheta = camera.frustum.aspectRatio * tanPhi;
    result.z =
      Math.max(
        (northEast.x - southWest.x) / tanTheta,
        (northEast.y - southWest.y) / tanPhi
      ) * 0.5;
  } else {
    var width = northEast.x - southWest.x;
    var height = northEast.y - southWest.y;
    result.z = Math.max(width, height);
  }

  return result;
}

var viewRectangle2DCartographic = new Cartographic();
var viewRectangle2DNorthEast = new Cartesian3();
var viewRectangle2DSouthWest = new Cartesian3();
function rectangleCameraPosition2D(camera, rectangle, result) {
  var projection = camera._projection;

  // Account for the rectangle crossing the International Date Line in 2D mode
  var east = rectangle.east;
  if (rectangle.west > rectangle.east) {
    if (camera._scene.mapMode2D === MapMode2D.INFINITE_SCROLL) {
      east += CesiumMath.TWO_PI;
    } else {
      rectangle = Rectangle.MAX_VALUE;
      east = rectangle.east;
    }
  }

  var cart = viewRectangle2DCartographic;
  cart.longitude = east;
  cart.latitude = rectangle.north;
  var northEast = projection.project(cart, viewRectangle2DNorthEast);
  cart.longitude = rectangle.west;
  cart.latitude = rectangle.south;
  var southWest = projection.project(cart, viewRectangle2DSouthWest);

  var width = Math.abs(northEast.x - southWest.x) * 0.5;
  var height = Math.abs(northEast.y - southWest.y) * 0.5;

  var right, top;
  var ratio = camera.frustum.right / camera.frustum.top;
  var heightRatio = height * ratio;
  if (width > heightRatio) {
    right = width;
    top = right / ratio;
  } else {
    top = height;
    right = heightRatio;
  }

  height = Math.max(2.0 * right, 2.0 * top);

  result.x = (northEast.x - southWest.x) * 0.5 + southWest.x;
  result.y = (northEast.y - southWest.y) * 0.5 + southWest.y;

  cart = projection.unproject(result, cart);
  cart.height = height;
  result = projection.project(cart, result);

  return result;
}

/**
 * Get the camera position needed to view a rectangle on an ellipsoid or map
 *
 * @param {Rectangle} rectangle The rectangle to view.
 * @param {Cartesian3} [result] The camera position needed to view the rectangle
 * @returns {Cartesian3} The camera position needed to view the rectangle
 */
Camera.prototype.getRectangleCameraCoordinates = function (rectangle, result) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(rectangle)) {
    throw new DeveloperError("rectangle is required");
  }
  //>>includeEnd('debug');
  var mode = this._mode;

  if (!defined(result)) {
    result = new Cartesian3();
  }

  if (mode === SceneMode.SCENE3D) {
    return rectangleCameraPosition3D(this, rectangle, result);
  } else if (mode === SceneMode.COLUMBUS_VIEW) {
    return rectangleCameraPositionColumbusView(this, rectangle, result);
  } else if (mode === SceneMode.SCENE2D) {
    return rectangleCameraPosition2D(this, rectangle, result);
  }

  return undefined;
};

var pickEllipsoid3DRay = new Ray();
function pickEllipsoid3D(camera, windowPosition, ellipsoid, result) {
  ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);
  var ray = camera.getPickRay(windowPosition, pickEllipsoid3DRay);
  var intersection = IntersectionTests.rayEllipsoid(ray, ellipsoid);
  if (!intersection) {
    return undefined;
  }

  var t = intersection.start > 0.0 ? intersection.start : intersection.stop;
  return Ray.getPoint(ray, t, result);
}

var pickEllipsoid2DRay = new Ray();
function pickMap2D(camera, windowPosition, projection, result) {
  var ray = camera.getPickRay(windowPosition, pickEllipsoid2DRay);
  var position = ray.origin;
  position = Cartesian3.fromElements(position.y, position.z, 0.0, position);
  var cart = projection.unproject(position);

  if (
    cart.latitude < -CesiumMath.PI_OVER_TWO ||
    cart.latitude > CesiumMath.PI_OVER_TWO
  ) {
    return undefined;
  }

  return projection.ellipsoid.cartographicToCartesian(cart, result);
}

var pickEllipsoidCVRay = new Ray();
function pickMapColumbusView(camera, windowPosition, projection, result) {
  var ray = camera.getPickRay(windowPosition, pickEllipsoidCVRay);
  var scalar = -ray.origin.x / ray.direction.x;
  Ray.getPoint(ray, scalar, result);

  var cart = projection.unproject(new Cartesian3(result.y, result.z, 0.0));

  if (
    cart.latitude < -CesiumMath.PI_OVER_TWO ||
    cart.latitude > CesiumMath.PI_OVER_TWO ||
    cart.longitude < -Math.PI ||
    cart.longitude > Math.PI
  ) {
    return undefined;
  }

  return projection.ellipsoid.cartographicToCartesian(cart, result);
}

/**
 * Pick an ellipsoid or map.
 *
 * @param {Cartesian2} windowPosition The x and y coordinates of a pixel.
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid to pick.
 * @param {Cartesian3} [result] The object onto which to store the result.
 * @returns {Cartesian3 | undefined} If the ellipsoid or map was picked,
 * returns the point on the surface of the ellipsoid or map in world
 * coordinates. If the ellipsoid or map was not picked, returns undefined.
 *
 * @example
 * var canvas = viewer.scene.canvas;
 * var center = new Cesium.Cartesian2(canvas.clientWidth / 2.0, canvas.clientHeight / 2.0);
 * var ellipsoid = viewer.scene.globe.ellipsoid;
 * var result = viewer.camera.pickEllipsoid(center, ellipsoid);
 */
Camera.prototype.pickEllipsoid = function (windowPosition, ellipsoid, result) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(windowPosition)) {
    throw new DeveloperError("windowPosition is required.");
  }
  //>>includeEnd('debug');

  var canvas = this._scene.canvas;
  if (canvas.clientWidth === 0 || canvas.clientHeight === 0) {
    return undefined;
  }

  if (!defined(result)) {
    result = new Cartesian3();
  }

  ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);

  if (this._mode === SceneMode.SCENE3D) {
    result = pickEllipsoid3D(this, windowPosition, ellipsoid, result);
  } else if (this._mode === SceneMode.SCENE2D) {
    result = pickMap2D(this, windowPosition, this._projection, result);
  } else if (this._mode === SceneMode.COLUMBUS_VIEW) {
    result = pickMapColumbusView(
      this,
      windowPosition,
      this._projection,
      result
    );
  } else {
    return undefined;
  }

  return result;
};

var pickPerspCenter = new Cartesian3();
var pickPerspXDir = new Cartesian3();
var pickPerspYDir = new Cartesian3();
function getPickRayPerspective(camera, windowPosition, result) {
  var canvas = camera._scene.canvas;
  var width = canvas.clientWidth;
  var height = canvas.clientHeight;

  var tanPhi = Math.tan(camera.frustum.fovy * 0.5);
  var tanTheta = camera.frustum.aspectRatio * tanPhi;
  var near = camera.frustum.near;

  var x = (2.0 / width) * windowPosition.x - 1.0;
  var y = (2.0 / height) * (height - windowPosition.y) - 1.0;

  var position = camera.positionWC;
  Cartesian3.clone(position, result.origin);

  var nearCenter = Cartesian3.multiplyByScalar(
    camera.directionWC,
    near,
    pickPerspCenter
  );
  Cartesian3.add(position, nearCenter, nearCenter);
  var xDir = Cartesian3.multiplyByScalar(
    camera.rightWC,
    x * near * tanTheta,
    pickPerspXDir
  );
  var yDir = Cartesian3.multiplyByScalar(
    camera.upWC,
    y * near * tanPhi,
    pickPerspYDir
  );
  var direction = Cartesian3.add(nearCenter, xDir, result.direction);
  Cartesian3.add(direction, yDir, direction);
  Cartesian3.subtract(direction, position, direction);
  Cartesian3.normalize(direction, direction);

  return result;
}

var scratchDirection = new Cartesian3();

function getPickRayOrthographic(camera, windowPosition, result) {
  var canvas = camera._scene.canvas;
  var width = canvas.clientWidth;
  var height = canvas.clientHeight;

  var frustum = camera.frustum;
  if (defined(frustum._offCenterFrustum)) {
    frustum = frustum._offCenterFrustum;
  }
  var x = (2.0 / width) * windowPosition.x - 1.0;
  x *= (frustum.right - frustum.left) * 0.5;
  var y = (2.0 / height) * (height - windowPosition.y) - 1.0;
  y *= (frustum.top - frustum.bottom) * 0.5;

  var origin = result.origin;
  Cartesian3.clone(camera.position, origin);

  Cartesian3.multiplyByScalar(camera.right, x, scratchDirection);
  Cartesian3.add(scratchDirection, origin, origin);
  Cartesian3.multiplyByScalar(camera.up, y, scratchDirection);
  Cartesian3.add(scratchDirection, origin, origin);

  Cartesian3.clone(camera.directionWC, result.direction);

  if (
    camera._mode === SceneMode.COLUMBUS_VIEW ||
    camera._mode === SceneMode.SCENE2D
  ) {
    Cartesian3.fromElements(
      result.origin.z,
      result.origin.x,
      result.origin.y,
      result.origin
    );
  }

  return result;
}

/**
 * Create a ray from the camera position through the pixel at <code>windowPosition</code>
 * in world coordinates.
 *
 * @param {Cartesian2} windowPosition The x and y coordinates of a pixel.
 * @param {Ray} [result] The object onto which to store the result.
 * @returns {Ray} Returns the {@link Cartesian3} position and direction of the ray.
 */
Camera.prototype.getPickRay = function (windowPosition, result) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(windowPosition)) {
    throw new DeveloperError("windowPosition is required.");
  }
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = new Ray();
  }

  var frustum = this.frustum;
  if (
    defined(frustum.aspectRatio) &&
    defined(frustum.fov) &&
    defined(frustum.near)
  ) {
    return getPickRayPerspective(this, windowPosition, result);
  }

  return getPickRayOrthographic(this, windowPosition, result);
};

var scratchToCenter = new Cartesian3();
var scratchProj = new Cartesian3();

/**
 * Return the distance from the camera to the front of the bounding sphere.
 *
 * @param {BoundingSphere} boundingSphere The bounding sphere in world coordinates.
 * @returns {Number} The distance to the bounding sphere.
 */
Camera.prototype.distanceToBoundingSphere = function (boundingSphere) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(boundingSphere)) {
    throw new DeveloperError("boundingSphere is required.");
  }
  //>>includeEnd('debug');

  var toCenter = Cartesian3.subtract(
    this.positionWC,
    boundingSphere.center,
    scratchToCenter
  );
  var proj = Cartesian3.multiplyByScalar(
    this.directionWC,
    Cartesian3.dot(toCenter, this.directionWC),
    scratchProj
  );
  return Math.max(0.0, Cartesian3.magnitude(proj) - boundingSphere.radius);
};

var scratchPixelSize = new Cartesian2();

/**
 * Return the pixel size in meters.
 *
 * @param {BoundingSphere} boundingSphere The bounding sphere in world coordinates.
 * @param {Number} drawingBufferWidth The drawing buffer width.
 * @param {Number} drawingBufferHeight The drawing buffer height.
 * @returns {Number} The pixel size in meters.
 */
Camera.prototype.getPixelSize = function (
  boundingSphere,
  drawingBufferWidth,
  drawingBufferHeight
) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(boundingSphere)) {
    throw new DeveloperError("boundingSphere is required.");
  }
  if (!defined(drawingBufferWidth)) {
    throw new DeveloperError("drawingBufferWidth is required.");
  }
  if (!defined(drawingBufferHeight)) {
    throw new DeveloperError("drawingBufferHeight is required.");
  }
  //>>includeEnd('debug');

  var distance = this.distanceToBoundingSphere(boundingSphere);
  var pixelSize = this.frustum.getPixelDimensions(
    drawingBufferWidth,
    drawingBufferHeight,
    distance,
    this._scene.pixelRatio,
    scratchPixelSize
  );
  return Math.max(pixelSize.x, pixelSize.y);
};

function createAnimationTemplateCV(
  camera,
  position,
  center,
  maxX,
  maxY,
  duration
) {
  var newPosition = Cartesian3.clone(position);

  if (center.y > maxX) {
    newPosition.y -= center.y - maxX;
  } else if (center.y < -maxX) {
    newPosition.y += -maxX - center.y;
  }

  if (center.z > maxY) {
    newPosition.z -= center.z - maxY;
  } else if (center.z < -maxY) {
    newPosition.z += -maxY - center.z;
  }

  function updateCV(value) {
    var interp = Cartesian3.lerp(
      position,
      newPosition,
      value.time,
      new Cartesian3()
    );
    camera.worldToCameraCoordinatesPoint(interp, camera.position);
  }
  return {
    easingFunction: EasingFunction.EXPONENTIAL_OUT,
    startObject: {
      time: 0.0,
    },
    stopObject: {
      time: 1.0,
    },
    duration: duration,
    update: updateCV,
  };
}

var normalScratch = new Cartesian3();
var centerScratch = new Cartesian3();
var posScratch = new Cartesian3();
var scratchCartesian3Subtract = new Cartesian3();

function createAnimationCV(camera, duration) {
  var position = camera.position;
  var direction = camera.direction;

  var normal = camera.worldToCameraCoordinatesVector(
    Cartesian3.UNIT_X,
    normalScratch
  );
  var scalar =
    -Cartesian3.dot(normal, position) / Cartesian3.dot(normal, direction);
  var center = Cartesian3.add(
    position,
    Cartesian3.multiplyByScalar(direction, scalar, centerScratch),
    centerScratch
  );
  camera.cameraToWorldCoordinatesPoint(center, center);

  position = camera.cameraToWorldCoordinatesPoint(camera.position, posScratch);

  var tanPhi = Math.tan(camera.frustum.fovy * 0.5);
  var tanTheta = camera.frustum.aspectRatio * tanPhi;
  var distToC = Cartesian3.magnitude(
    Cartesian3.subtract(position, center, scratchCartesian3Subtract)
  );
  var dWidth = tanTheta * distToC;
  var dHeight = tanPhi * distToC;

  var mapWidth = camera._maxCoord.x;
  var mapHeight = camera._maxCoord.y;

  var maxX = Math.max(dWidth - mapWidth, mapWidth);
  var maxY = Math.max(dHeight - mapHeight, mapHeight);

  if (
    position.z < -maxX ||
    position.z > maxX ||
    position.y < -maxY ||
    position.y > maxY
  ) {
    var translateX = center.y < -maxX || center.y > maxX;
    var translateY = center.z < -maxY || center.z > maxY;
    if (translateX || translateY) {
      return createAnimationTemplateCV(
        camera,
        position,
        center,
        maxX,
        maxY,
        duration
      );
    }
  }

  return undefined;
}

/**
 * Create an animation to move the map into view. This method is only valid for 2D and Columbus modes.
 *
 * @param {Number} duration The duration, in seconds, of the animation.
 * @returns {Object} The animation or undefined if the scene mode is 3D or the map is already ion view.
 *
 * @private
 */
Camera.prototype.createCorrectPositionTween = function (duration) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(duration)) {
    throw new DeveloperError("duration is required.");
  }
  //>>includeEnd('debug');

  if (this._mode === SceneMode.COLUMBUS_VIEW) {
    return createAnimationCV(this, duration);
  }

  return undefined;
};

var scratchFlyToDestination = new Cartesian3();
var newOptions = {
  destination: undefined,
  heading: undefined,
  pitch: undefined,
  roll: undefined,
  duration: undefined,
  complete: undefined,
  cancel: undefined,
  endTransform: undefined,
  maximumHeight: undefined,
  easingFunction: undefined,
};

/**
 * Cancels the current camera flight and leaves the camera at its current location.
 * If no flight is in progress, this this function does nothing.
 */
Camera.prototype.cancelFlight = function () {
  if (defined(this._currentFlight)) {
    this._currentFlight.cancelTween();
    this._currentFlight = undefined;
  }
};

/**
 * Completes the current camera flight and moves the camera immediately to its final destination.
 * If no flight is in progress, this this function does nothing.
 */
Camera.prototype.completeFlight = function () {
  if (defined(this._currentFlight)) {
    this._currentFlight.cancelTween();

    var options = {
      destination: undefined,
      orientation: {
        heading: undefined,
        pitch: undefined,
        roll: undefined,
      },
    };

    options.destination = newOptions.destination;
    options.orientation.heading = newOptions.heading;
    options.orientation.pitch = newOptions.pitch;
    options.orientation.roll = newOptions.roll;

    this.setView(options);

    if (defined(this._currentFlight.complete)) {
      this._currentFlight.complete();
    }

    this._currentFlight = undefined;
  }
};

/**
 * Flies the camera from its current position to a new position.
 *
 * @param {Object} options Object with the following properties:
 * @param {Cartesian3|Rectangle} options.destination The final position of the camera in WGS84 (world) coordinates or a rectangle that would be visible from a top-down view.
 * @param {Object} [options.orientation] An object that contains either direction and up properties or heading, pitch and roll properties. By default, the direction will point
 * towards the center of the frame in 3D and in the negative z direction in Columbus view. The up direction will point towards local north in 3D and in the positive
 * y direction in Columbus view.  Orientation is not used in 2D when in infinite scrolling mode.
 * @param {Number} [options.duration] The duration of the flight in seconds. If omitted, Cesium attempts to calculate an ideal duration based on the distance to be traveled by the flight.
 * @param {Camera.FlightCompleteCallback} [options.complete] The function to execute when the flight is complete.
 * @param {Camera.FlightCancelledCallback} [options.cancel] The function to execute if the flight is cancelled.
 * @param {Matrix4} [options.endTransform] Transform matrix representing the reference frame the camera will be in when the flight is completed.
 * @param {Number} [options.maximumHeight] The maximum height at the peak of the flight.
 * @param {Number} [options.pitchAdjustHeight] If camera flyes higher than that value, adjust pitch duiring the flight to look down, and keep Earth in viewport.
 * @param {Number} [options.flyOverLongitude] There are always two ways between 2 points on globe. This option force camera to choose fight direction to fly over that longitude.
 * @param {Number} [options.flyOverLongitudeWeight] Fly over the lon specifyed via flyOverLongitude only if that way is not longer than short way times flyOverLongitudeWeight.
 * @param {Boolean} [options.convert] Whether to convert the destination from world coordinates to scene coordinates (only relevant when not using 3D). Defaults to <code>true</code>.
 * @param {EasingFunction.Callback} [options.easingFunction] Controls how the time is interpolated over the duration of the flight.
 *
 * @exception {DeveloperError} If either direction or up is given, then both are required.
 *
 * @example
 * // 1. Fly to a position with a top-down view
 * viewer.camera.flyTo({
 *     destination : Cesium.Cartesian3.fromDegrees(-117.16, 32.71, 15000.0)
 * });
 *
 * // 2. Fly to a Rectangle with a top-down view
 * viewer.camera.flyTo({
 *     destination : Cesium.Rectangle.fromDegrees(west, south, east, north)
 * });
 *
 * // 3. Fly to a position with an orientation using unit vectors.
 * viewer.camera.flyTo({
 *     destination : Cesium.Cartesian3.fromDegrees(-122.19, 46.25, 5000.0),
 *     orientation : {
 *         direction : new Cesium.Cartesian3(-0.04231243104240401, -0.20123236049443421, -0.97862924300734),
 *         up : new Cesium.Cartesian3(-0.47934589305293746, -0.8553216253114552, 0.1966022179118339)
 *     }
 * });
 *
 * // 4. Fly to a position with an orientation using heading, pitch and roll.
 * viewer.camera.flyTo({
 *     destination : Cesium.Cartesian3.fromDegrees(-122.19, 46.25, 5000.0),
 *     orientation : {
 *         heading : Cesium.Math.toRadians(175.0),
 *         pitch : Cesium.Math.toRadians(-35.0),
 *         roll : 0.0
 *     }
 * });
 */
Camera.prototype.flyTo = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var destination = options.destination;
  //>>includeStart('debug', pragmas.debug);
  if (!defined(destination)) {
    throw new DeveloperError("destination is required.");
  }
  //>>includeEnd('debug');

  var mode = this._mode;
  if (mode === SceneMode.MORPHING) {
    return;
  }

  this.cancelFlight();

  var orientation = defaultValue(
    options.orientation,
    defaultValue.EMPTY_OBJECT
  );
  if (defined(orientation.direction)) {
    orientation = directionUpToHeadingPitchRoll(
      this,
      destination,
      orientation,
      scratchSetViewOptions.orientation
    );
  }

  if (defined(options.duration) && options.duration <= 0.0) {
    var setViewOptions = scratchSetViewOptions;
    setViewOptions.destination = options.destination;
    setViewOptions.orientation.heading = orientation.heading;
    setViewOptions.orientation.pitch = orientation.pitch;
    setViewOptions.orientation.roll = orientation.roll;
    setViewOptions.convert = options.convert;
    setViewOptions.endTransform = options.endTransform;
    this.setView(setViewOptions);
    if (typeof options.complete === "function") {
      options.complete();
    }
    return;
  }

  var isRectangle = defined(destination.west);
  if (isRectangle) {
    destination = this.getRectangleCameraCoordinates(
      destination,
      scratchFlyToDestination
    );
  }

  var that = this;
  var flightTween;

  newOptions.destination = destination;
  newOptions.heading = orientation.heading;
  newOptions.pitch = orientation.pitch;
  newOptions.roll = orientation.roll;
  newOptions.duration = options.duration;
  newOptions.complete = function () {
    if (flightTween === that._currentFlight) {
      that._currentFlight = undefined;
    }
    if (defined(options.complete)) {
      options.complete();
    }
  };
  newOptions.cancel = options.cancel;
  newOptions.endTransform = options.endTransform;
  newOptions.convert = isRectangle ? false : options.convert;
  newOptions.maximumHeight = options.maximumHeight;
  newOptions.pitchAdjustHeight = options.pitchAdjustHeight;
  newOptions.flyOverLongitude = options.flyOverLongitude;
  newOptions.flyOverLongitudeWeight = options.flyOverLongitudeWeight;
  newOptions.easingFunction = options.easingFunction;

  var scene = this._scene;
  var tweenOptions = CameraFlightPath.createTween(scene, newOptions);
  // If the camera doesn't actually need to go anywhere, duration
  // will be 0 and we can just complete the current flight.
  if (tweenOptions.duration === 0) {
    if (typeof tweenOptions.complete === "function") {
      tweenOptions.complete();
    }
    return;
  }
  flightTween = scene.tweens.add(tweenOptions);
  this._currentFlight = flightTween;

  // Save the final destination view information for the PRELOAD_FLIGHT pass.
  var preloadFlightCamera = this._scene.preloadFlightCamera;
  if (this._mode !== SceneMode.SCENE2D) {
    if (!defined(preloadFlightCamera)) {
      preloadFlightCamera = Camera.clone(this);
    }
    preloadFlightCamera.setView({
      destination: destination,
      orientation: orientation,
    });

    this._scene.preloadFlightCullingVolume = preloadFlightCamera.frustum.computeCullingVolume(
      preloadFlightCamera.positionWC,
      preloadFlightCamera.directionWC,
      preloadFlightCamera.upWC
    );
  }
};

function distanceToBoundingSphere3D(camera, radius) {
  var frustum = camera.frustum;
  var tanPhi = Math.tan(frustum.fovy * 0.5);
  var tanTheta = frustum.aspectRatio * tanPhi;
  return Math.max(radius / tanTheta, radius / tanPhi);
}

function distanceToBoundingSphere2D(camera, radius) {
  var frustum = camera.frustum;
  if (defined(frustum._offCenterFrustum)) {
    frustum = frustum._offCenterFrustum;
  }

  var right, top;
  var ratio = frustum.right / frustum.top;
  var heightRatio = radius * ratio;
  if (radius > heightRatio) {
    right = radius;
    top = right / ratio;
  } else {
    top = radius;
    right = heightRatio;
  }

  return Math.max(right, top) * 1.5;
}

var MINIMUM_ZOOM = 100.0;

function adjustBoundingSphereOffset(camera, boundingSphere, offset) {
  offset = HeadingPitchRange.clone(
    defined(offset) ? offset : Camera.DEFAULT_OFFSET
  );

  var minimumZoom =
    camera._scene.screenSpaceCameraController.minimumZoomDistance;
  var maximumZoom =
    camera._scene.screenSpaceCameraController.maximumZoomDistance;
  var range = offset.range;
  if (!defined(range) || range === 0.0) {
    var radius = boundingSphere.radius;
    if (radius === 0.0) {
      offset.range = MINIMUM_ZOOM;
    } else if (
      camera.frustum instanceof OrthographicFrustum ||
      camera._mode === SceneMode.SCENE2D
    ) {
      offset.range = distanceToBoundingSphere2D(camera, radius);
    } else {
      offset.range = distanceToBoundingSphere3D(camera, radius);
    }
    offset.range = CesiumMath.clamp(offset.range, minimumZoom, maximumZoom);
  }

  return offset;
}

/**
 * Sets the camera so that the current view contains the provided bounding sphere.
 *
 * <p>The offset is heading/pitch/range in the local east-north-up reference frame centered at the center of the bounding sphere.
 * The heading and the pitch angles are defined in the local east-north-up reference frame.
 * The heading is the angle from y axis and increasing towards the x axis. Pitch is the rotation from the xy-plane. Positive pitch
 * angles are below the plane. Negative pitch angles are above the plane. The range is the distance from the center. If the range is
 * zero, a range will be computed such that the whole bounding sphere is visible.</p>
 *
 * <p>In 2D, there must be a top down view. The camera will be placed above the target looking down. The height above the
 * target will be the range. The heading will be determined from the offset. If the heading cannot be
 * determined from the offset, the heading will be north.</p>
 *
 * @param {BoundingSphere} boundingSphere The bounding sphere to view, in world coordinates.
 * @param {HeadingPitchRange} [offset] The offset from the target in the local east-north-up reference frame centered at the target.
 *
 * @exception {DeveloperError} viewBoundingSphere is not supported while morphing.
 */
Camera.prototype.viewBoundingSphere = function (boundingSphere, offset) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(boundingSphere)) {
    throw new DeveloperError("boundingSphere is required.");
  }

  if (this._mode === SceneMode.MORPHING) {
    throw new DeveloperError(
      "viewBoundingSphere is not supported while morphing."
    );
  }
  //>>includeEnd('debug');

  offset = adjustBoundingSphereOffset(this, boundingSphere, offset);
  this.lookAt(boundingSphere.center, offset);
};

var scratchflyToBoundingSphereTransform = new Matrix4();
var scratchflyToBoundingSphereDestination = new Cartesian3();
var scratchflyToBoundingSphereDirection = new Cartesian3();
var scratchflyToBoundingSphereUp = new Cartesian3();
var scratchflyToBoundingSphereRight = new Cartesian3();
var scratchFlyToBoundingSphereCart4 = new Cartesian4();
var scratchFlyToBoundingSphereQuaternion = new Quaternion();
var scratchFlyToBoundingSphereMatrix3 = new Matrix3();

/**
 * Flies the camera to a location where the current view contains the provided bounding sphere.
 *
 * <p> The offset is heading/pitch/range in the local east-north-up reference frame centered at the center of the bounding sphere.
 * The heading and the pitch angles are defined in the local east-north-up reference frame.
 * The heading is the angle from y axis and increasing towards the x axis. Pitch is the rotation from the xy-plane. Positive pitch
 * angles are below the plane. Negative pitch angles are above the plane. The range is the distance from the center. If the range is
 * zero, a range will be computed such that the whole bounding sphere is visible.</p>
 *
 * <p>In 2D and Columbus View, there must be a top down view. The camera will be placed above the target looking down. The height above the
 * target will be the range. The heading will be aligned to local north.</p>
 *
 * @param {BoundingSphere} boundingSphere The bounding sphere to view, in world coordinates.
 * @param {Object} [options] Object with the following properties:
 * @param {Number} [options.duration] The duration of the flight in seconds. If omitted, Cesium attempts to calculate an ideal duration based on the distance to be traveled by the flight.
 * @param {HeadingPitchRange} [options.offset] The offset from the target in the local east-north-up reference frame centered at the target.
 * @param {Camera.FlightCompleteCallback} [options.complete] The function to execute when the flight is complete.
 * @param {Camera.FlightCancelledCallback} [options.cancel] The function to execute if the flight is cancelled.
 * @param {Matrix4} [options.endTransform] Transform matrix representing the reference frame the camera will be in when the flight is completed.
 * @param {Number} [options.maximumHeight] The maximum height at the peak of the flight.
 * @param {Number} [options.pitchAdjustHeight] If camera flyes higher than that value, adjust pitch duiring the flight to look down, and keep Earth in viewport.
 * @param {Number} [options.flyOverLongitude] There are always two ways between 2 points on globe. This option force camera to choose fight direction to fly over that longitude.
 * @param {Number} [options.flyOverLongitudeWeight] Fly over the lon specifyed via flyOverLongitude only if that way is not longer than short way times flyOverLongitudeWeight.
 * @param {EasingFunction.Callback} [options.easingFunction] Controls how the time is interpolated over the duration of the flight.
 */
Camera.prototype.flyToBoundingSphere = function (boundingSphere, options) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(boundingSphere)) {
    throw new DeveloperError("boundingSphere is required.");
  }
  //>>includeEnd('debug');

  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var scene2D =
    this._mode === SceneMode.SCENE2D || this._mode === SceneMode.COLUMBUS_VIEW;
  this._setTransform(Matrix4.IDENTITY);
  var offset = adjustBoundingSphereOffset(this, boundingSphere, options.offset);

  var position;
  if (scene2D) {
    position = Cartesian3.multiplyByScalar(
      Cartesian3.UNIT_Z,
      offset.range,
      scratchflyToBoundingSphereDestination
    );
  } else {
    position = offsetFromHeadingPitchRange(
      offset.heading,
      offset.pitch,
      offset.range
    );
  }

  var transform = Transforms.eastNorthUpToFixedFrame(
    boundingSphere.center,
    Ellipsoid.WGS84,
    scratchflyToBoundingSphereTransform
  );
  Matrix4.multiplyByPoint(transform, position, position);

  var direction;
  var up;

  if (!scene2D) {
    direction = Cartesian3.subtract(
      boundingSphere.center,
      position,
      scratchflyToBoundingSphereDirection
    );
    Cartesian3.normalize(direction, direction);

    up = Matrix4.multiplyByPointAsVector(
      transform,
      Cartesian3.UNIT_Z,
      scratchflyToBoundingSphereUp
    );
    if (1.0 - Math.abs(Cartesian3.dot(direction, up)) < CesiumMath.EPSILON6) {
      var rotateQuat = Quaternion.fromAxisAngle(
        direction,
        offset.heading,
        scratchFlyToBoundingSphereQuaternion
      );
      var rotation = Matrix3.fromQuaternion(
        rotateQuat,
        scratchFlyToBoundingSphereMatrix3
      );

      Cartesian3.fromCartesian4(
        Matrix4.getColumn(transform, 1, scratchFlyToBoundingSphereCart4),
        up
      );
      Matrix3.multiplyByVector(rotation, up, up);
    }

    var right = Cartesian3.cross(
      direction,
      up,
      scratchflyToBoundingSphereRight
    );
    Cartesian3.cross(right, direction, up);
    Cartesian3.normalize(up, up);
  }

  this.flyTo({
    destination: position,
    orientation: {
      direction: direction,
      up: up,
    },
    duration: options.duration,
    complete: options.complete,
    cancel: options.cancel,
    endTransform: options.endTransform,
    maximumHeight: options.maximumHeight,
    easingFunction: options.easingFunction,
    flyOverLongitude: options.flyOverLongitude,
    flyOverLongitudeWeight: options.flyOverLongitudeWeight,
    pitchAdjustHeight: options.pitchAdjustHeight,
  });
};

var scratchCartesian3_1 = new Cartesian3();
var scratchCartesian3_2 = new Cartesian3();
var scratchCartesian3_3 = new Cartesian3();
var scratchCartesian3_4 = new Cartesian3();
var horizonPoints = [
  new Cartesian3(),
  new Cartesian3(),
  new Cartesian3(),
  new Cartesian3(),
];

function computeHorizonQuad(camera, ellipsoid) {
  var radii = ellipsoid.radii;
  var p = camera.positionWC;

  // Find the corresponding position in the scaled space of the ellipsoid.
  var q = Cartesian3.multiplyComponents(
    ellipsoid.oneOverRadii,
    p,
    scratchCartesian3_1
  );

  var qMagnitude = Cartesian3.magnitude(q);
  var qUnit = Cartesian3.normalize(q, scratchCartesian3_2);

  // Determine the east and north directions at q.
  var eUnit;
  var nUnit;
  if (
    Cartesian3.equalsEpsilon(qUnit, Cartesian3.UNIT_Z, CesiumMath.EPSILON10)
  ) {
    eUnit = new Cartesian3(0, 1, 0);
    nUnit = new Cartesian3(0, 0, 1);
  } else {
    eUnit = Cartesian3.normalize(
      Cartesian3.cross(Cartesian3.UNIT_Z, qUnit, scratchCartesian3_3),
      scratchCartesian3_3
    );
    nUnit = Cartesian3.normalize(
      Cartesian3.cross(qUnit, eUnit, scratchCartesian3_4),
      scratchCartesian3_4
    );
  }

  // Determine the radius of the 'limb' of the ellipsoid.
  var wMagnitude = Math.sqrt(Cartesian3.magnitudeSquared(q) - 1.0);

  // Compute the center and offsets.
  var center = Cartesian3.multiplyByScalar(
    qUnit,
    1.0 / qMagnitude,
    scratchCartesian3_1
  );
  var scalar = wMagnitude / qMagnitude;
  var eastOffset = Cartesian3.multiplyByScalar(
    eUnit,
    scalar,
    scratchCartesian3_2
  );
  var northOffset = Cartesian3.multiplyByScalar(
    nUnit,
    scalar,
    scratchCartesian3_3
  );

  // A conservative measure for the longitudes would be to use the min/max longitudes of the bounding frustum.
  var upperLeft = Cartesian3.add(center, northOffset, horizonPoints[0]);
  Cartesian3.subtract(upperLeft, eastOffset, upperLeft);
  Cartesian3.multiplyComponents(radii, upperLeft, upperLeft);

  var lowerLeft = Cartesian3.subtract(center, northOffset, horizonPoints[1]);
  Cartesian3.subtract(lowerLeft, eastOffset, lowerLeft);
  Cartesian3.multiplyComponents(radii, lowerLeft, lowerLeft);

  var lowerRight = Cartesian3.subtract(center, northOffset, horizonPoints[2]);
  Cartesian3.add(lowerRight, eastOffset, lowerRight);
  Cartesian3.multiplyComponents(radii, lowerRight, lowerRight);

  var upperRight = Cartesian3.add(center, northOffset, horizonPoints[3]);
  Cartesian3.add(upperRight, eastOffset, upperRight);
  Cartesian3.multiplyComponents(radii, upperRight, upperRight);

  return horizonPoints;
}

var scratchPickCartesian2 = new Cartesian2();
var scratchRectCartesian = new Cartesian3();
var cartoArray = [
  new Cartographic(),
  new Cartographic(),
  new Cartographic(),
  new Cartographic(),
];
function addToResult(x, y, index, camera, ellipsoid, computedHorizonQuad) {
  scratchPickCartesian2.x = x;
  scratchPickCartesian2.y = y;
  var r = camera.pickEllipsoid(
    scratchPickCartesian2,
    ellipsoid,
    scratchRectCartesian
  );
  if (defined(r)) {
    cartoArray[index] = ellipsoid.cartesianToCartographic(r, cartoArray[index]);
    return 1;
  }
  cartoArray[index] = ellipsoid.cartesianToCartographic(
    computedHorizonQuad[index],
    cartoArray[index]
  );
  return 0;
}
/**
 * Computes the approximate visible rectangle on the ellipsoid.
 *
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid that you want to know the visible region.
 * @param {Rectangle} [result] The rectangle in which to store the result
 *
 * @returns {Rectangle|undefined} The visible rectangle or undefined if the ellipsoid isn't visible at all.
 */
Camera.prototype.computeViewRectangle = function (ellipsoid, result) {
  ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);
  var cullingVolume = this.frustum.computeCullingVolume(
    this.positionWC,
    this.directionWC,
    this.upWC
  );
  var boundingSphere = new BoundingSphere(
    Cartesian3.ZERO,
    ellipsoid.maximumRadius
  );
  var visibility = cullingVolume.computeVisibility(boundingSphere);
  if (visibility === Intersect.OUTSIDE) {
    return undefined;
  }

  var canvas = this._scene.canvas;
  var width = canvas.clientWidth;
  var height = canvas.clientHeight;

  var successfulPickCount = 0;

  var computedHorizonQuad = computeHorizonQuad(this, ellipsoid);

  successfulPickCount += addToResult(
    0,
    0,
    0,
    this,
    ellipsoid,
    computedHorizonQuad
  );
  successfulPickCount += addToResult(
    0,
    height,
    1,
    this,
    ellipsoid,
    computedHorizonQuad
  );
  successfulPickCount += addToResult(
    width,
    height,
    2,
    this,
    ellipsoid,
    computedHorizonQuad
  );
  successfulPickCount += addToResult(
    width,
    0,
    3,
    this,
    ellipsoid,
    computedHorizonQuad
  );

  if (successfulPickCount < 2) {
    // If we have space non-globe in 3 or 4 corners then return the whole globe
    return Rectangle.MAX_VALUE;
  }

  result = Rectangle.fromCartographicArray(cartoArray, result);

  // Detect if we go over the poles
  var distance = 0;
  var lastLon = cartoArray[3].longitude;
  for (var i = 0; i < 4; ++i) {
    var lon = cartoArray[i].longitude;
    var diff = Math.abs(lon - lastLon);
    if (diff > CesiumMath.PI) {
      // Crossed the dateline
      distance += CesiumMath.TWO_PI - diff;
    } else {
      distance += diff;
    }

    lastLon = lon;
  }

  // We are over one of the poles so adjust the rectangle accordingly
  if (
    CesiumMath.equalsEpsilon(
      Math.abs(distance),
      CesiumMath.TWO_PI,
      CesiumMath.EPSILON9
    )
  ) {
    result.west = -CesiumMath.PI;
    result.east = CesiumMath.PI;
    if (cartoArray[0].latitude >= 0.0) {
      result.north = CesiumMath.PI_OVER_TWO;
    } else {
      result.south = -CesiumMath.PI_OVER_TWO;
    }
  }

  return result;
};

/**
 * Switches the frustum/projection to perspective.
 *
 * This function is a no-op in 2D which must always be orthographic.
 */
Camera.prototype.switchToPerspectiveFrustum = function () {
  if (
    this._mode === SceneMode.SCENE2D ||
    this.frustum instanceof PerspectiveFrustum
  ) {
    return;
  }

  var scene = this._scene;
  this.frustum = new PerspectiveFrustum();
  this.frustum.aspectRatio =
    scene.drawingBufferWidth / scene.drawingBufferHeight;
  this.frustum.fov = CesiumMath.toRadians(60.0);
};

/**
 * Switches the frustum/projection to orthographic.
 *
 * This function is a no-op in 2D which will always be orthographic.
 */
Camera.prototype.switchToOrthographicFrustum = function () {
  if (
    this._mode === SceneMode.SCENE2D ||
    this.frustum instanceof OrthographicFrustum
  ) {
    return;
  }

  // This must be called before changing the frustum because it uses the previous
  // frustum to reconstruct the world space position from the depth buffer.
  var frustumWidth = calculateOrthographicFrustumWidth(this);

  var scene = this._scene;
  this.frustum = new OrthographicFrustum();
  this.frustum.aspectRatio =
    scene.drawingBufferWidth / scene.drawingBufferHeight;
  this.frustum.width = frustumWidth;
};

/**
 * @private
 */
Camera.clone = function (camera, result) {
  if (!defined(result)) {
    result = new Camera(camera._scene);
  }

  Cartesian3.clone(camera.position, result.position);
  Cartesian3.clone(camera.direction, result.direction);
  Cartesian3.clone(camera.up, result.up);
  Cartesian3.clone(camera.right, result.right);
  Matrix4.clone(camera._transform, result.transform);
  result._transformChanged = true;
  result.frustum = camera.frustum.clone();

  return result;
};

/**
 * A function that will execute when a flight completes.
 * @callback Camera.FlightCompleteCallback
 */

/**
 * A function that will execute when a flight is cancelled.
 * @callback Camera.FlightCancelledCallback
 */
export default Camera;
