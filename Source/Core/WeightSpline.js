import Check from "./Check.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import Spline from "./Spline.js";

/**
 * A spline that linearly interpolates over an array of weight values used by morph targets.
 *
 * @alias WeightSpline
 * @constructor
 *
 * @param {Object} options Object with the following properties:
 * @param {Number[]} options.times An array of strictly increasing, unit-less, floating-point times at each point.
 *                The values are in no way connected to the clock time. They are the parameterization for the curve.
 * @param {Number[]} options.weights The array of floating-point control weights given. The weights are ordered such
 *                that all weights for the targets are given in chronological order and order in which they appear in
 *                the glTF from which the morph targets come. This means for 2 targets, weights = [w(0,0), w(0,1), w(1,0), w(1,1) ...]
 *                where i and j in w(i,j) are the time indices and target indices, respectively.
 *
 * @exception {DeveloperError} weights.length must be greater than or equal to 2.
 * @exception {DeveloperError} times.length must be a factor of weights.length.
 *
 *
 * @example
 * var times = [ 0.0, 1.5, 3.0, 4.5, 6.0 ];
 * var weights = [0.0, 1.0, 0.25, 0.75, 0.5, 0.5, 0.75, 0.25, 1.0, 0.0]; //Two targets
 * var spline = new Cesium.WeightSpline({
 *     times : times,
 *     weights : weights
 * });
 *
 * var p0 = spline.evaluate(times[0]);
 *
 * @see LinearSpline
 * @see HermiteSpline
 * @see CatmullRomSpline
 * @see QuaternionSpline
 */
function WeightSpline(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  var weights = options.weights;
  var times = options.times;

  //>>includeStart('debug', pragmas.debug);
  Check.defined("weights", weights);
  Check.defined("times", times);
  Check.typeOf.number.greaterThanOrEquals("weights.length", weights.length, 3);
  if (weights.length % times.length !== 0) {
    throw new DeveloperError(
      "times.length must be a factor of weights.length."
    );
  }
  //>>includeEnd('debug');

  this._times = times;
  this._weights = weights;
  this._count = weights.length / times.length;

  this._lastTimeIndex = 0;
}

Object.defineProperties(WeightSpline.prototype, {
  /**
   * An array of times for the control weights.
   *
   * @memberof WeightSpline.prototype
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
   * An array of floating-point array control weights.
   *
   * @memberof WeightSpline.prototype
   *
   * @type {Number[]}
   * @readonly
   */
  weights: {
    get: function () {
      return this._weights;
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
WeightSpline.prototype.findTimeInterval = Spline.prototype.findTimeInterval;

/**
 * Wraps the given time to the period covered by the spline.
 * @function
 *
 * @param {Number} time The time.
 * @return {Number} The time, wrapped around to the updated animation.
 */
WeightSpline.prototype.wrapTime = Spline.prototype.wrapTime;

/**
 * Clamps the given time to the period covered by the spline.
 * @function
 *
 * @param {Number} time The time.
 * @return {Number} The time, clamped to the animation period.
 */
WeightSpline.prototype.clampTime = Spline.prototype.clampTime;

/**
 * Evaluates the curve at a given time.
 *
 * @param {Number} time The time at which to evaluate the curve.
 * @param {Number[]} [result] The object onto which to store the result.
 * @returns {Number[]} The modified result parameter or a new instance of the point on the curve at the given time.
 *
 * @exception {DeveloperError} time must be in the range <code>[t<sub>0</sub>, t<sub>n</sub>]</code>, where <code>t<sub>0</sub></code>
 *                             is the first element in the array <code>times</code> and <code>t<sub>n</sub></code> is the last element
 *                             in the array <code>times</code>.
 */
WeightSpline.prototype.evaluate = function (time, result) {
  var weights = this.weights;
  var times = this.times;

  var i = (this._lastTimeIndex = this.findTimeInterval(
    time,
    this._lastTimeIndex
  ));
  var u = (time - times[i]) / (times[i + 1] - times[i]);

  if (!defined(result)) {
    result = new Array(this._count);
  }

  for (var j = 0; j < this._count; j++) {
    var index = i * this._count + j;
    result[j] = weights[index] * (1.0 - u) + weights[index + this._count] * u;
  }

  return result;
};
export default WeightSpline;
