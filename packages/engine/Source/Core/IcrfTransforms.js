// ICRF (inertial frame) transforms that require network-loaded EOP and XYS data.
// Uses Transforms.computeTemeToPseudoFixedMatrix as a fallback but owns all ICRF state.
import Transforms from "./Transforms.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import EarthOrientationParameters from "./EarthOrientationParameters.js";
import EarthOrientationParametersSample from "./EarthOrientationParametersSample.js";
import Iau2006XysData from "./Iau2006XysData.js";
import Iau2006XysSample from "./Iau2006XysSample.js";
import JulianDate from "./JulianDate.js";
import CesiumMath from "./Math.js";
import Matrix3 from "./Matrix3.js";
import TimeConstants from "./TimeConstants.js";

/**
 * Functions for transforming between the International Celestial Reference Frame (ICRF)
 * and Earth-Fixed frames. Requires asynchronously loaded EOP and XYS data.
 *
 * @namespace IcrfTransforms
 */
const IcrfTransforms = {};

/**
 * The source of IAU 2006 XYS data, used for computing the transformation between the
 * Fixed and ICRF axes.
 * @type {Iau2006XysData}
 *
 * @memberof IcrfTransforms
 */
IcrfTransforms.iau2006XysData = new Iau2006XysData();

/**
 * The source of Earth Orientation Parameters (EOP) data, used for computing the transformation
 * between the Fixed and ICRF axes.  By default, zero values are used for all EOP values,
 * yielding a reasonable but not completely accurate representation of the ICRF axes.
 * @type {EarthOrientationParameters}
 *
 * @memberof IcrfTransforms
 */
IcrfTransforms.earthOrientationParameters = EarthOrientationParameters.NONE;

const ttMinusTai = 32.184;
const j2000ttDays = 2451545.0;

/**
 * Preloads the data necessary to transform between the ICRF and Fixed axes, in either
 * direction, over a given interval.  This function returns a promise that, when resolved,
 * indicates that the preload has completed.
 *
 * @param {TimeInterval} timeInterval The interval to preload.
 * @returns {Promise<void>}
 *
 * @memberof IcrfTransforms
 */
IcrfTransforms.preloadIcrfFixed = function (timeInterval) {
  const startDayTT = timeInterval.start.dayNumber;
  const startSecondTT = timeInterval.start.secondsOfDay + ttMinusTai;
  const stopDayTT = timeInterval.stop.dayNumber;
  const stopSecondTT = timeInterval.stop.secondsOfDay + ttMinusTai;

  return IcrfTransforms.iau2006XysData.preload(
    startDayTT,
    startSecondTT,
    stopDayTT,
    stopSecondTT,
  );
};

/**
 * Computes a rotation matrix to transform a point or vector from the ICRF inertial frame
 * axes to the Earth-Fixed frame axes (ITRF) at a given time. Returns undefined if the
 * required data has not yet been loaded.
 *
 * @param {JulianDate} date
 * @param {Matrix3} [result]
 * @returns {Matrix3|undefined}
 *
 * @memberof IcrfTransforms
 */
IcrfTransforms.computeIcrfToFixedMatrix = function (date, result) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(date)) {
    throw new DeveloperError("date is required.");
  }
  //>>includeEnd('debug');
  if (!defined(result)) {
    result = new Matrix3();
  }

  const fixedToIcrfMtx = IcrfTransforms.computeFixedToIcrfMatrix(date, result);
  if (!defined(fixedToIcrfMtx)) {
    return undefined;
  }

  return Matrix3.transpose(fixedToIcrfMtx, result);
};

/**
 * The default function used to compute an ICRF-to-central-body rotation matrix. Delegates
 * to {@link IcrfTransforms.computeIcrfToFixedMatrix} and falls back to
 * {@link Transforms.computeTemeToPseudoFixedMatrix} when ICRF data is unavailable.
 *
 * @param {JulianDate} date
 * @param {Matrix3} [result]
 * @returns {Matrix3|undefined}
 *
 * @memberof IcrfTransforms
 */
IcrfTransforms.computeIcrfToCentralBodyFixedMatrix = function (date, result) {
  let transformMatrix = IcrfTransforms.computeIcrfToFixedMatrix(date, result);
  if (!defined(transformMatrix)) {
    transformMatrix = Transforms.computeTemeToPseudoFixedMatrix(date, result);
  }

  return transformMatrix;
};

const xysScratch = new Iau2006XysSample(0.0, 0.0, 0.0);
const eopScratch = new EarthOrientationParametersSample(
  0.0,
  0.0,
  0.0,
  0.0,
  0.0,
  0.0,
);
const rotation1Scratch = new Matrix3();
const rotation2Scratch = new Matrix3();

/**
 * Computes a rotation matrix to transform a point or vector from the Earth-Fixed frame axes
 * (ITRF) to the ICRF inertial frame axes at a given time. Returns undefined if the required
 * data has not yet been loaded.
 *
 * @param {JulianDate} date
 * @param {Matrix3} [result]
 * @returns {Matrix3|undefined}
 *
 * @memberof IcrfTransforms
 */
IcrfTransforms.computeFixedToIcrfMatrix = function (date, result) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(date)) {
    throw new DeveloperError("date is required.");
  }
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = new Matrix3();
  }

  const eop = IcrfTransforms.earthOrientationParameters.compute(
    date,
    eopScratch,
  );
  if (!defined(eop)) {
    return undefined;
  }

  const dayTT = date.dayNumber;
  const secondTT = date.secondsOfDay + ttMinusTai;

  const xys = IcrfTransforms.iau2006XysData.computeXysRadians(
    dayTT,
    secondTT,
    xysScratch,
  );
  if (!defined(xys)) {
    return undefined;
  }

  const x = xys.x + eop.xPoleOffset;
  const y = xys.y + eop.yPoleOffset;

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

  const dateUt1day = date.dayNumber;
  const dateUt1sec =
    date.secondsOfDay - JulianDate.computeTaiMinusUtc(date) + eop.ut1MinusUtc;

  const daysSinceJ2000 = dateUt1day - 2451545;
  const fractionOfDay = dateUt1sec / TimeConstants.SECONDS_PER_DAY;
  let era =
    0.779057273264 +
    fractionOfDay +
    0.00273781191135448 * (daysSinceJ2000 + fractionOfDay);
  era = (era % 1.0) * CesiumMath.TWO_PI;

  const earthRotation = Matrix3.fromRotationZ(era, rotation2Scratch);
  const pfToIcrf = Matrix3.multiply(matrixQ, earthRotation, rotation1Scratch);

  const cosxp = Math.cos(eop.xPoleWander);
  const cosyp = Math.cos(eop.yPoleWander);
  const sinxp = Math.sin(eop.xPoleWander);
  const sinyp = Math.sin(eop.yPoleWander);

  let ttt = dayTT - j2000ttDays + secondTT / TimeConstants.SECONDS_PER_DAY;
  ttt /= 36525.0;

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

export default IcrfTransforms;
