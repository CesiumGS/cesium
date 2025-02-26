/**
 * This enumerated type is used in determining to what extent an object, the occludee,
 * is visible during horizon culling. An occluder may fully block an occludee, in which case
 * it has no visibility, may partially block an occludee from view, or may not block it at all,
 * leading to full visibility.
 *
 * @enum {number}
 */
const Visibility = {
  /**
   * Represents that no part of an object is visible.
   *
   * @type {number}
   * @constant
   */
  NONE: -1,

  /**
   * Represents that part, but not all, of an object is visible
   *
   * @type {number}
   * @constant
   */
  PARTIAL: 0,

  /**
   * Represents that an object is visible in its entirety.
   *
   * @type {number}
   * @constant
   */
  FULL: 1,
};
export default Object.freeze(Visibility);
