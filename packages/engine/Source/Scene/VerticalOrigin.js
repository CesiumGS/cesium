/**
 * The vertical location of an origin relative to an object, e.g., a {@link Billboard}
 * or {@link Label}.  For example, setting the vertical origin to <code>TOP</code>
 * or <code>BOTTOM</code> will display a billboard above or below (in screen space)
 * the anchor position.
 * <br /><br />
 * <div align='center'>
 * <img src='Images/Billboard.setVerticalOrigin.png' width='695' height='175' /><br />
 * </div>
 *
 * @enum {number}
 *
 * @see Billboard#verticalOrigin
 * @see Label#verticalOrigin
 */
const VerticalOrigin = {
  /**
   * The origin is at the vertical center between <code>BASELINE</code> and <code>TOP</code>.
   *
   * @type {number}
   * @constant
   */
  CENTER: 0,

  /**
   * The origin is at the bottom of the object.
   *
   * @type {number}
   * @constant
   */
  BOTTOM: 1,

  /**
   * If the object contains text, the origin is at the baseline of the text, else the origin is at the bottom of the object.
   *
   * @type {number}
   * @constant
   */
  BASELINE: 2,

  /**
   * The origin is at the top of the object.
   *
   * @type {number}
   * @constant
   */
  TOP: -1,
};
export default Object.freeze(VerticalOrigin);
