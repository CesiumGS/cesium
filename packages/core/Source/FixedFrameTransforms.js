// @ts-check

import Cartesian2 from "./Cartesian2.js";
import Cartesian3 from "./Cartesian3.js";
import Cartesian4 from "./Cartesian4.js";
import Cartographic from "./Cartographic.js";
import Check from "./Check.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import Ellipsoid from "./Ellipsoid.js";
import HeadingPitchRoll from "./HeadingPitchRoll.js";
import CesiumMath from "./Math.js";
import Matrix3 from "./Matrix3.js";
import Matrix4 from "./Matrix4.js";
import Quaternion from "./Quaternion.js";

/** @import MapProjection from "./MapProjection.js"; */

/**
 * Contains functions for transforming positions to various reference frames.
 *
 * @namespace FixedFrameTransforms
 *
 * @private
 */
const FixedFrameTransforms = {};

/**
 * The name of an axis in a local reference frame centered at a point on the ellipsoid:
 * 'east', 'north', 'up', 'west', 'south', or 'down'.
 *
 * @typedef {'east'|'north'|'up'|'west'|'south'|'down'} LocalFrameAxis
 */

/**
 * Computes a 4x4 transformation matrix from a reference frame
 * centered at the provided origin to the provided ellipsoid's fixed reference frame.
 * @callback LocalFrameToFixedFrame
 * @param {Cartesian3} origin The center point of the local reference frame.
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.default] The ellipsoid whose fixed frame is used in the transformation.
 * @param {Matrix4} [result] The object onto which to store the result.
 * @returns {Matrix4} The modified result parameter or a new Matrix4 instance if none was provided.
 */

/** @type {Record<LocalFrameAxis, Partial<Record<LocalFrameAxis, LocalFrameAxis>>>} */
const vectorProductLocalFrame = {
  up: {
    south: "east",
    north: "west",
    west: "south",
    east: "north",
  },
  down: {
    south: "west",
    north: "east",
    west: "north",
    east: "south",
  },
  south: {
    up: "west",
    down: "east",
    west: "down",
    east: "up",
  },
  north: {
    up: "east",
    down: "west",
    west: "up",
    east: "down",
  },
  west: {
    up: "north",
    down: "south",
    north: "down",
    south: "up",
  },
  east: {
    up: "south",
    down: "north",
    north: "up",
    south: "down",
  },
};

const degeneratePositionLocalFrame = {
  north: [-1, 0, 0],
  east: [0, 1, 0],
  up: [0, 0, 1],
  south: [1, 0, 0],
  west: [0, -1, 0],
  down: [0, 0, -1],
};

/** @type {Record<string, LocalFrameToFixedFrame>} */
const localFrameToFixedFrameCache = {};

const scratchCalculateCartesian = {
  east: new Cartesian3(),
  north: new Cartesian3(),
  up: new Cartesian3(),
  west: new Cartesian3(),
  south: new Cartesian3(),
  down: new Cartesian3(),
};
let scratchFirstCartesian = new Cartesian3();
let scratchSecondCartesian = new Cartesian3();
let scratchThirdCartesian = new Cartesian3();
/**
 * Generates a function that computes a 4x4 transformation matrix from a reference frame
 * centered at the provided origin to the provided ellipsoid's fixed reference frame.
 * @param  {LocalFrameAxis} firstAxis  name of the first axis of the local reference frame. Must be
 *  'east', 'north', 'up', 'west', 'south' or 'down'.
 * @param  {LocalFrameAxis} secondAxis  name of the second axis of the local reference frame. Must be
 *  'east', 'north', 'up', 'west', 'south' or 'down'.
 * @return {LocalFrameToFixedFrame} The function that will computes a
 * 4x4 transformation matrix from a reference frame, with first axis and second axis compliant with the parameters,
 */
FixedFrameTransforms.localFrameToFixedFrameGenerator = function (
  firstAxis,
  secondAxis,
) {
  if (
    !vectorProductLocalFrame.hasOwnProperty(firstAxis) ||
    !vectorProductLocalFrame[firstAxis].hasOwnProperty(secondAxis)
  ) {
    throw new DeveloperError(
      "firstAxis and secondAxis must be east, north, up, west, south or down.",
    );
  }
  const thirdAxis = vectorProductLocalFrame[firstAxis][secondAxis];

  const hashAxis = firstAxis + secondAxis;
  if (defined(localFrameToFixedFrameCache[hashAxis])) {
    return localFrameToFixedFrameCache[hashAxis];
  }

  /** @type {LocalFrameToFixedFrame} */
  const resultat = function (origin, ellipsoid, result) {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(origin)) {
      throw new DeveloperError("origin is required.");
    }
    if (isNaN(origin.x) || isNaN(origin.y) || isNaN(origin.z)) {
      throw new DeveloperError("origin has a NaN component");
    }
    //>>includeEnd('debug');
    if (!defined(result)) {
      result = new Matrix4();
    }
    if (
      Cartesian3.equalsEpsilon(origin, Cartesian3.ZERO, CesiumMath.EPSILON14)
    ) {
      // If x, y, and z are zero, use the degenerate local frame, which is a special case
      Cartesian3.unpack(
        degeneratePositionLocalFrame[firstAxis],
        0,
        scratchFirstCartesian,
      );
      Cartesian3.unpack(
        degeneratePositionLocalFrame[secondAxis],
        0,
        scratchSecondCartesian,
      );
      Cartesian3.unpack(
        degeneratePositionLocalFrame[thirdAxis],
        0,
        scratchThirdCartesian,
      );
    } else if (
      CesiumMath.equalsEpsilon(origin.x, 0.0, CesiumMath.EPSILON14) &&
      CesiumMath.equalsEpsilon(origin.y, 0.0, CesiumMath.EPSILON14)
    ) {
      // If x and y are zero, assume origin is at a pole, which is a special case.
      const sign = CesiumMath.sign(origin.z);

      Cartesian3.unpack(
        degeneratePositionLocalFrame[firstAxis],
        0,
        scratchFirstCartesian,
      );
      if (firstAxis !== "east" && firstAxis !== "west") {
        Cartesian3.multiplyByScalar(
          scratchFirstCartesian,
          sign,
          scratchFirstCartesian,
        );
      }

      Cartesian3.unpack(
        degeneratePositionLocalFrame[secondAxis],
        0,
        scratchSecondCartesian,
      );
      if (secondAxis !== "east" && secondAxis !== "west") {
        Cartesian3.multiplyByScalar(
          scratchSecondCartesian,
          sign,
          scratchSecondCartesian,
        );
      }

      Cartesian3.unpack(
        degeneratePositionLocalFrame[thirdAxis],
        0,
        scratchThirdCartesian,
      );
      if (thirdAxis !== "east" && thirdAxis !== "west") {
        Cartesian3.multiplyByScalar(
          scratchThirdCartesian,
          sign,
          scratchThirdCartesian,
        );
      }
    } else {
      ellipsoid = ellipsoid ?? Ellipsoid.default;
      ellipsoid.geodeticSurfaceNormal(origin, scratchCalculateCartesian.up);

      const up = scratchCalculateCartesian.up;
      const east = scratchCalculateCartesian.east;
      east.x = -origin.y;
      east.y = origin.x;
      east.z = 0.0;
      Cartesian3.normalize(east, scratchCalculateCartesian.east);
      Cartesian3.cross(up, east, scratchCalculateCartesian.north);

      Cartesian3.multiplyByScalar(
        scratchCalculateCartesian.up,
        -1,
        scratchCalculateCartesian.down,
      );
      Cartesian3.multiplyByScalar(
        scratchCalculateCartesian.east,
        -1,
        scratchCalculateCartesian.west,
      );
      Cartesian3.multiplyByScalar(
        scratchCalculateCartesian.north,
        -1,
        scratchCalculateCartesian.south,
      );

      scratchFirstCartesian = scratchCalculateCartesian[firstAxis];
      scratchSecondCartesian = scratchCalculateCartesian[secondAxis];
      scratchThirdCartesian = scratchCalculateCartesian[thirdAxis];
    }
    result[0] = scratchFirstCartesian.x;
    result[1] = scratchFirstCartesian.y;
    result[2] = scratchFirstCartesian.z;
    result[3] = 0.0;
    result[4] = scratchSecondCartesian.x;
    result[5] = scratchSecondCartesian.y;
    result[6] = scratchSecondCartesian.z;
    result[7] = 0.0;
    result[8] = scratchThirdCartesian.x;
    result[9] = scratchThirdCartesian.y;
    result[10] = scratchThirdCartesian.z;
    result[11] = 0.0;
    result[12] = origin.x;
    result[13] = origin.y;
    result[14] = origin.z;
    result[15] = 1.0;
    return result;
  };
  localFrameToFixedFrameCache[hashAxis] = resultat;
  return resultat;
};

/**
 * Computes a 4x4 transformation matrix from a reference frame with an east-north-up axes
 * centered at the provided origin to the provided ellipsoid's fixed reference frame.
 * The local axes are defined as:
 * <ul>
 * <li>The <code>x</code> axis points in the local east direction.</li>
 * <li>The <code>y</code> axis points in the local north direction.</li>
 * <li>The <code>z</code> axis points in the direction of the ellipsoid surface normal which passes through the position.</li>
 * </ul>
 *
 * @function
 * @param {Cartesian3} origin The center point of the local reference frame.
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.default] The ellipsoid whose fixed frame is used in the transformation.
 * @param {Matrix4} [result] The object onto which to store the result.
 * @returns {Matrix4} The modified result parameter or a new Matrix4 instance if none was provided.
 *
 * @example
 * // Get the transform from local east-north-up at cartographic (0.0, 0.0) to Earth's fixed frame.
 * const center = Cesium.Cartesian3.fromDegrees(0.0, 0.0);
 * const transform = Cesium.Transforms.eastNorthUpToFixedFrame(center);
 */
FixedFrameTransforms.eastNorthUpToFixedFrame =
  FixedFrameTransforms.localFrameToFixedFrameGenerator("east", "north");

/**
 * Computes a 4x4 transformation matrix from a reference frame with an north-east-down axes
 * centered at the provided origin to the provided ellipsoid's fixed reference frame.
 * The local axes are defined as:
 * <ul>
 * <li>The <code>x</code> axis points in the local north direction.</li>
 * <li>The <code>y</code> axis points in the local east direction.</li>
 * <li>The <code>z</code> axis points in the opposite direction of the ellipsoid surface normal which passes through the position.</li>
 * </ul>
 *
 * @function
 * @param {Cartesian3} origin The center point of the local reference frame.
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.default] The ellipsoid whose fixed frame is used in the transformation.
 * @param {Matrix4} [result] The object onto which to store the result.
 * @returns {Matrix4} The modified result parameter or a new Matrix4 instance if none was provided.
 *
 * @example
 * // Get the transform from local north-east-down at cartographic (0.0, 0.0) to Earth's fixed frame.
 * const center = Cesium.Cartesian3.fromDegrees(0.0, 0.0);
 * const transform = Cesium.Transforms.northEastDownToFixedFrame(center);
 */
FixedFrameTransforms.northEastDownToFixedFrame =
  FixedFrameTransforms.localFrameToFixedFrameGenerator("north", "east");

/**
 * Computes a 4x4 transformation matrix from a reference frame with an north-up-east axes
 * centered at the provided origin to the provided ellipsoid's fixed reference frame.
 * The local axes are defined as:
 * <ul>
 * <li>The <code>x</code> axis points in the local north direction.</li>
 * <li>The <code>y</code> axis points in the direction of the ellipsoid surface normal which passes through the position.</li>
 * <li>The <code>z</code> axis points in the local east direction.</li>
 * </ul>
 *
 * @function
 * @param {Cartesian3} origin The center point of the local reference frame.
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.default] The ellipsoid whose fixed frame is used in the transformation.
 * @param {Matrix4} [result] The object onto which to store the result.
 * @returns {Matrix4} The modified result parameter or a new Matrix4 instance if none was provided.
 *
 * @example
 * // Get the transform from local north-up-east at cartographic (0.0, 0.0) to Earth's fixed frame.
 * const center = Cesium.Cartesian3.fromDegrees(0.0, 0.0);
 * const transform = Cesium.Transforms.northUpEastToFixedFrame(center);
 */
FixedFrameTransforms.northUpEastToFixedFrame =
  FixedFrameTransforms.localFrameToFixedFrameGenerator("north", "up");

/**
 * Computes a 4x4 transformation matrix from a reference frame with an north-west-up axes
 * centered at the provided origin to the provided ellipsoid's fixed reference frame.
 * The local axes are defined as:
 * <ul>
 * <li>The <code>x</code> axis points in the local north direction.</li>
 * <li>The <code>y</code> axis points in the local west direction.</li>
 * <li>The <code>z</code> axis points in the direction of the ellipsoid surface normal which passes through the position.</li>
 * </ul>
 *
 * @function
 * @param {Cartesian3} origin The center point of the local reference frame.
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.default] The ellipsoid whose fixed frame is used in the transformation.
 * @param {Matrix4} [result] The object onto which to store the result.
 * @returns {Matrix4} The modified result parameter or a new Matrix4 instance if none was provided.
 *
 * @example
 * // Get the transform from local north-West-Up at cartographic (0.0, 0.0) to Earth's fixed frame.
 * const center = Cesium.Cartesian3.fromDegrees(0.0, 0.0);
 * const transform = Cesium.Transforms.northWestUpToFixedFrame(center);
 */
FixedFrameTransforms.northWestUpToFixedFrame =
  FixedFrameTransforms.localFrameToFixedFrameGenerator("north", "west");

const scratchHPRQuaternion = new Quaternion();
const scratchScale = new Cartesian3(1.0, 1.0, 1.0);
const scratchHPRMatrix4 = new Matrix4();

/**
 * Computes a 4x4 transformation matrix from a reference frame with axes computed from the heading-pitch-roll angles
 * centered at the provided origin to the provided ellipsoid's fixed reference frame. Heading is the rotation from the local east
 * direction where a positive angle is increasing eastward. Pitch is the rotation from the local east-north plane. Positive pitch angles
 * are above the plane. Negative pitch angles are below the plane. Roll is the first rotation applied about the local east axis.
 *
 * @param {Cartesian3} origin The center point of the local reference frame.
 * @param {HeadingPitchRoll} headingPitchRoll The heading, pitch, and roll.
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.default] The ellipsoid whose fixed frame is used in the transformation.
 * @param {LocalFrameToFixedFrame} [fixedFrameTransform=FixedFrameTransforms.eastNorthUpToFixedFrame] A 4x4 transformation
 *  matrix from a reference frame to the provided ellipsoid's fixed reference frame
 * @param {Matrix4} [result] The object onto which to store the result.
 * @returns {Matrix4} The modified result parameter or a new Matrix4 instance if none was provided.
 *
 * @example
 * // Get the transform from local heading-pitch-roll at cartographic (0.0, 0.0) to Earth's fixed frame.
 * const center = Cesium.Cartesian3.fromDegrees(0.0, 0.0);
 * const heading = -Cesium.Math.PI_OVER_TWO;
 * const pitch = Cesium.Math.PI_OVER_FOUR;
 * const roll = 0.0;
 * const hpr = new Cesium.HeadingPitchRoll(heading, pitch, roll);
 * const transform = Cesium.Transforms.headingPitchRollToFixedFrame(center, hpr);
 */
FixedFrameTransforms.headingPitchRollToFixedFrame = function (
  origin,
  headingPitchRoll,
  ellipsoid,
  fixedFrameTransform,
  result,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("HeadingPitchRoll", headingPitchRoll);
  //>>includeEnd('debug');

  fixedFrameTransform =
    fixedFrameTransform ?? FixedFrameTransforms.eastNorthUpToFixedFrame;
  const hprQuaternion = Quaternion.fromHeadingPitchRoll(
    headingPitchRoll,
    scratchHPRQuaternion,
  );
  const hprMatrix = Matrix4.fromTranslationQuaternionRotationScale(
    Cartesian3.ZERO,
    hprQuaternion,
    scratchScale,
    scratchHPRMatrix4,
  );
  result = fixedFrameTransform(origin, ellipsoid, result);
  return Matrix4.multiply(result, hprMatrix, result);
};

const scratchENUMatrix4 = new Matrix4();
const scratchHPRMatrix3 = new Matrix3();

/**
 * Computes a quaternion from a reference frame with axes computed from the heading-pitch-roll angles
 * centered at the provided origin. Heading is the rotation from the local east
 * direction where a positive angle is increasing eastward. Pitch is the rotation from the local east-north plane. Positive pitch angles
 * are above the plane. Negative pitch angles are below the plane. Roll is the first rotation applied about the local east axis.
 *
 * @param {Cartesian3} origin The center point of the local reference frame.
 * @param {HeadingPitchRoll} headingPitchRoll The heading, pitch, and roll.
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.default] The ellipsoid whose fixed frame is used in the transformation.
 * @param {LocalFrameToFixedFrame} [fixedFrameTransform=FixedFrameTransforms.eastNorthUpToFixedFrame] A 4x4 transformation
 *  matrix from a reference frame to the provided ellipsoid's fixed reference frame
 * @param {Quaternion} [result] The object onto which to store the result.
 * @returns {Quaternion} The modified result parameter or a new Quaternion instance if none was provided.
 *
 * @example
 * // Get the quaternion from local heading-pitch-roll at cartographic (0.0, 0.0) to Earth's fixed frame.
 * const center = Cesium.Cartesian3.fromDegrees(0.0, 0.0);
 * const heading = -Cesium.Math.PI_OVER_TWO;
 * const pitch = Cesium.Math.PI_OVER_FOUR;
 * const roll = 0.0;
 * const hpr = new HeadingPitchRoll(heading, pitch, roll);
 * const quaternion = Cesium.Transforms.headingPitchRollQuaternion(center, hpr);
 */
FixedFrameTransforms.headingPitchRollQuaternion = function (
  origin,
  headingPitchRoll,
  ellipsoid,
  fixedFrameTransform,
  result,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("HeadingPitchRoll", headingPitchRoll);
  //>>includeEnd('debug');

  const transform = FixedFrameTransforms.headingPitchRollToFixedFrame(
    origin,
    headingPitchRoll,
    ellipsoid,
    fixedFrameTransform,
    scratchENUMatrix4,
  );
  const rotation = Matrix4.getMatrix3(transform, scratchHPRMatrix3);
  return Quaternion.fromRotationMatrix(rotation, result);
};

const noScale = new Cartesian3(1.0, 1.0, 1.0);
const hprCenterScratch = new Cartesian3();
const ffScratch = new Matrix4();
const hprTransformScratch = new Matrix4();
const hprRotationScratch = new Matrix3();
const hprQuaternionScratch = new Quaternion();
/**
 * Computes heading-pitch-roll angles from a transform in a particular reference frame. Heading is the rotation from the local east
 * direction where a positive angle is increasing eastward. Pitch is the rotation from the local east-north plane. Positive pitch angles
 * are above the plane. Negative pitch angles are below the plane. Roll is the first rotation applied about the local east axis.
 *
 * @param {Matrix4} transform The transform
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.default] The ellipsoid whose fixed frame is used in the transformation.
 * @param {LocalFrameToFixedFrame} [fixedFrameTransform=FixedFrameTransforms.eastNorthUpToFixedFrame] A 4x4 transformation
 *  matrix from a reference frame to the provided ellipsoid's fixed reference frame
 * @param {HeadingPitchRoll} [result] The object onto which to store the result.
 * @returns {HeadingPitchRoll} The modified result parameter or a new HeadingPitchRoll instance if none was provided.
 */
FixedFrameTransforms.fixedFrameToHeadingPitchRoll = function (
  transform,
  ellipsoid,
  fixedFrameTransform,
  result,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("transform", transform);
  //>>includeEnd('debug');

  ellipsoid = ellipsoid ?? Ellipsoid.default;
  fixedFrameTransform =
    fixedFrameTransform ?? FixedFrameTransforms.eastNorthUpToFixedFrame;
  if (!defined(result)) {
    result = new HeadingPitchRoll();
  }

  const center = Matrix4.getTranslation(transform, hprCenterScratch);
  if (Cartesian3.equals(center, Cartesian3.ZERO)) {
    result.heading = 0;
    result.pitch = 0;
    result.roll = 0;
    return result;
  }
  let toFixedFrame = Matrix4.inverseTransformation(
    fixedFrameTransform(center, ellipsoid, ffScratch),
    ffScratch,
  );
  let transformCopy = Matrix4.setScale(transform, noScale, hprTransformScratch);
  transformCopy = Matrix4.setTranslation(
    transformCopy,
    Cartesian3.ZERO,
    transformCopy,
  );

  toFixedFrame = Matrix4.multiply(toFixedFrame, transformCopy, toFixedFrame);
  let quaternionRotation = Quaternion.fromRotationMatrix(
    Matrix4.getMatrix3(toFixedFrame, hprRotationScratch),
    hprQuaternionScratch,
  );
  quaternionRotation = Quaternion.normalize(
    quaternionRotation,
    quaternionRotation,
  );

  return HeadingPitchRoll.fromQuaternion(quaternionRotation, result);
};

const pointToWindowCoordinatesTemp = new Cartesian4();

/**
 * Transform a point from model coordinates to window coordinates.
 *
 * @param {Matrix4} modelViewProjectionMatrix The 4x4 model-view-projection matrix.
 * @param {Matrix4} viewportTransformation The 4x4 viewport transformation.
 * @param {Cartesian3} point The point to transform.
 * @param {Cartesian2} [result] The object onto which to store the result.
 * @returns {Cartesian2} The modified result parameter or a new Cartesian2 instance if none was provided.
 */
FixedFrameTransforms.pointToWindowCoordinates = function (
  modelViewProjectionMatrix,
  viewportTransformation,
  point,
  result,
) {
  result = FixedFrameTransforms.pointToGLWindowCoordinates(
    modelViewProjectionMatrix,
    viewportTransformation,
    point,
    result,
  );
  result.y = 2.0 * viewportTransformation[5] - result.y;
  return result;
};

/**
 * @private
 * @param {Matrix4} modelViewProjectionMatrix The 4x4 model-view-projection matrix.
 * @param {Matrix4} viewportTransformation The 4x4 viewport transformation.
 * @param {Cartesian3} point The point to transform.
 * @param {Cartesian2} [result] The object onto which to store the result.
 * @returns {Cartesian2} The modified result parameter or a new Cartesian2 instance if none was provided.
 */
FixedFrameTransforms.pointToGLWindowCoordinates = function (
  modelViewProjectionMatrix,
  viewportTransformation,
  point,
  result,
) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(modelViewProjectionMatrix)) {
    throw new DeveloperError("modelViewProjectionMatrix is required.");
  }

  if (!defined(viewportTransformation)) {
    throw new DeveloperError("viewportTransformation is required.");
  }

  if (!defined(point)) {
    throw new DeveloperError("point is required.");
  }
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = new Cartesian2();
  }

  const tmp = pointToWindowCoordinatesTemp;

  Matrix4.multiplyByVector(
    modelViewProjectionMatrix,
    Cartesian4.fromElements(point.x, point.y, point.z, 1, tmp),
    tmp,
  );
  Cartesian4.multiplyByScalar(tmp, 1.0 / tmp.w, tmp);
  Matrix4.multiplyByVector(viewportTransformation, tmp, tmp);
  return Cartesian2.fromCartesian4(tmp, result);
};

const normalScratch = new Cartesian3();
const rightScratch = new Cartesian3();
const upScratch = new Cartesian3();

/**
 * Transform a position and velocity to a rotation matrix.
 *
 * @param {Cartesian3} position The position to transform.
 * @param {Cartesian3} velocity The velocity vector to transform.
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.default] The ellipsoid whose fixed frame is used in the transformation.
 * @param {Matrix3} [result] The object onto which to store the result.
 * @returns {Matrix3} The modified result parameter or a new Matrix3 instance if none was provided.
 */
FixedFrameTransforms.rotationMatrixFromPositionVelocity = function (
  position,
  velocity,
  ellipsoid,
  result,
) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(position)) {
    throw new DeveloperError("position is required.");
  }

  if (!defined(velocity)) {
    throw new DeveloperError("velocity is required.");
  }
  //>>includeEnd('debug');

  const normal = (ellipsoid ?? Ellipsoid.default).geodeticSurfaceNormal(
    position,
    normalScratch,
  );
  let right = Cartesian3.cross(velocity, normal, rightScratch);

  if (Cartesian3.equalsEpsilon(right, Cartesian3.ZERO, CesiumMath.EPSILON6)) {
    right = Cartesian3.clone(Cartesian3.UNIT_X, right);
  }

  const up = Cartesian3.cross(right, velocity, upScratch);
  Cartesian3.normalize(up, up);
  Cartesian3.cross(velocity, up, right);
  Cartesian3.negate(right, right);
  Cartesian3.normalize(right, right);

  if (!defined(result)) {
    result = new Matrix3();
  }

  result[0] = velocity.x;
  result[1] = velocity.y;
  result[2] = velocity.z;
  result[3] = right.x;
  result[4] = right.y;
  result[5] = right.z;
  result[6] = up.x;
  result[7] = up.y;
  result[8] = up.z;

  return result;
};

/**
 * An immutable matrix that swaps x, y, z for 2D.
 *
 * @type {Matrix4}
 * @constant
 * @private
 */
FixedFrameTransforms.SWIZZLE_3D_TO_2D_MATRIX = Object.freeze(
  new Matrix4(
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
    1.0,
  ),
);

const scratchCartographic = new Cartographic();
const scratchCartesian3Projection = new Cartesian3();
const scratchCenter = new Cartesian3();
const scratchRotation = new Matrix3();
const scratchFromENU = new Matrix4();
const scratchToENU = new Matrix4();

/**
 * @private
 * @param {MapProjection} projection The map projection.
 * @param {Matrix4} matrix The 3D transformation matrix.
 * @param {Matrix4} result The resulting 2D transformation matrix.
 */
FixedFrameTransforms.basisTo2D = function (projection, matrix, result) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(projection)) {
    throw new DeveloperError("projection is required.");
  }
  if (!defined(matrix)) {
    throw new DeveloperError("matrix is required.");
  }
  if (!defined(result)) {
    throw new DeveloperError("result is required.");
  }
  //>>includeEnd('debug');

  const rtcCenter = Matrix4.getTranslation(matrix, scratchCenter);
  const ellipsoid = projection.ellipsoid;

  let projectedPosition;
  if (Cartesian3.equals(rtcCenter, Cartesian3.ZERO)) {
    projectedPosition = Cartesian3.clone(
      Cartesian3.ZERO,
      scratchCartesian3Projection,
    );
  } else {
    // Get the 2D Center
    const cartographic = ellipsoid.cartesianToCartographic(
      rtcCenter,
      scratchCartographic,
    );

    projectedPosition = projection.project(
      cartographic,
      scratchCartesian3Projection,
    );
    Cartesian3.fromElements(
      projectedPosition.z,
      projectedPosition.x,
      projectedPosition.y,
      projectedPosition,
    );
  }

  // Assuming the instance are positioned on the ellipsoid, invert the ellipsoidal transform to get the local transform and then convert to 2D
  const fromENU = FixedFrameTransforms.eastNorthUpToFixedFrame(
    rtcCenter,
    ellipsoid,
    scratchFromENU,
  );
  const toENU = Matrix4.inverseTransformation(fromENU, scratchToENU);
  const rotation = Matrix4.getMatrix3(matrix, scratchRotation);
  const local = Matrix4.multiplyByMatrix3(toENU, rotation, result);
  Matrix4.multiply(FixedFrameTransforms.SWIZZLE_3D_TO_2D_MATRIX, local, result); // Swap x, y, z for 2D
  Matrix4.setTranslation(result, projectedPosition, result); // Use the projected center

  return result;
};

/**
 * @private
 * @param {MapProjection} projection The map projection.
 * @param {Cartesian3} center The center of the 2D projection.
 * @param {Matrix4} result The resulting 2D transformation matrix.
 */
FixedFrameTransforms.ellipsoidTo2DModelMatrix = function (
  projection,
  center,
  result,
) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(projection)) {
    throw new DeveloperError("projection is required.");
  }
  if (!defined(center)) {
    throw new DeveloperError("center is required.");
  }
  if (!defined(result)) {
    throw new DeveloperError("result is required.");
  }
  //>>includeEnd('debug');

  const ellipsoid = projection.ellipsoid;

  const fromENU = FixedFrameTransforms.eastNorthUpToFixedFrame(
    center,
    ellipsoid,
    scratchFromENU,
  );
  const toENU = Matrix4.inverseTransformation(fromENU, scratchToENU);

  const cartographic = ellipsoid.cartesianToCartographic(
    center,
    scratchCartographic,
  );
  const projectedPosition = projection.project(
    cartographic,
    scratchCartesian3Projection,
  );
  Cartesian3.fromElements(
    projectedPosition.z,
    projectedPosition.x,
    projectedPosition.y,
    projectedPosition,
  );

  const translation = Matrix4.fromTranslation(
    projectedPosition,
    scratchFromENU,
  );
  Matrix4.multiply(FixedFrameTransforms.SWIZZLE_3D_TO_2D_MATRIX, toENU, result);
  Matrix4.multiply(translation, result, result);

  return result;
};
export default FixedFrameTransforms;
