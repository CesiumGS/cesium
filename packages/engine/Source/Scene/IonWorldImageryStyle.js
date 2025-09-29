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

  /**
   * Imagery from Google Maps.
   *
   * @type {number}
   * @constant
   */
  GOOGLE_MAPS_2D_SATELLITE: 1685,

  /**
   * Imagery with place labels from Google Maps.
   *
   * @type {number}
   * @constant
   */
  GOOGLE_MAPS_2D_SATELLITE_WITH_LABELS: 1686,

  /**
   * Labeled roads and other features on a base landscape.
   *
   * @type {number}
   * @constant
   */
  GOOGLE_MAPS_2D_ROADMAP: 1687,

  /**
   * Place labels to combine with other imagery such as Sentinel-2.
   *
   * @type {number}
   * @constant
   */
  GOOGLE_MAPS_2D_LABELS_ONLY: 1688,

  /**
   * Hillshade mapping, contour lines, natural features (roadmap features hidden).
   *
   * @type {number}
   * @constant
   */
  GOOGLE_MAPS_2D_CONTOUR: 1689,
};
export default Object.freeze(IonWorldImageryStyle);
