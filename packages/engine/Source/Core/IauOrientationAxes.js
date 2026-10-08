// @ts-check

import {
  Cartesian3,
  JulianDate,
  Math as CesiumMath,
  Matrix3,
  Quaternion,
  defined,
} from "@cesium/core";
import Iau2000Orientation from "./Iau2000Orientation.js";

/** @import IauOrientationParameters from "./IauOrientationParameters.js"; */

/**
 * A function that computes the {@link IauOrientationParameters} for a {@link JulianDate}.
 * @callback ComputeFunction
 * @param {JulianDate} date The date to evaluate the parameters.
 * @returns {IauOrientationParameters} The orientation parameters.
 * @private
 */

/**
 * The Axes representing the orientation of a Globe as represented by the data
 * from the IAU/IAG Working Group reports on rotational elements.
 *
 * @see Iau2000Orientation
 *
 * @private
 */
class IauOrientationAxes {
  /**
   * @param {ComputeFunction} [computeFunction] The function that computes the {@link IauOrientationParameters} given a {@link JulianDate}.
   */
  constructor(computeFunction) {
    if (!defined(computeFunction) || typeof computeFunction !== "function") {
      computeFunction = Iau2000Orientation.ComputeMoon;
    }

    this._computeFunction = computeFunction;
  }

  /**
   * Computes a rotation from ICRF to a Globe's Fixed axes.
   *
   * @param {JulianDate} date The date to evaluate the matrix.
   * @param {Matrix3} result The object onto which to store the result.
   * @returns {Matrix3} The modified result parameter or a new instance of the rotation from ICRF to Fixed.
   */
  evaluate(date, result) {
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
  }
}

const xAxisScratch = new Cartesian3();
const yAxisScratch = new Cartesian3();
const zAxisScratch = new Cartesian3();

/**
 * Computes a rotation matrix from a right ascension and declination.
 *
 * @param {number} alpha The right ascension, in radians.
 * @param {number} delta The declination, in radians.
 * @param {Matrix3} [result] The object onto which to store the result.
 * @returns {Matrix3} The modified result parameter or a new Matrix3 instance.
 * @private
 */

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

  return Matrix3.fromRowMajorArray(
    [
      xAxis.x,
      xAxis.y,
      xAxis.z,
      yAxis.x,
      yAxis.y,
      yAxis.z,
      zAxis.x,
      zAxis.y,
      zAxis.z,
    ],
    result,
  );
}

const rotMtxScratch = new Matrix3();
const quatScratch = new Quaternion();

export default IauOrientationAxes;
