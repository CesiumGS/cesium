// Note, these values map directly to ion asset ids.

/**
 * The types of imagery provided by {@link createWorldImagery}.
 *
 * @enum {number}
 */
const IonWorldImageryStyle = {
  /**
   * Aerial imagery.
   *
   * @type {number}
   * @constant
   */
  AERIAL: 2,

  /**
   * Aerial imagery with a road overlay.
   *
   * @type {number}
   * @constant
   */
  AERIAL_WITH_LABELS: 3,

  /**
   * Roads without additional imagery.
   *
   * @type {number}
   * @constant
   */
  ROAD: 4,
};
export default Object.freeze(IonWorldImageryStyle);
