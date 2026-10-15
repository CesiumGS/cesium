import defined from "./defined.js";

/**
 * Defines a heading angle, pitch angle, and range in a local frame.
 * Heading is the rotation from the local east direction where a positive angle is increasing southward.
 * Pitch is the rotation from the local xy-plane. Positive pitch angles are above the plane. Negative pitch
 * angles are below the plane. Range is the distance from the center of the frame.
 * @alias HeadingPitchRange
 * @constructor
 *
 * @param {number} [heading=0.0] The heading angle in radians.
 * @param {number} [pitch=0.0] The pitch angle in radians.
 * @param {number} [range=0.0] The distance from the center in meters.
 */
function HeadingPitchRange(heading, pitch, range) {
  /**
   * Heading is the rotation from the local east direction where a positive angle is increasing southward.
   * @type {number}
   * @default 0.0
   */
  this.heading = heading ?? 0.0;

  /**
   * Pitch is the rotation from the local xy-plane. Positive pitch angles
   * are above the plane. Negative pitch angles are below the plane.
   * @type {number}
   * @default 0.0
   */
  this.pitch = pitch ?? 0.0;

  /**
   * Range is the distance from the center of the local frame.
   * @type {number}
   * @default 0.0
   */
  this.range = range ?? 0.0;
}

/**
 * Duplicates a HeadingPitchRange instance.
 *
 * @param {HeadingPitchRange} hpr The HeadingPitchRange to duplicate.
 * @param {HeadingPitchRange} [result] The object onto which to store the result.
 * @returns {HeadingPitchRange} The modified result parameter or a new HeadingPitchRange instance if one was not provided. (Returns undefined if hpr is undefined)
 */
HeadingPitchRange.clone = function (hpr, result) {
  if (!defined(hpr)) {
    return undefined;
  }
  if (!defined(result)) {
    result = new HeadingPitchRange();
  }

  result.heading = hpr.heading;
  result.pitch = hpr.pitch;
  result.range = hpr.range;
  return result;
};
export default HeadingPitchRange;
