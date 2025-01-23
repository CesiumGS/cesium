import defaultValue from "./defaultValue.js";

/**
 * Represents the closed interval [start, stop].
 * @alias Interval
 * @constructor
 *
 * @param {number} [start=0.0] The beginning of the interval.
 * @param {number} [stop=0.0] The end of the interval.
 */
function Interval(start, stop) {
  /**
   * The beginning of the interval.
   * @type {number}
   * @default 0.0
   */
  this.start = defaultValue(start, 0.0);
  /**
   * The end of the interval.
   * @type {number}
   * @default 0.0
   */
  this.stop = defaultValue(stop, 0.0);
}
export default Interval;
