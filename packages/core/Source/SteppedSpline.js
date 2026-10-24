import Frozen from "./Frozen.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import Spline from "./Spline.js";

/**
 * A spline that is composed of piecewise constants representing a step function.
 *
 * @alias SteppedSpline
 * @constructor
 *
 * @param {object} options Object with the following properties:
 * @param {number[]} options.times An array of strictly increasing, unit-less, floating-point times at each point. The values are in no way connected to the clock time. They are the parameterization for the curve.
 * @param {number[]|Cartesian3[]|Quaternion[]} options.points The array of control points.
 *
 * @exception {DeveloperError} points.length must be greater than or equal to 2.
 * @exception {DeveloperError} times.length must be equal to points.length.
 *
 * @example
 * const times = [ 0.0, 1.5, 3.0, 4.5, 6.0 ];
 * const spline = new Cesium.SteppedSpline({
 *     times : times,
 *     points : [
 *         new Cesium.Cartesian3(1235398.0, -4810983.0, 4146266.0),
 *         new Cesium.Cartesian3(1372574.0, -5345182.0, 4606657.0),
 *         new Cesium.Cartesian3(-757983.0, -5542796.0, 4514323.0),
 *         new Cesium.Cartesian3(-2821260.0, -5248423.0, 4021290.0),
 *         new Cesium.Cartesian3(-2539788.0, -4724797.0, 3620093.0)
 *     ]
 * });
 *
 * const p0 = spline.evaluate(times[0]);
 *
 * @see ConstantSpline
 * @see CatmullRomSpline
 * @see HermiteSpline
 * @see LinearSpline
 * @see QuaternionSpline
 * @see MorphWeightSpline
 */
function SteppedSpline(options) {
  options = options ?? Frozen.EMPTY_OBJECT;

  const points = options.points;
  const times = options.times;

  //>>includeStart('debug', pragmas.debug);
  if (!defined(points) || !defined(times)) {
    throw new DeveloperError("points and times are required.");
  }
  if (points.length < 2) {
    throw new DeveloperError(
      "points.length must be greater than or equal to 2.",
    );
  }
  if (times.length !== points.length) {
    throw new DeveloperError("times.length must be equal to points.length.");
  }
  //>>includeEnd('debug');

  this._times = times;
  this._points = points;
  this._pointType = Spline.getPointType(points[0]);

  this._lastTimeIndex = 0;
}

Object.defineProperties(SteppedSpline.prototype, {
  /**
   * An array of times for the control points.
   *
   * @memberof SteppedSpline.prototype
   *
   * @type {number[]}
   * @readonly
   */
  times: {
    get: function () {
      return this._times;
    },
  },

  /**
   * An array of control points.
   *
   * @memberof SteppedSpline.prototype
   *
   * @type {number[]|Cartesian3[]|Quaternion[]}
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
 * @param {number} time The time.
 * @param {number} startIndex The index from which to start the search.
 * @returns {number} The index for the element at the start of the interval.
 *
 * @exception {DeveloperError} time must be in the range <code>[t<sub>0</sub>, t<sub>n</sub>]</code>, where <code>t<sub>0</sub></code>
 *                             is the first element in the array <code>times</code> and <code>t<sub>n</sub></code> is the last element
 *                             in the array <code>times</code>.
 */
SteppedSpline.prototype.findTimeInterval = Spline.prototype.findTimeInterval;

/**
 * Wraps the given time to the period covered by the spline.
 * @function
 *
 * @param {number} time The time.
 * @return {number} The time, wrapped around to the updated animation.
 */
SteppedSpline.prototype.wrapTime = Spline.prototype.wrapTime;

/**
 * Clamps the given time to the period covered by the spline.
 * @function
 *
 * @param {number} time The time.
 * @return {number} The time, clamped to the animation period.
 */
SteppedSpline.prototype.clampTime = Spline.prototype.clampTime;

/**
 * Evaluates the curve at a given time.
 *
 * @param {number} time The time at which to evaluate the curve.
 * @param {Cartesian3|Quaternion} [result] The object onto which to store the result.
 * @returns {number|Cartesian3|Quaternion} The modified result parameter or a new instance of the point on the curve at the given time.
 *
 * @exception {DeveloperError} time must be in the range <code>[t<sub>0</sub>, t<sub>n</sub>]</code>, where <code>t<sub>0</sub></code>
 *                             is the first element in the array <code>times</code> and <code>t<sub>n</sub></code> is the last element
 *                             in the array <code>times</code>.
 */
SteppedSpline.prototype.evaluate = function (time, result) {
  const points = this.points;

  this._lastTimeIndex = this.findTimeInterval(time, this._lastTimeIndex);
  const i = this._lastTimeIndex;

  const PointType = this._pointType;
  if (PointType === Number) {
    return points[i];
  }

  if (!defined(result)) {
    result = new PointType();
  }

  return PointType.clone(points[i], result);
};

export default SteppedSpline;
