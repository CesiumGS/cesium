import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import Quaternion from "./Quaternion.js";
import Spline from "./Spline.js";

function createEvaluateFunction(spline) {
  const points = spline.points;
  const times = spline.times;

  // use slerp interpolation
  return function (time, result) {
    if (!defined(result)) {
      result = new Quaternion();
    }
    const i = (spline._lastTimeIndex = spline.findTimeInterval(
      time,
      spline._lastTimeIndex
    ));
    const u = (time - times[i]) / (times[i + 1] - times[i]);

    const q0 = points[i];
    const q1 = points[i + 1];

    return Quaternion.fastSlerp(q0, q1, u, result);
  };
}

/**
 * A spline that uses spherical linear (slerp) interpolation to create a quaternion curve.
 * The generated curve is in the class C<sup>1</sup>.
 *
 * @alias QuaternionSpline
 * @constructor
 *
 * @param {Object} options Object with the following properties:
 * @param {Number[]} options.times An array of strictly increasing, unit-less, floating-point times at each point.
 *                The values are in no way connected to the clock time. They are the parameterization for the curve.
 * @param {Quaternion[]} options.points The array of {@link Quaternion} control points.
 *
 * @exception {DeveloperError} points.length must be greater than or equal to 2.
 * @exception {DeveloperError} times.length must be equal to points.length.
 *
 * @see HermiteSpline
 * @see CatmullRomSpline
 * @see LinearSpline
 * @see WeightSpline
 */
function QuaternionSpline(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  const points = options.points;
  const times = options.times;

  //>>includeStart('debug', pragmas.debug);
  if (!defined(points) || !defined(times)) {
    throw new DeveloperError("points and times are required.");
  }
  if (points.length < 2) {
    throw new DeveloperError(
      "points.length must be greater than or equal to 2."
    );
  }
  if (times.length !== points.length) {
    throw new DeveloperError("times.length must be equal to points.length.");
  }
  //>>includeEnd('debug');

  this._times = times;
  this._points = points;

  this._evaluateFunction = createEvaluateFunction(this);
  this._lastTimeIndex = 0;
}

Object.defineProperties(QuaternionSpline.prototype, {
  /**
   * An array of times for the control points.
   *
   * @memberof QuaternionSpline.prototype
   *
   * @type {Number[]}
   * @readonly
   */
  times: {
    get: function () {
      return this._times;
    },
  },

  /**
   * An array of {@link Quaternion} control points.
   *
   * @memberof QuaternionSpline.prototype
   *
   * @type {Quaternion[]}
   * @readonly
   */
  points: {
    get: function () {
      return this._points;
    },
  },
});

/**
 * Finds an index <code>i</code> in <code>times</code> such that the parameter
 * <code>time</code> is in the interval <code>[times[i], times[i + 1]]</code>.
 * @function
 *
 * @param {Number} time The time.
 * @returns {Number} The index for the element at the start of the interval.
 *
 * @exception {DeveloperError} time must be in the range <code>[t<sub>0</sub>, t<sub>n</sub>]</code>, where <code>t<sub>0</sub></code>
 *                             is the first element in the array <code>times</code> and <code>t<sub>n</sub></code> is the last element
 *                             in the array <code>times</code>.
 */
QuaternionSpline.prototype.findTimeInterval = Spline.prototype.findTimeInterval;

/**
 * Wraps the given time to the period covered by the spline.
 * @function
 *
 * @param {Number} time The time.
 * @return {Number} The time, wrapped around to the updated animation.
 */
QuaternionSpline.prototype.wrapTime = Spline.prototype.wrapTime;

/**
 * Clamps the given time to the period covered by the spline.
 * @function
 *
 * @param {Number} time The time.
 * @return {Number} The time, clamped to the animation period.
 */
QuaternionSpline.prototype.clampTime = Spline.prototype.clampTime;

/**
 * Evaluates the curve at a given time.
 *
 * @param {Number} time The time at which to evaluate the curve.
 * @param {Quaternion} [result] The object onto which to store the result.
 * @returns {Quaternion} The modified result parameter or a new instance of the point on the curve at the given time.
 *
 * @exception {DeveloperError} time must be in the range <code>[t<sub>0</sub>, t<sub>n</sub>]</code>, where <code>t<sub>0</sub></code>
 *                             is the first element in the array <code>times</code> and <code>t<sub>n</sub></code> is the last element
 *                             in the array <code>times</code>.
 */
QuaternionSpline.prototype.evaluate = function (time, result) {
  return this._evaluateFunction(time, result);
};
export default QuaternionSpline;
