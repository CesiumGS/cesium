/**
 * An IAU 2006 XYS value sampled at a particular time.
 *
 * @alias Iau2006XysSample
 * @constructor
 *
 * @param {number} x The X value.
 * @param {number} y The Y value.
 * @param {number} s The S value.
 *
 * @private
 */
function Iau2006XysSample(x, y, s) {
  /**
   * The X value.
   * @type {number}
   */
  this.x = x;

  /**
   * The Y value.
   * @type {number}
   */
  this.y = y;

  /**
   * The S value.
   * @type {number}
   */
  this.s = s;
}
export default Iau2006XysSample;
