// @ts-check

/**
 * Represents the closed interval [start, stop].
 */
class Interval {
  /**
   * @param {number} [start=0.0] The beginning of the interval.
   * @param {number} [stop=0.0] The end of the interval.
   */
  constructor(start, stop) {
    /**
     * The beginning of the interval.
     * @type {number}
     * @default 0.0
     */
    this.start = start ?? 0.0;
    /**
     * The end of the interval.
     * @type {number}
     * @default 0.0
     */
    this.stop = stop ?? 0.0;
  }
}
export default Interval;
