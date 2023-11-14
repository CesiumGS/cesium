import Check from "./Check.js";
import DeveloperError from "./DeveloperError.js";
import Spline from "./Spline.js";

/**
 * A spline that evaluates to a constant value. Although this follows the {@link Spline} interface,
 * it does not maintain an internal array of times since its value never changes.
 *
 * @alias ConstantSpline
 * @constructor
 *
 * @param {number|Cartesian3|Quaternion} value The constant value that the spline evaluates to.
 *
 * @example
 * const position = new Cesium.Cartesian3(1.0, 2.0, 3.0);
 * const spline = new Cesium.ConstantSpline(position);
 *
 * const p0 = spline.evaluate(0.0);
 *
 * @see LinearSpline
 * @see HermiteSpline
 * @see CatmullRomSpline
 * @see QuaternionSpline
 * @see MorphWeightSpline
 */
function ConstantSpline(value) {
  this._value = value;
  this._valueType = Spline.getPointType(value);
}

Object.defineProperties(ConstantSpline.prototype, {
  /**
   * The constant value that the spline evaluates to.
   *
   * @memberof ConstantSpline.prototype
   *
   * @type {number|Cartesian3|Quaternion}
   * @readonly
   */
  value: {
    get: function () {
      return this._value;
    },
  },
});

/**
 * Finds an index <code>i</code> in <code>times</code> such that the parameter
 * <code>time</code> is in the interval <code>[times[i], times[i + 1]]</code>.
 *
 * Since a constant spline has no internal times array, this will throw an error.
 * @function
 *
 * @param {number} time The time.
 *
 * @exception {DeveloperError} findTimeInterval cannot be called on a ConstantSpline.
 */
ConstantSpline.prototype.findTimeInterval = function (time) {
  //>>includeStart('debug', pragmas.debug);
  throw new DeveloperError(
    "findTimeInterval cannot be called on a ConstantSpline."
  );
  //>>includeEnd('debug');
};

/**
 * Wraps the given time to the period covered by the spline.
 * @function
 *
 * @param {number} time The time.
 * @return {number} The time, wrapped around to the updated animation.
 */
ConstantSpline.prototype.wrapTime = function (time) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("time", time);
  //>>includeEnd('debug');

  return 0.0;
};

/**
 * Clamps the given time to the period covered by the spline.
 * @function
 *
 * @param {number} time The time.
 * @return {number} The time, clamped to the animation period.
 */
ConstantSpline.prototype.clampTime = function (time) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("time", time);
  //>>includeEnd('debug');

  return 0.0;
};

/**
 * Evaluates the curve at a given time.
 * @function
 *
 * @param {number} time The time at which to evaluate the curve.
 * @param {Cartesian3|Quaternion} [result] The object onto which to store the result.
 * @returns {number|Cartesian3|Quaternion} The modified result parameter or the value that the constant spline represents.
 */
ConstantSpline.prototype.evaluate = function (time, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("time", time);
  //>>includeEnd('debug');

  const value = this._value;
  const ValueType = this._valueType;

  if (ValueType === Number) {
    return value;
  }

  return ValueType.clone(value, result);
};

export default ConstantSpline;
