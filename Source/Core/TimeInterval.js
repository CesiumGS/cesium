import Check from "./Check.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import JulianDate from "./JulianDate.js";

/**
 * An interval defined by a start and a stop time; optionally including those times as part of the interval.
 * Arbitrary data can optionally be associated with each instance for used with {@link TimeIntervalCollection}.
 *
 * @alias TimeInterval
 * @constructor
 *
 * @param {Object} [options] Object with the following properties:
 * @param {JulianDate} [options.start=new JulianDate()] The start time of the interval.
 * @param {JulianDate} [options.stop=new JulianDate()] The stop time of the interval.
 * @param {Boolean} [options.isStartIncluded=true] <code>true</code> if <code>options.start</code> is included in the interval, <code>false</code> otherwise.
 * @param {Boolean} [options.isStopIncluded=true] <code>true</code> if <code>options.stop</code> is included in the interval, <code>false</code> otherwise.
 * @param {Object} [options.data] Arbitrary data associated with this interval.
 *
 * @example
 * // Create an instance that spans August 1st, 1980 and is associated
 * // with a Cartesian position.
 * const timeInterval = new Cesium.TimeInterval({
 *     start : Cesium.JulianDate.fromIso8601('1980-08-01T00:00:00Z'),
 *     stop : Cesium.JulianDate.fromIso8601('1980-08-02T00:00:00Z'),
 *     isStartIncluded : true,
 *     isStopIncluded : false,
 *     data : Cesium.Cartesian3.fromDegrees(39.921037, -75.170082)
 * });
 *
 * @example
 * // Create two instances from ISO 8601 intervals with associated numeric data
 * // then compute their intersection, summing the data they contain.
 * const left = Cesium.TimeInterval.fromIso8601({
 *     iso8601 : '2000/2010',
 *     data : 2
 * });
 *
 * const right = Cesium.TimeInterval.fromIso8601({
 *     iso8601 : '1995/2005',
 *     data : 3
 * });
 *
 * //The result of the below intersection will be an interval equivalent to
 * //const intersection = Cesium.TimeInterval.fromIso8601({
 * //  iso8601 : '2000/2005',
 * //  data : 5
 * //});
 * const intersection = new Cesium.TimeInterval();
 * Cesium.TimeInterval.intersect(left, right, intersection, function(leftData, rightData) {
 *     return leftData + rightData;
 * });
 *
 * @example
 * // Check if an interval contains a specific time.
 * const dateToCheck = Cesium.JulianDate.fromIso8601('1982-09-08T11:30:00Z');
 * const containsDate = Cesium.TimeInterval.contains(timeInterval, dateToCheck);
 */
function TimeInterval(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  /**
   * Gets or sets the start time of this interval.
   * @type {JulianDate}
   */
  this.start = defined(options.start)
    ? JulianDate.clone(options.start)
    : new JulianDate();

  /**
   * Gets or sets the stop time of this interval.
   * @type {JulianDate}
   */
  this.stop = defined(options.stop)
    ? JulianDate.clone(options.stop)
    : new JulianDate();

  /**
   * Gets or sets the data associated with this interval.
   * @type {*}
   */
  this.data = options.data;

  /**
   * Gets or sets whether or not the start time is included in this interval.
   * @type {Boolean}
   * @default true
   */
  this.isStartIncluded = defaultValue(options.isStartIncluded, true);

  /**
   * Gets or sets whether or not the stop time is included in this interval.
   * @type {Boolean}
   * @default true
   */
  this.isStopIncluded = defaultValue(options.isStopIncluded, true);
}

Object.defineProperties(TimeInterval.prototype, {
  /**
   * Gets whether or not this interval is empty.
   * @memberof TimeInterval.prototype
   * @type {Boolean}
   * @readonly
   */
  isEmpty: {
    get: function () {
      const stopComparedToStart = JulianDate.compare(this.stop, this.start);
      return (
        stopComparedToStart < 0 ||
        (stopComparedToStart === 0 &&
          (!this.isStartIncluded || !this.isStopIncluded))
      );
    },
  },
});

const scratchInterval = {
  start: undefined,
  stop: undefined,
  isStartIncluded: undefined,
  isStopIncluded: undefined,
  data: undefined,
};

/**
 * Creates a new instance from a {@link http://en.wikipedia.org/wiki/ISO_8601|ISO 8601} interval.
 *
 * @throws DeveloperError if options.iso8601 does not match proper formatting.
 *
 * @param {Object} options Object with the following properties:
 * @param {String} options.iso8601 An ISO 8601 interval.
 * @param {Boolean} [options.isStartIncluded=true] <code>true</code> if <code>options.start</code> is included in the interval, <code>false</code> otherwise.
 * @param {Boolean} [options.isStopIncluded=true] <code>true</code> if <code>options.stop</code> is included in the interval, <code>false</code> otherwise.
 * @param {Object} [options.data] Arbitrary data associated with this interval.
 * @param {TimeInterval} [result] An existing instance to use for the result.
 * @returns {TimeInterval} The modified result parameter or a new instance if none was provided.
 */
TimeInterval.fromIso8601 = function (options, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options", options);
  Check.typeOf.string("options.iso8601", options.iso8601);
  //>>includeEnd('debug');

  const dates = options.iso8601.split("/");
  if (dates.length !== 2) {
    throw new DeveloperError(
      "options.iso8601 is an invalid ISO 8601 interval."
    );
  }
  const start = JulianDate.fromIso8601(dates[0]);
  const stop = JulianDate.fromIso8601(dates[1]);
  const isStartIncluded = defaultValue(options.isStartIncluded, true);
  const isStopIncluded = defaultValue(options.isStopIncluded, true);
  const data = options.data;

  if (!defined(result)) {
    scratchInterval.start = start;
    scratchInterval.stop = stop;
    scratchInterval.isStartIncluded = isStartIncluded;
    scratchInterval.isStopIncluded = isStopIncluded;
    scratchInterval.data = data;
    return new TimeInterval(scratchInterval);
  }

  result.start = start;
  result.stop = stop;
  result.isStartIncluded = isStartIncluded;
  result.isStopIncluded = isStopIncluded;
  result.data = data;
  return result;
};

/**
 * Creates an ISO8601 representation of the provided interval.
 *
 * @param {TimeInterval} timeInterval The interval to be converted.
 * @param {Number} [precision] The number of fractional digits used to represent the seconds component.  By default, the most precise representation is used.
 * @returns {String} The ISO8601 representation of the provided interval.
 */
TimeInterval.toIso8601 = function (timeInterval, precision) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("timeInterval", timeInterval);
  //>>includeEnd('debug');

  return `${JulianDate.toIso8601(
    timeInterval.start,
    precision
  )}/${JulianDate.toIso8601(timeInterval.stop, precision)}`;
};

/**
 * Duplicates the provided instance.
 *
 * @param {TimeInterval} [timeInterval] The instance to clone.
 * @param {TimeInterval} [result] An existing instance to use for the result.
 * @returns {TimeInterval} The modified result parameter or a new instance if none was provided.
 */
TimeInterval.clone = function (timeInterval, result) {
  if (!defined(timeInterval)) {
    return undefined;
  }
  if (!defined(result)) {
    return new TimeInterval(timeInterval);
  }
  result.start = timeInterval.start;
  result.stop = timeInterval.stop;
  result.isStartIncluded = timeInterval.isStartIncluded;
  result.isStopIncluded = timeInterval.isStopIncluded;
  result.data = timeInterval.data;
  return result;
};

/**
 * Compares two instances and returns <code>true</code> if they are equal, <code>false</code> otherwise.
 *
 * @param {TimeInterval} [left] The first instance.
 * @param {TimeInterval} [right] The second instance.
 * @param {TimeInterval.DataComparer} [dataComparer] A function which compares the data of the two intervals.  If omitted, reference equality is used.
 * @returns {Boolean} <code>true</code> if the dates are equal; otherwise, <code>false</code>.
 */
TimeInterval.equals = function (left, right, dataComparer) {
  return (
    left === right ||
    (defined(left) &&
      defined(right) &&
      ((left.isEmpty && right.isEmpty) ||
        (left.isStartIncluded === right.isStartIncluded &&
          left.isStopIncluded === right.isStopIncluded &&
          JulianDate.equals(left.start, right.start) &&
          JulianDate.equals(left.stop, right.stop) &&
          (left.data === right.data ||
            (defined(dataComparer) && dataComparer(left.data, right.data))))))
  );
};

/**
 * Compares two instances and returns <code>true</code> if they are within <code>epsilon</code> seconds of
 * each other.  That is, in order for the dates to be considered equal (and for
 * this function to return <code>true</code>), the absolute value of the difference between them, in
 * seconds, must be less than <code>epsilon</code>.
 *
 * @param {TimeInterval} [left] The first instance.
 * @param {TimeInterval} [right] The second instance.
 * @param {Number} [epsilon=0] The maximum number of seconds that should separate the two instances.
 * @param {TimeInterval.DataComparer} [dataComparer] A function which compares the data of the two intervals.  If omitted, reference equality is used.
 * @returns {Boolean} <code>true</code> if the two dates are within <code>epsilon</code> seconds of each other; otherwise <code>false</code>.
 */
TimeInterval.equalsEpsilon = function (left, right, epsilon, dataComparer) {
  epsilon = defaultValue(epsilon, 0);

  return (
    left === right ||
    (defined(left) &&
      defined(right) &&
      ((left.isEmpty && right.isEmpty) ||
        (left.isStartIncluded === right.isStartIncluded &&
          left.isStopIncluded === right.isStopIncluded &&
          JulianDate.equalsEpsilon(left.start, right.start, epsilon) &&
          JulianDate.equalsEpsilon(left.stop, right.stop, epsilon) &&
          (left.data === right.data ||
            (defined(dataComparer) && dataComparer(left.data, right.data))))))
  );
};

/**
 * Computes the intersection of two intervals, optionally merging their data.
 *
 * @param {TimeInterval} left The first interval.
 * @param {TimeInterval} [right] The second interval.
 * @param {TimeInterval} [result] An existing instance to use for the result.
 * @param {TimeInterval.MergeCallback} [mergeCallback] A function which merges the data of the two intervals. If omitted, the data from the left interval will be used.
 * @returns {TimeInterval} The modified result parameter.
 */
TimeInterval.intersect = function (left, right, result, mergeCallback) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("left", left);
  //>>includeEnd('debug');

  if (!defined(right)) {
    return TimeInterval.clone(TimeInterval.EMPTY, result);
  }

  const leftStart = left.start;
  const leftStop = left.stop;

  const rightStart = right.start;
  const rightStop = right.stop;

  const intersectsStartRight =
    JulianDate.greaterThanOrEquals(rightStart, leftStart) &&
    JulianDate.greaterThanOrEquals(leftStop, rightStart);
  const intersectsStartLeft =
    !intersectsStartRight &&
    JulianDate.lessThanOrEquals(rightStart, leftStart) &&
    JulianDate.lessThanOrEquals(leftStart, rightStop);

  if (!intersectsStartRight && !intersectsStartLeft) {
    return TimeInterval.clone(TimeInterval.EMPTY, result);
  }

  const leftIsStartIncluded = left.isStartIncluded;
  const leftIsStopIncluded = left.isStopIncluded;
  const rightIsStartIncluded = right.isStartIncluded;
  const rightIsStopIncluded = right.isStopIncluded;
  const leftLessThanRight = JulianDate.lessThan(leftStop, rightStop);

  if (!defined(result)) {
    result = new TimeInterval();
  }

  result.start = intersectsStartRight ? rightStart : leftStart;
  result.isStartIncluded =
    (leftIsStartIncluded && rightIsStartIncluded) ||
    (!JulianDate.equals(rightStart, leftStart) &&
      ((intersectsStartRight && rightIsStartIncluded) ||
        (intersectsStartLeft && leftIsStartIncluded)));
  result.stop = leftLessThanRight ? leftStop : rightStop;
  result.isStopIncluded = leftLessThanRight
    ? leftIsStopIncluded
    : (leftIsStopIncluded && rightIsStopIncluded) ||
      (!JulianDate.equals(rightStop, leftStop) && rightIsStopIncluded);
  result.data = defined(mergeCallback)
    ? mergeCallback(left.data, right.data)
    : left.data;
  return result;
};

/**
 * Checks if the specified date is inside the provided interval.
 *
 * @param {TimeInterval} timeInterval The interval.
 * @param {JulianDate} julianDate The date to check.
 * @returns {Boolean} <code>true</code> if the interval contains the specified date, <code>false</code> otherwise.
 */
TimeInterval.contains = function (timeInterval, julianDate) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("timeInterval", timeInterval);
  Check.typeOf.object("julianDate", julianDate);
  //>>includeEnd('debug');

  if (timeInterval.isEmpty) {
    return false;
  }

  const startComparedToDate = JulianDate.compare(
    timeInterval.start,
    julianDate
  );
  if (startComparedToDate === 0) {
    return timeInterval.isStartIncluded;
  }

  const dateComparedToStop = JulianDate.compare(julianDate, timeInterval.stop);
  if (dateComparedToStop === 0) {
    return timeInterval.isStopIncluded;
  }

  return startComparedToDate < 0 && dateComparedToStop < 0;
};

/**
 * Duplicates this instance.
 *
 * @param {TimeInterval} [result] An existing instance to use for the result.
 * @returns {TimeInterval} The modified result parameter or a new instance if none was provided.
 */
TimeInterval.prototype.clone = function (result) {
  return TimeInterval.clone(this, result);
};

/**
 * Compares this instance against the provided instance componentwise and returns
 * <code>true</code> if they are equal, <code>false</code> otherwise.
 *
 * @param {TimeInterval} [right] The right hand side interval.
 * @param {TimeInterval.DataComparer} [dataComparer] A function which compares the data of the two intervals.  If omitted, reference equality is used.
 * @returns {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
 */
TimeInterval.prototype.equals = function (right, dataComparer) {
  return TimeInterval.equals(this, right, dataComparer);
};

/**
 * Compares this instance against the provided instance componentwise and returns
 * <code>true</code> if they are within the provided epsilon,
 * <code>false</code> otherwise.
 *
 * @param {TimeInterval} [right] The right hand side interval.
 * @param {Number} [epsilon=0] The epsilon to use for equality testing.
 * @param {TimeInterval.DataComparer} [dataComparer] A function which compares the data of the two intervals.  If omitted, reference equality is used.
 * @returns {Boolean} <code>true</code> if they are within the provided epsilon, <code>false</code> otherwise.
 */
TimeInterval.prototype.equalsEpsilon = function (right, epsilon, dataComparer) {
  return TimeInterval.equalsEpsilon(this, right, epsilon, dataComparer);
};

/**
 * Creates a string representing this TimeInterval in ISO8601 format.
 *
 * @returns {String} A string representing this TimeInterval in ISO8601 format.
 */
TimeInterval.prototype.toString = function () {
  return TimeInterval.toIso8601(this);
};

/**
 * An immutable empty interval.
 *
 * @type {TimeInterval}
 * @constant
 */
TimeInterval.EMPTY = Object.freeze(
  new TimeInterval({
    start: new JulianDate(),
    stop: new JulianDate(),
    isStartIncluded: false,
    isStopIncluded: false,
  })
);

/**
 * Function interface for merging interval data.
 * @callback TimeInterval.MergeCallback
 *
 * @param {*} leftData The first data instance.
 * @param {*} rightData The second data instance.
 * @returns {*} The result of merging the two data instances.
 */

/**
 * Function interface for comparing interval data.
 * @callback TimeInterval.DataComparer
 * @param {*} leftData The first data instance.
 * @param {*} rightData The second data instance.
 * @returns {Boolean} <code>true</code> if the provided instances are equal, <code>false</code> otherwise.
 */
export default TimeInterval;
