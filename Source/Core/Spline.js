import Check from "./Check.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import CesiumMath from "./Math.js";

/**
 * Creates a curve parameterized and evaluated by time. This type describes an interface
 * and is not intended to be instantiated directly.
 *
 * @alias Spline
 * @constructor
 *
 * @see CatmullRomSpline
 * @see HermiteSpline
 * @see LinearSpline
 * @see QuaternionSpline
 */
function Spline() {
  /**
   * An array of times for the control points.
   * @type {Number[]}
   * @default undefined
   */
  this.times = undefined;

  /**
   * An array of control points.
   * @type {Cartesian3[]|Quaternion[]}
   * @default undefined
   */
  this.points = undefined;

  DeveloperError.throwInstantiationError();
}

/**
 * Evaluates the curve at a given time.
 * @function
 *
 * @param {Number} time The time at which to evaluate the curve.
 * @param {Cartesian3|Quaternion|Number[]} [result] The object onto which to store the result.
 * @returns {Cartesian3|Quaternion|Number[]} The modified result parameter or a new instance of the point on the curve at the given time.
 *
 * @exception {DeveloperError} time must be in the range <code>[t<sub>0</sub>, t<sub>n</sub>]</code>, where <code>t<sub>0</sub></code>
 *                             is the first element in the array <code>times</code> and <code>t<sub>n</sub></code> is the last element
 *                             in the array <code>times</code>.
 */
Spline.prototype.evaluate = DeveloperError.throwInstantiationError;

/**
 * Finds an index <code>i</code> in <code>times</code> such that the parameter
 * <code>time</code> is in the interval <code>[times[i], times[i + 1]]</code>.
 *
 * @param {Number} time The time.
 * @param {Number} startIndex The index from which to start the search.
 * @returns {Number} The index for the element at the start of the interval.
 *
 * @exception {DeveloperError} time must be in the range <code>[t<sub>0</sub>, t<sub>n</sub>]</code>, where <code>t<sub>0</sub></code>
 *                             is the first element in the array <code>times</code> and <code>t<sub>n</sub></code> is the last element
 *                             in the array <code>times</code>.
 */
Spline.prototype.findTimeInterval = function (time, startIndex) {
  var times = this.times;
  var length = times.length;

  //>>includeStart('debug', pragmas.debug);
  if (!defined(time)) {
    throw new DeveloperError("time is required.");
  }
  if (time < times[0] || time > times[length - 1]) {
    throw new DeveloperError("time is out of range.");
  }
  //>>includeEnd('debug');

  // Take advantage of temporal coherence by checking current, next and previous intervals
  // for containment of time.
  startIndex = defaultValue(startIndex, 0);

  if (time >= times[startIndex]) {
    if (startIndex + 1 < length && time < times[startIndex + 1]) {
      return startIndex;
    } else if (startIndex + 2 < length && time < times[startIndex + 2]) {
      return startIndex + 1;
    }
  } else if (startIndex - 1 >= 0 && time >= times[startIndex - 1]) {
    return startIndex - 1;
  }

  // The above failed so do a linear search. For the use cases so far, the
  // length of the list is less than 10. In the future, if there is a bottle neck,
  // it might be here.

  var i;
  if (time > times[startIndex]) {
    for (i = startIndex; i < length - 1; ++i) {
      if (time >= times[i] && time < times[i + 1]) {
        break;
      }
    }
  } else {
    for (i = startIndex - 1; i >= 0; --i) {
      if (time >= times[i] && time < times[i + 1]) {
        break;
      }
    }
  }

  if (i === length - 1) {
    i = length - 2;
  }

  return i;
};

/**
 * Wraps the given time to the period covered by the spline.
 * @function
 *
 * @param {Number} time The time.
 * @return {Number} The time, wrapped around the animation period.
 */
Spline.prototype.wrapTime = function (time) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("time", time);
  //>>includeEnd('debug');

  var times = this.times;
  var timeEnd = times[times.length - 1];
  var timeStart = times[0];
  var timeStretch = timeEnd - timeStart;
  var divs;
  if (time < timeStart) {
    divs = Math.floor((timeStart - time) / timeStretch) + 1;
    time += divs * timeStretch;
  }
  if (time > timeEnd) {
    divs = Math.floor((time - timeEnd) / timeStretch) + 1;
    time -= divs * timeStretch;
  }
  return time;
};

/**
 * Clamps the given time to the period covered by the spline.
 * @function
 *
 * @param {Number} time The time.
 * @return {Number} The time, clamped to the animation period.
 */
Spline.prototype.clampTime = function (time) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("time", time);
  //>>includeEnd('debug');

  var times = this.times;
  return CesiumMath.clamp(time, times[0], times[times.length - 1]);
};
export default Spline;
