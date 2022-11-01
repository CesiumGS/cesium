/**
 * ArcType defines the path that should be taken connecting vertices.
 *
 * @enum {Number}
 */
const ArcType = {
  /**
   * Straight line that does not conform to the surface of the ellipsoid.
   *
   * @type {Number}
   * @constant
   */
  NONE: 0,

  /**
   * Follow geodesic path.
   *
   * @type {Number}
   * @constant
   */
  GEODESIC: 1,

  /**
   * Follow rhumb or loxodrome path.
   *
   * @type {Number}
   * @constant
   */
  RHUMB: 2,
};
export default Object.freeze(ArcType);
