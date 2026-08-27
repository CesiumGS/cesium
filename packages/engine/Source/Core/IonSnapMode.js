/**
 * The snap modes supported by {@link IonSnapService#snap}. These follow the
 * MicroStation snap mode semantics; see the
 * {@link https://docs.bentley.com/LiveContent/web/MicroStation%20Help-v27/en/GUID-77D54C0B-D6FF-13DA-5EC8-3196330F5244.html|MicroStation documentation}
 * for reference.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @enum {number}
 */
const IonSnapMode = {
  /**
   * Snaps to the point on the element nearest to the cursor. When the cursor
   * is farther than the snap aperture from an edge, tracks the surface under
   * the cursor instead.
   * @type {number}
   * @constant
   */
  NEAREST: 1,
  /**
   * Snaps to the nearest of the element's keypoints. Keypoints are defined by
   * the element's geometry type and the snap divisor.
   * <p>
   * On linear elements, keypoints are regularly spaced along each segment:
   * the number of keypoints on a segment is one greater than the snap
   * divisor, and a segment's midpoint is a keypoint only when the divisor is
   * even. The ion API does not currently accept a snap divisor, so the
   * server's default divisor applies.
   * </p>
   * @type {number}
   * @constant
   */
  NEAREST_KEYPOINT: 2,
  /**
   * Snaps to the center of elements that have centers (such as circles and
   * arcs). For other elements, may snap to the centroid.
   * @type {number}
   * @constant
   */
  CENTER: 8,
};

Object.freeze(IonSnapMode);

export default IonSnapMode;
