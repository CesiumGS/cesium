/**
 * Constants to determine how an interpolated value is extrapolated
 * when querying outside the bounds of available data.
 *
 * @enum {number}
 *
 * @see SampledProperty
 */
const ExtrapolationType = {
  /**
   * No extrapolation occurs.
   *
   * @type {number}
   * @constant
   */
  NONE: 0,

  /**
   * The first or last value is used when outside the range of sample data.
   *
   * @type {number}
   * @constant
   */
  HOLD: 1,

  /**
   * The value is extrapolated.
   *
   * @type {number}
   * @constant
   */
  EXTRAPOLATE: 2,
};
export default Object.freeze(ExtrapolationType);
