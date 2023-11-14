/**
 * A set of Earth Orientation Parameters (EOP) sampled at a time.
 *
 * @alias EarthOrientationParametersSample
 * @constructor
 *
 * @param {number} xPoleWander The pole wander about the X axis, in radians.
 * @param {number} yPoleWander The pole wander about the Y axis, in radians.
 * @param {number} xPoleOffset The offset to the Celestial Intermediate Pole (CIP) about the X axis, in radians.
 * @param {number} yPoleOffset The offset to the Celestial Intermediate Pole (CIP) about the Y axis, in radians.
 * @param {number} ut1MinusUtc The difference in time standards, UT1 - UTC, in seconds.
 *
 * @private
 */
function EarthOrientationParametersSample(
  xPoleWander,
  yPoleWander,
  xPoleOffset,
  yPoleOffset,
  ut1MinusUtc
) {
  /**
   * The pole wander about the X axis, in radians.
   * @type {number}
   */
  this.xPoleWander = xPoleWander;

  /**
   * The pole wander about the Y axis, in radians.
   * @type {number}
   */
  this.yPoleWander = yPoleWander;

  /**
   * The offset to the Celestial Intermediate Pole (CIP) about the X axis, in radians.
   * @type {number}
   */
  this.xPoleOffset = xPoleOffset;

  /**
   * The offset to the Celestial Intermediate Pole (CIP) about the Y axis, in radians.
   * @type {number}
   */
  this.yPoleOffset = yPoleOffset;

  /**
   * The difference in time standards, UT1 - UTC, in seconds.
   * @type {number}
   */
  this.ut1MinusUtc = ut1MinusUtc;
}
export default EarthOrientationParametersSample;
