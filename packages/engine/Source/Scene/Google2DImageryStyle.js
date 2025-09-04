// Note, these values map directly to ion asset ids.

/**
 * The types of imagery provided by {@link createWorldImagery}.
 *
 * @enum {number}
 */
const Google2DImageryStyle = {
  /**
   * Satellite imagery.
   *
   * @type {number}
   * @constant
   */
  SATELLITE: 2,

  /**
   * Satellite imagery with a road overlay.
   *
   * @type {number}
   * @constant
   */
  SATELLITE_WITH_LABELS: 3,

  /**
   * Roads without additional imagery.
   *
   * @type {number}
   * @constant
   */
  ROADMAP: 4,

  /**
   * Satellite imagery with Labels only.
   *
   * @type {number}
   * @constant
   */
  LABELS: 5,

  /**
   * Contours only.
   *
   * @type {number}
   * @constant
   */
  CONTOURS: 6,
};
export default Object.freeze(Google2DImageryStyle);
