import Cartesian2 from "./Cartesian2.js";
import Cartesian3 from "./Cartesian3.js";
import Cartesian4 from "./Cartesian4.js";
import Cartographic from "./Cartographic.js";
import Check from "./Check.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import EarthOrientationParameters from "./EarthOrientationParameters.js";
import EarthOrientationParametersSample from "./EarthOrientationParametersSample.js";
import Ellipsoid from "./Ellipsoid.js";
import HeadingPitchRoll from "./HeadingPitchRoll.js";
import Iau2006XysData from "./Iau2006XysData.js";
import Iau2006XysSample from "./Iau2006XysSample.js";
import JulianDate from "./JulianDate.js";
import CesiumMath from "./Math.js";
import Matrix3 from "./Matrix3.js";
import Matrix4 from "./Matrix4.js";
import Quaternion from "./Quaternion.js";
import TimeConstants from "./TimeConstants.js";

/**
 * Contains functions for transforming positions to various reference frames.
 *
 * @namespace Transforms
 */
const Transforms = {};

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
 * @param  {String} firstAxis  name of the first axis of the local reference frame. Must be
 *  'east', 'north', 'up', 'west', 'south' or 'down'.
 * @param  {String} secondAxis  name of the second axis of the local reference frame. Must be
 *  'east', 'north', 'up', 'west', 'south' or 'down'.
 * @return {Transforms.LocalFrameToFixedFrame} The function that will computes a
 * 4x4 transformation matrix from a reference frame, with first axis and second axis compliant with the parameters,
 */
Transforms.localFrameToFixedFrameGenerator = function (firstAxis, secondAxis) {
  if (
    !vectorProductLocalFrame.hasOwnProperty(firstAxis) ||
    !vectorProductLocalFrame[firstAxis].hasOwnProperty(secondAxis)
  ) {
    throw new DeveloperError(
      "firstAxis and secondAxis must be east, north, up, west, south or down."
    );
  }
  const thirdAxis = vectorProductLocalFrame[firstAxis][secondAxis];

  /**
   * Computes a 4x4 transformation matrix from a reference frame
   * centered at the provided origin to the provided ellipsoid's fixed reference frame.
   * @callback Transforms.LocalFrameToFixedFrame
   * @param {Cartesian3} origin The center point of the local reference frame.
   * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid whose fixed frame is used in the transformation.
   * @param {Matrix4} [result] The object onto which to store the result.
   * @returns {Matrix4} The modified result parameter or a new Matrix4 instance if none was provided.
   */
  let resultat;
  const hashAxis = firstAxis + secondAxis;
  if (defined(localFrameToFixedFrameCache[hashAxis])) {
    resultat = localFrameToFixedFrameCache[hashAxis];
  } else {
    resultat = function (origin, ellipsoid, result) {
      //>>includeStart('debug', pragmas.debug);
      if (!defined(origin)) {
        throw new DeveloperError("origin is required.");
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
          scratchFirstCartesian
        );
        Cartesian3.unpack(
          degeneratePositionLocalFrame[secondAxis],
          0,
          scratchSecondCartesian
        );
        Cartesian3.unpack(
          degeneratePositionLocalFrame[thirdAxis],
          0,
          scratchThirdCartesian
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
          scratchFirstCartesian
        );
        if (firstAxis !== "east" && firstAxis !== "west") {
          Cartesian3.multiplyByScalar(
            scratchFirstCartesian,
            sign,
            scratchFirstCartesian
          );
        }

        Cartesian3.unpack(
          degeneratePositionLocalFrame[secondAxis],
          0,
          scratchSecondCartesian
        );
        if (secondAxis !== "east" && secondAxis !== "west") {
          Cartesian3.multiplyByScalar(
            scratchSecondCartesian,
            sign,
            scratchSecondCartesian
          );
        }

        Cartesian3.unpack(
          degeneratePositionLocalFrame[thirdAxis],
          0,
          scratchThirdCartesian
        );
        if (thirdAxis !== "east" && thirdAxis !== "west") {
          Cartesian3.multiplyByScalar(
            scratchThirdCartesian,
            sign,
            scratchThirdCartesian
          );
        }
      } else {
        ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);
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
          scratchCalculateCartesian.down
        );
        Cartesian3.multiplyByScalar(
          scratchCalculateCartesian.east,
          -1,
          scratchCalculateCartesian.west
        );
        Cartesian3.multiplyByScalar(
          scratchCalculateCartesian.north,
          -1,
          scratchCalculateCartesian.south
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
  }
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
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid whose fixed frame is used in the transformation.
 * @param {Matrix4} [result] The object onto which to store the result.
 * @returns {Matrix4} The modified result parameter or a new Matrix4 instance if none was provided.
 *
 * @example
 * // Get the transform from local east-north-up at cartographic (0.0, 0.0) to Earth's fixed frame.
 * const center = Cesium.Cartesian3.fromDegrees(0.0, 0.0);
 * const transform = Cesium.Transforms.eastNorthUpToFixedFrame(center);
 */
Transforms.eastNorthUpToFixedFrame = Transforms.localFrameToFixedFrameGenerator(
  "east",
  "north"
);

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
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid whose fixed frame is used in the transformation.
 * @param {Matrix4} [result] The object onto which to store the result.
 * @returns {Matrix4} The modified result parameter or a new Matrix4 instance if none was provided.
 *
 * @example
 * // Get the transform from local north-east-down at cartographic (0.0, 0.0) to Earth's fixed frame.
 * const center = Cesium.Cartesian3.fromDegrees(0.0, 0.0);
 * const transform = Cesium.Transforms.northEastDownToFixedFrame(center);
 */
Transforms.northEastDownToFixedFrame = Transforms.localFrameToFixedFrameGenerator(
  "north",
  "east"
);

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
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid whose fixed frame is used in the transformation.
 * @param {Matrix4} [result] The object onto which to store the result.
 * @returns {Matrix4} The modified result parameter or a new Matrix4 instance if none was provided.
 *
 * @example
 * // Get the transform from local north-up-east at cartographic (0.0, 0.0) to Earth's fixed frame.
 * const center = Cesium.Cartesian3.fromDegrees(0.0, 0.0);
 * const transform = Cesium.Transforms.northUpEastToFixedFrame(center);
 */
Transforms.northUpEastToFixedFrame = Transforms.localFrameToFixedFrameGenerator(
  "north",
  "up"
);

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
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid whose fixed frame is used in the transformation.
 * @param {Matrix4} [result] The object onto which to store the result.
 * @returns {Matrix4} The modified result parameter or a new Matrix4 instance if none was provided.
 *
 * @example
 * // Get the transform from local north-West-Up at cartographic (0.0, 0.0) to Earth's fixed frame.
 * const center = Cesium.Cartesian3.fromDegrees(0.0, 0.0);
 * const transform = Cesium.Transforms.northWestUpToFixedFrame(center);
 */
Transforms.northWestUpToFixedFrame = Transforms.localFrameToFixedFrameGenerator(
  "north",
  "west"
);

const scratchHPRQuaternion = new Quaternion();
const scratchScale = new Cartesian3(1.0, 1.0, 1.0);
const scratchHPRMatrix4 = new Matrix4();

/**
 * Computes a 4x4 transformation matrix from a reference frame with axes computed from the heading-pitch-roll angles
 * centered at the provided origin to the provided ellipsoid's fixed reference frame. Heading is the rotation from the local north
 * direction where a positive angle is increasing eastward. Pitch is the rotation from the local east-north plane. Positive pitch angles
 * are above the plane. Negative pitch angles are below the plane. Roll is the first rotation applied about the local east axis.
 *
 * @param {Cartesian3} origin The center point of the local reference frame.
 * @param {HeadingPitchRoll} headingPitchRoll The heading, pitch, and roll.
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid whose fixed frame is used in the transformation.
 * @param {Transforms.LocalFrameToFixedFrame} [fixedFrameTransform=Transforms.eastNorthUpToFixedFrame] A 4x4 transformation
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
Transforms.headingPitchRollToFixedFrame = function (
  origin,
  headingPitchRoll,
  ellipsoid,
  fixedFrameTransform,
  result
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("HeadingPitchRoll", headingPitchRoll);
  //>>includeEnd('debug');

  fixedFrameTransform = defaultValue(
    fixedFrameTransform,
    Transforms.eastNorthUpToFixedFrame
  );
  const hprQuaternion = Quaternion.fromHeadingPitchRoll(
    headingPitchRoll,
    scratchHPRQuaternion
  );
  const hprMatrix = Matrix4.fromTranslationQuaternionRotationScale(
    Cartesian3.ZERO,
    hprQuaternion,
    scratchScale,
    scratchHPRMatrix4
  );
  result = fixedFrameTransform(origin, ellipsoid, result);
  return Matrix4.multiply(result, hprMatrix, result);
};

const scratchENUMatrix4 = new Matrix4();
const scratchHPRMatrix3 = new Matrix3();

/**
 * Computes a quaternion from a reference frame with axes computed from the heading-pitch-roll angles
 * centered at the provided origin. Heading is the rotation from the local north
 * direction where a positive angle is increasing eastward. Pitch is the rotation from the local east-north plane. Positive pitch angles
 * are above the plane. Negative pitch angles are below the plane. Roll is the first rotation applied about the local east axis.
 *
 * @param {Cartesian3} origin The center point of the local reference frame.
 * @param {HeadingPitchRoll} headingPitchRoll The heading, pitch, and roll.
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid whose fixed frame is used in the transformation.
 * @param {Transforms.LocalFrameToFixedFrame} [fixedFrameTransform=Transforms.eastNorthUpToFixedFrame] A 4x4 transformation
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
Transforms.headingPitchRollQuaternion = function (
  origin,
  headingPitchRoll,
  ellipsoid,
  fixedFrameTransform,
  result
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("HeadingPitchRoll", headingPitchRoll);
  //>>includeEnd('debug');

  const transform = Transforms.headingPitchRollToFixedFrame(
    origin,
    headingPitchRoll,
    ellipsoid,
    fixedFrameTransform,
    scratchENUMatrix4
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
 * Computes heading-pitch-roll angles from a transform in a particular reference frame. Heading is the rotation from the local north
 * direction where a positive angle is increasing eastward. Pitch is the rotation from the local east-north plane. Positive pitch angles
 * are above the plane. Negative pitch angles are below the plane. Roll is the first rotation applied about the local east axis.
 *
 * @param {Matrix4} transform The transform
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid whose fixed frame is used in the transformation.
 * @param {Transforms.LocalFrameToFixedFrame} [fixedFrameTransform=Transforms.eastNorthUpToFixedFrame] A 4x4 transformation
 *  matrix from a reference frame to the provided ellipsoid's fixed reference frame
 * @param {HeadingPitchRoll} [result] The object onto which to store the result.
 * @returns {HeadingPitchRoll} The modified result parameter or a new HeadingPitchRoll instance if none was provided.
 */
Transforms.fixedFrameToHeadingPitchRoll = function (
  transform,
  ellipsoid,
  fixedFrameTransform,
  result
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("transform", transform);
  //>>includeEnd('debug');

  ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);
  fixedFrameTransform = defaultValue(
    fixedFrameTransform,
    Transforms.eastNorthUpToFixedFrame
  );
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
    ffScratch
  );
  let transformCopy = Matrix4.setScale(transform, noScale, hprTransformScratch);
  transformCopy = Matrix4.setTranslation(
    transformCopy,
    Cartesian3.ZERO,
    transformCopy
  );

  toFixedFrame = Matrix4.multiply(toFixedFrame, transformCopy, toFixedFrame);
  let quaternionRotation = Quaternion.fromRotationMatrix(
    Matrix4.getMatrix3(toFixedFrame, hprRotationScratch),
    hprQuaternionScratch
  );
  quaternionRotation = Quaternion.normalize(
    quaternionRotation,
    quaternionRotation
  );

  return HeadingPitchRoll.fromQuaternion(quaternionRotation, result);
};

const gmstConstant0 = 6 * 3600 + 41 * 60 + 50.54841;
const gmstConstant1 = 8640184.812866;
const gmstConstant2 = 0.093104;
const gmstConstant3 = -6.2e-6;
const rateCoef = 1.1772758384668e-19;
const wgs84WRPrecessing = 7.2921158553e-5;
const twoPiOverSecondsInDay = CesiumMath.TWO_PI / 86400.0;
let dateInUtc = new JulianDate();

/**
 * Computes a rotation matrix to transform a point or vector from True Equator Mean Equinox (TEME) axes to the
 * pseudo-fixed axes at a given time.  This method treats the UT1 time standard as equivalent to UTC.
 *
 * @param {JulianDate} date The time at which to compute the rotation matrix.
 * @param {Matrix3} [result] The object onto which to store the result.
 * @returns {Matrix3} The modified result parameter or a new Matrix3 instance if none was provided.
 *
 * @example
 * //Set the view to the inertial frame.
 * scene.postUpdate.addEventListener(function(scene, time) {
 *    const now = Cesium.JulianDate.now();
 *    const offset = Cesium.Matrix4.multiplyByPoint(camera.transform, camera.position, new Cesium.Cartesian3());
 *    const transform = Cesium.Matrix4.fromRotationTranslation(Cesium.Transforms.computeTemeToPseudoFixedMatrix(now));
 *    const inverseTransform = Cesium.Matrix4.inverseTransformation(transform, new Cesium.Matrix4());
 *    Cesium.Matrix4.multiplyByPoint(inverseTransform, offset, offset);
 *    camera.lookAtTransform(transform, offset);
 * });
 */
Transforms.computeTemeToPseudoFixedMatrix = function (date, result) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(date)) {
    throw new DeveloperError("date is required.");
  }
  //>>includeEnd('debug');

  // GMST is actually computed using UT1.  We're using UTC as an approximation of UT1.
  // We do not want to use the function like convertTaiToUtc in JulianDate because
  // we explicitly do not want to fail when inside the leap second.

  dateInUtc = JulianDate.addSeconds(
    date,
    -JulianDate.computeTaiMinusUtc(date),
    dateInUtc
  );
  const utcDayNumber = dateInUtc.dayNumber;
  const utcSecondsIntoDay = dateInUtc.secondsOfDay;

  let t;
  const diffDays = utcDayNumber - 2451545;
  if (utcSecondsIntoDay >= 43200.0) {
    t = (diffDays + 0.5) / TimeConstants.DAYS_PER_JULIAN_CENTURY;
  } else {
    t = (diffDays - 0.5) / TimeConstants.DAYS_PER_JULIAN_CENTURY;
  }

  const gmst0 =
    gmstConstant0 +
    t * (gmstConstant1 + t * (gmstConstant2 + t * gmstConstant3));
  const angle = (gmst0 * twoPiOverSecondsInDay) % CesiumMath.TWO_PI;
  const ratio = wgs84WRPrecessing + rateCoef * (utcDayNumber - 2451545.5);
  const secondsSinceMidnight =
    (utcSecondsIntoDay + TimeConstants.SECONDS_PER_DAY * 0.5) %
    TimeConstants.SECONDS_PER_DAY;
  const gha = angle + ratio * secondsSinceMidnight;
  const cosGha = Math.cos(gha);
  const sinGha = Math.sin(gha);

  if (!defined(result)) {
    return new Matrix3(
      cosGha,
      sinGha,
      0.0,
      -sinGha,
      cosGha,
      0.0,
      0.0,
      0.0,
      1.0
    );
  }
  result[0] = cosGha;
  result[1] = -sinGha;
  result[2] = 0.0;
  result[3] = sinGha;
  result[4] = cosGha;
  result[5] = 0.0;
  result[6] = 0.0;
  result[7] = 0.0;
  result[8] = 1.0;
  return result;
};

/**
 * The source of IAU 2006 XYS data, used for computing the transformation between the
 * Fixed and ICRF axes.
 * @type {Iau2006XysData}
 *
 * @see Transforms.computeIcrfToFixedMatrix
 * @see Transforms.computeFixedToIcrfMatrix
 *
 * @private
 */
Transforms.iau2006XysData = new Iau2006XysData();

/**
 * The source of Earth Orientation Parameters (EOP) data, used for computing the transformation
 * between the Fixed and ICRF axes.  By default, zero values are used for all EOP values,
 * yielding a reasonable but not completely accurate representation of the ICRF axes.
 * @type {EarthOrientationParameters}
 *
 * @see Transforms.computeIcrfToFixedMatrix
 * @see Transforms.computeFixedToIcrfMatrix
 *
 * @private
 */
Transforms.earthOrientationParameters = EarthOrientationParameters.NONE;

const ttMinusTai = 32.184;
const j2000ttDays = 2451545.0;

/**
 * Preloads the data necessary to transform between the ICRF and Fixed axes, in either
 * direction, over a given interval.  This function returns a promise that, when resolved,
 * indicates that the preload has completed.
 *
 * @param {TimeInterval} timeInterval The interval to preload.
 * @returns {Promise<void>} A promise that, when resolved, indicates that the preload has completed
 *          and evaluation of the transformation between the fixed and ICRF axes will
 *          no longer return undefined for a time inside the interval.
 *
 *
 * @example
 * const interval = new Cesium.TimeInterval(...);
 * Promise.resolve(Cesium.Transforms.preloadIcrfFixed(interval)).then(function() {
 *     // the data is now loaded
 * });
 *
 * @see Transforms.computeIcrfToFixedMatrix
 * @see Transforms.computeFixedToIcrfMatrix
 */
Transforms.preloadIcrfFixed = function (timeInterval) {
  const startDayTT = timeInterval.start.dayNumber;
  const startSecondTT = timeInterval.start.secondsOfDay + ttMinusTai;
  const stopDayTT = timeInterval.stop.dayNumber;
  const stopSecondTT = timeInterval.stop.secondsOfDay + ttMinusTai;

  const xysPromise = Transforms.iau2006XysData.preload(
    startDayTT,
    startSecondTT,
    stopDayTT,
    stopSecondTT
  );
  const eopPromise = Transforms.earthOrientationParameters.getPromiseToLoad();

  return Promise.all([xysPromise, eopPromise]);
};

/**
 * Computes a rotation matrix to transform a point or vector from the International Celestial
 * Reference Frame (GCRF/ICRF) inertial frame axes to the Earth-Fixed frame axes (ITRF)
 * at a given time.  This function may return undefined if the data necessary to
 * do the transformation is not yet loaded.
 *
 * @param {JulianDate} date The time at which to compute the rotation matrix.
 * @param {Matrix3} [result] The object onto which to store the result.  If this parameter is
 *                  not specified, a new instance is created and returned.
 * @returns {Matrix3} The rotation matrix, or undefined if the data necessary to do the
 *                   transformation is not yet loaded.
 *
 *
 * @example
 * scene.postUpdate.addEventListener(function(scene, time) {
 *   // View in ICRF.
 *   const icrfToFixed = Cesium.Transforms.computeIcrfToFixedMatrix(time);
 *   if (Cesium.defined(icrfToFixed)) {
 *     const offset = Cesium.Cartesian3.clone(camera.position);
 *     const transform = Cesium.Matrix4.fromRotationTranslation(icrfToFixed);
 *     camera.lookAtTransform(transform, offset);
 *   }
 * });
 *
 * @see Transforms.preloadIcrfFixed
 */
Transforms.computeIcrfToFixedMatrix = function (date, result) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(date)) {
    throw new DeveloperError("date is required.");
  }
  //>>includeEnd('debug');
  if (!defined(result)) {
    result = new Matrix3();
  }

  const fixedToIcrfMtx = Transforms.computeFixedToIcrfMatrix(date, result);
  if (!defined(fixedToIcrfMtx)) {
    return undefined;
  }

  return Matrix3.transpose(fixedToIcrfMtx, result);
};

const xysScratch = new Iau2006XysSample(0.0, 0.0, 0.0);
const eopScratch = new EarthOrientationParametersSample(
  0.0,
  0.0,
  0.0,
  0.0,
  0.0,
  0.0
);
const rotation1Scratch = new Matrix3();
const rotation2Scratch = new Matrix3();

/**
 * Computes a rotation matrix to transform a point or vector from the Earth-Fixed frame axes (ITRF)
 * to the International Celestial Reference Frame (GCRF/ICRF) inertial frame axes
 * at a given time.  This function may return undefined if the data necessary to
 * do the transformation is not yet loaded.
 *
 * @param {JulianDate} date The time at which to compute the rotation matrix.
 * @param {Matrix3} [result] The object onto which to store the result.  If this parameter is
 *                  not specified, a new instance is created and returned.
 * @returns {Matrix3} The rotation matrix, or undefined if the data necessary to do the
 *                   transformation is not yet loaded.
 *
 *
 * @example
 * // Transform a point from the ICRF axes to the Fixed axes.
 * const now = Cesium.JulianDate.now();
 * const pointInFixed = Cesium.Cartesian3.fromDegrees(0.0, 0.0);
 * const fixedToIcrf = Cesium.Transforms.computeIcrfToFixedMatrix(now);
 * let pointInInertial = new Cesium.Cartesian3();
 * if (Cesium.defined(fixedToIcrf)) {
 *     pointInInertial = Cesium.Matrix3.multiplyByVector(fixedToIcrf, pointInFixed, pointInInertial);
 * }
 *
 * @see Transforms.preloadIcrfFixed
 */
Transforms.computeFixedToIcrfMatrix = function (date, result) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(date)) {
    throw new DeveloperError("date is required.");
  }
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = new Matrix3();
  }

  // Compute pole wander
  const eop = Transforms.earthOrientationParameters.compute(date, eopScratch);
  if (!defined(eop)) {
    return undefined;
  }

  // There is no external conversion to Terrestrial Time (TT).
  // So use International Atomic Time (TAI) and convert using offsets.
  // Here we are assuming that dayTT and secondTT are positive
  const dayTT = date.dayNumber;
  // It's possible here that secondTT could roll over 86400
  // This does not seem to affect the precision (unit tests check for this)
  const secondTT = date.secondsOfDay + ttMinusTai;

  const xys = Transforms.iau2006XysData.computeXysRadians(
    dayTT,
    secondTT,
    xysScratch
  );
  if (!defined(xys)) {
    return undefined;
  }

  const x = xys.x + eop.xPoleOffset;
  const y = xys.y + eop.yPoleOffset;

  // Compute XYS rotation
  const a = 1.0 / (1.0 + Math.sqrt(1.0 - x * x - y * y));

  const rotation1 = rotation1Scratch;
  rotation1[0] = 1.0 - a * x * x;
  rotation1[3] = -a * x * y;
  rotation1[6] = x;
  rotation1[1] = -a * x * y;
  rotation1[4] = 1 - a * y * y;
  rotation1[7] = y;
  rotation1[2] = -x;
  rotation1[5] = -y;
  rotation1[8] = 1 - a * (x * x + y * y);

  const rotation2 = Matrix3.fromRotationZ(-xys.s, rotation2Scratch);
  const matrixQ = Matrix3.multiply(rotation1, rotation2, rotation1Scratch);

  // Similar to TT conversions above
  // It's possible here that secondTT could roll over 86400
  // This does not seem to affect the precision (unit tests check for this)
  const dateUt1day = date.dayNumber;
  const dateUt1sec =
    date.secondsOfDay - JulianDate.computeTaiMinusUtc(date) + eop.ut1MinusUtc;

  // Compute Earth rotation angle
  // The IERS standard for era is
  //    era = 0.7790572732640 + 1.00273781191135448 * Tu
  // where
  //    Tu = JulianDateInUt1 - 2451545.0
  // However, you get much more precision if you make the following simplification
  //    era = a + (1 + b) * (JulianDayNumber + FractionOfDay - 2451545)
  //    era = a + (JulianDayNumber - 2451545) + FractionOfDay + b (JulianDayNumber - 2451545 + FractionOfDay)
  //    era = a + FractionOfDay + b (JulianDayNumber - 2451545 + FractionOfDay)
  // since (JulianDayNumber - 2451545) represents an integer number of revolutions which will be discarded anyway.
  const daysSinceJ2000 = dateUt1day - 2451545;
  const fractionOfDay = dateUt1sec / TimeConstants.SECONDS_PER_DAY;
  let era =
    0.779057273264 +
    fractionOfDay +
    0.00273781191135448 * (daysSinceJ2000 + fractionOfDay);
  era = (era % 1.0) * CesiumMath.TWO_PI;

  const earthRotation = Matrix3.fromRotationZ(era, rotation2Scratch);

  // pseudoFixed to ICRF
  const pfToIcrf = Matrix3.multiply(matrixQ, earthRotation, rotation1Scratch);

  // Compute pole wander matrix
  const cosxp = Math.cos(eop.xPoleWander);
  const cosyp = Math.cos(eop.yPoleWander);
  const sinxp = Math.sin(eop.xPoleWander);
  const sinyp = Math.sin(eop.yPoleWander);

  let ttt = dayTT - j2000ttDays + secondTT / TimeConstants.SECONDS_PER_DAY;
  ttt /= 36525.0;

  // approximate sp value in rad
  const sp = (-47.0e-6 * ttt * CesiumMath.RADIANS_PER_DEGREE) / 3600.0;
  const cossp = Math.cos(sp);
  const sinsp = Math.sin(sp);

  const fToPfMtx = rotation2Scratch;
  fToPfMtx[0] = cosxp * cossp;
  fToPfMtx[1] = cosxp * sinsp;
  fToPfMtx[2] = sinxp;
  fToPfMtx[3] = -cosyp * sinsp + sinyp * sinxp * cossp;
  fToPfMtx[4] = cosyp * cossp + sinyp * sinxp * sinsp;
  fToPfMtx[5] = -sinyp * cosxp;
  fToPfMtx[6] = -sinyp * sinsp - cosyp * sinxp * cossp;
  fToPfMtx[7] = sinyp * cossp - cosyp * sinxp * sinsp;
  fToPfMtx[8] = cosyp * cosxp;

  return Matrix3.multiply(pfToIcrf, fToPfMtx, result);
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
Transforms.pointToWindowCoordinates = function (
  modelViewProjectionMatrix,
  viewportTransformation,
  point,
  result
) {
  result = Transforms.pointToGLWindowCoordinates(
    modelViewProjectionMatrix,
    viewportTransformation,
    point,
    result
  );
  result.y = 2.0 * viewportTransformation[5] - result.y;
  return result;
};

/**
 * @private
 */
Transforms.pointToGLWindowCoordinates = function (
  modelViewProjectionMatrix,
  viewportTransformation,
  point,
  result
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
    tmp
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
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid whose fixed frame is used in the transformation.
 * @param {Matrix3} [result] The object onto which to store the result.
 * @returns {Matrix3} The modified result parameter or a new Matrix3 instance if none was provided.
 */
Transforms.rotationMatrixFromPositionVelocity = function (
  position,
  velocity,
  ellipsoid,
  result
) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(position)) {
    throw new DeveloperError("position is required.");
  }

  if (!defined(velocity)) {
    throw new DeveloperError("velocity is required.");
  }
  //>>includeEnd('debug');

  const normal = defaultValue(ellipsoid, Ellipsoid.WGS84).geodeticSurfaceNormal(
    position,
    normalScratch
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

const swizzleMatrix = new Matrix4(
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

const scratchCartographic = new Cartographic();
const scratchCartesian3Projection = new Cartesian3();
const scratchCenter = new Cartesian3();
const scratchRotation = new Matrix3();
const scratchFromENU = new Matrix4();
const scratchToENU = new Matrix4();

/**
 * @private
 */
Transforms.basisTo2D = function (projection, matrix, result) {
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

  // Get the 2D Center
  const cartographic = ellipsoid.cartesianToCartographic(
    rtcCenter,
    scratchCartographic
  );
  const projectedPosition = projection.project(
    cartographic,
    scratchCartesian3Projection
  );
  Cartesian3.fromElements(
    projectedPosition.z,
    projectedPosition.x,
    projectedPosition.y,
    projectedPosition
  );

  // Assuming the instance are positioned in WGS84, invert the WGS84 transform to get the local transform and then convert to 2D
  const fromENU = Transforms.eastNorthUpToFixedFrame(
    rtcCenter,
    ellipsoid,
    scratchFromENU
  );
  const toENU = Matrix4.inverseTransformation(fromENU, scratchToENU);
  const rotation = Matrix4.getMatrix3(matrix, scratchRotation);
  const local = Matrix4.multiplyByMatrix3(toENU, rotation, result);
  Matrix4.multiply(swizzleMatrix, local, result); // Swap x, y, z for 2D
  Matrix4.setTranslation(result, projectedPosition, result); // Use the projected center

  return result;
};

/**
 * @private
 */
Transforms.wgs84To2DModelMatrix = function (projection, center, result) {
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

  const fromENU = Transforms.eastNorthUpToFixedFrame(
    center,
    ellipsoid,
    scratchFromENU
  );
  const toENU = Matrix4.inverseTransformation(fromENU, scratchToENU);

  const cartographic = ellipsoid.cartesianToCartographic(
    center,
    scratchCartographic
  );
  const projectedPosition = projection.project(
    cartographic,
    scratchCartesian3Projection
  );
  Cartesian3.fromElements(
    projectedPosition.z,
    projectedPosition.x,
    projectedPosition.y,
    projectedPosition
  );

  const translation = Matrix4.fromTranslation(
    projectedPosition,
    scratchFromENU
  );
  Matrix4.multiply(swizzleMatrix, toENU, result);
  Matrix4.multiply(translation, result, result);

  return result;
};
export default Transforms;
