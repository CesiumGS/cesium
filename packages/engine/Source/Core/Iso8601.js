import JulianDate from "./JulianDate.js";
import TimeInterval from "./TimeInterval.js";

const MINIMUM_VALUE = Object.freeze(
  JulianDate.fromIso8601("0000-01-01T00:00:00Z"),
);
const MAXIMUM_VALUE = Object.freeze(
  JulianDate.fromIso8601("9999-12-31T24:00:00Z"),
);
const MAXIMUM_INTERVAL = Object.freeze(
  new TimeInterval({
    start: MINIMUM_VALUE,
    stop: MAXIMUM_VALUE,
  }),
);

/**
 * Constants related to ISO8601 support.
 *
 * @namespace
 *
 * @see {@link http://en.wikipedia.org/wiki/ISO_8601|ISO 8601 on Wikipedia}
 * @see JulianDate
 * @see TimeInterval
 */
const Iso8601 = {
  /**
   * A {@link JulianDate} representing the earliest time representable by an ISO8601 date.
   * This is equivalent to the date string '0000-01-01T00:00:00Z'
   *
   * @type {JulianDate}
   * @constant
   */
  MINIMUM_VALUE: MINIMUM_VALUE,

  /**
   * A {@link JulianDate} representing the latest time representable by an ISO8601 date.
   * This is equivalent to the date string '9999-12-31T24:00:00Z'
   *
   * @type {JulianDate}
   * @constant
   */
  MAXIMUM_VALUE: MAXIMUM_VALUE,

  /**
   * A {@link TimeInterval} representing the largest interval representable by an ISO8601 interval.
   * This is equivalent to the interval string '0000-01-01T00:00:00Z/9999-12-31T24:00:00Z'
   *
   * @type {TimeInterval}
   * @constant
   */
  MAXIMUM_INTERVAL: MAXIMUM_INTERVAL,
};
export default Iso8601;
