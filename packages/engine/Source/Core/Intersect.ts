/**
 * This enumerated type is used in determining where, relative to the frustum, an
 * object is located. The object can either be fully contained within the frustum (INSIDE),
 * partially inside the frustum and partially outside (INTERSECTING), or somewhere entirely
 * outside of the frustum's 6 planes (OUTSIDE).
 *
 * @enum {number}
 */
const Intersect = {
  /**
   * Represents that an object is not contained within the frustum.
   *
   * @type {number}
   * @constant
   */
  OUTSIDE: -1,

  /**
   * Represents that an object intersects one of the frustum's planes.
   *
   * @type {number}
   * @constant
   */
  INTERSECTING: 0,

  /**
   * Represents that an object is fully within the frustum.
   *
   * @type {number}
   * @constant
   */
  INSIDE: 1,
};
export default Object.freeze(Intersect);
