/**
 * How close a snap result is to the cursor, reported by {@link IonSnapService#snap}
 * as {@link IonSnapService.Result} <code>heat</code>. Values match the iTwin.js
 * {@link https://www.itwinjs.org/reference/core-frontend/locatingelements/snapheat/|SnapHeat} enum.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @enum {number}
 */
const IonSnapHeat = {
  /**
   * The snap is not close to the cursor.
   * @type {number}
   * @constant
   */
  NONE: 0,
  /**
   * The snap is of interest, but outside the snap aperture.
   * @type {number}
   * @constant
   */
  NOT_IN_RANGE: 1,
  /**
   * The snap point is within the snap aperture of the close point in view space.
   * @type {number}
   * @constant
   */
  IN_RANGE: 2,
};

Object.freeze(IonSnapHeat);

export default IonSnapHeat;
