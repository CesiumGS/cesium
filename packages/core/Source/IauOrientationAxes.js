import Cartesian3 from "./Cartesian3.js";
import defined from "./defined.js";
import Iau2000Orientation from "./Iau2000Orientation.js";
import JulianDate from "./JulianDate.js";
import CesiumMath from "./Math.js";
import Matrix3 from "./Matrix3.js";
import Quaternion from "./Quaternion.js";

/**
 * The Axes representing the orientation of a Globe as represented by the data
 * from the IAU/IAG Working Group reports on rotational elements.
 * @alias IauOrientationAxes
 * @constructor
 *
 * @param {IauOrientationAxes.ComputeFunction} [computeFunction] The function that computes the {@link IauOrientationParameters} given a {@link JulianDate}.
 *
 * @see Iau2000Orientation
 *
 * @private
 */
function IauOrientationAxes(computeFunction) {
  if (!defined(computeFunction) || typeof computeFunction !== "function") {
    computeFunction = Iau2000Orientation.ComputeMoon;
  }

  this._computeFunction = computeFunction;
}

const xAxisScratch = new Cartesian3();
const yAxisScratch = new Cartesian3();
const zAxisScratch = new Cartesian3();

function computeRotationMatrix(alpha, delta, result) {
  const xAxis = xAxisScratch;
  xAxis.x = Math.cos(alpha + CesiumMath.PI_OVER_TWO);
  xAxis.y = Math.sin(alpha + CesiumMath.PI_OVER_TWO);
  xAxis.z = 0.0;

  const cosDec = Math.cos(delta);

  const zAxis = zAxisScratch;
  zAxis.x = cosDec * Math.cos(alpha);
  zAxis.y = cosDec * Math.sin(alpha);
  zAxis.z = Math.sin(delta);

  const yAxis = Cartesian3.cross(zAxis, xAxis, yAxisScratch);

  if (!defined(result)) {
    result = new Matrix3();
  }

  result[0] = xAxis.x;
  result[1] = yAxis.x;
  result[2] = zAxis.x;
  result[3] = xAxis.y;
  result[4] = yAxis.y;
  result[5] = zAxis.y;
  result[6] = xAxis.z;
  result[7] = yAxis.z;
  result[8] = zAxis.z;

  return result;
}

const rotMtxScratch = new Matrix3();
const quatScratch = new Quaternion();

/**
 * Computes a rotation from ICRF to a Globe's Fixed axes.
 *
 * @param {JulianDate} date The date to evaluate the matrix.
 * @param {Matrix3} result The object onto which to store the result.
 * @returns {Matrix3} The modified result parameter or a new instance of the rotation from ICRF to Fixed.
 */
IauOrientationAxes.prototype.evaluate = function (date, result) {
  if (!defined(date)) {
    date = JulianDate.now();
  }

  const alphaDeltaW = this._computeFunction(date);
  const precMtx = computeRotationMatrix(
    alphaDeltaW.rightAscension,
    alphaDeltaW.declination,
    result,
  );

  const rot = CesiumMath.zeroToTwoPi(alphaDeltaW.rotation);
  const quat = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, rot, quatScratch);
  const rotMtx = Matrix3.fromQuaternion(
    Quaternion.conjugate(quat, quat),
    rotMtxScratch,
  );

  const cbi2cbf = Matrix3.multiply(rotMtx, precMtx, precMtx);
  return cbi2cbf;
};

/**
 * A function that computes the {@link IauOrientationParameters} for a {@link JulianDate}.
 * @callback IauOrientationAxes.ComputeFunction
 * @param {JulianDate} date The date to evaluate the parameters.
 * @returns {IauOrientationParameters} The orientation parameters.
 * @private
 */
export default IauOrientationAxes;
