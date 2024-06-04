/**
 * The types of imagery provided by Bing Maps.
 *
 * @enum {number}
 *
 * @see BingMapsImageryProvider
 */
const BingMapsStyle = {
  /**
   * Aerial imagery.
   *
   * @type {string}
   * @constant
   */
  AERIAL: "Aerial",

  /**
   * Aerial imagery with a road overlay.
   *
   * @type {string}
   * @constant
   * @deprecated See https://github.com/CesiumGS/cesium/issues/7128.
   * Use `BingMapsStyle.AERIAL_WITH_LABELS_ON_DEMAND` instead
   */
  AERIAL_WITH_LABELS: "AerialWithLabels",

  /**
   * Aerial imagery with a road overlay.
   *
   * @type {string}
   * @constant
   */
  AERIAL_WITH_LABELS_ON_DEMAND: "AerialWithLabelsOnDemand",

  /**
   * Roads without additional imagery.
   *
   * @type {string}
   * @constant
   * @deprecated See https://github.com/CesiumGS/cesium/issues/7128.
   * Use `BingMapsStyle.ROAD_ON_DEMAND` instead
   */
  ROAD: "Road",

  /**
   * Roads without additional imagery.
   *
   * @type {string}
   * @constant
   */
  ROAD_ON_DEMAND: "RoadOnDemand",

  /**
   * A dark version of the road maps.
   *
   * @type {string}
   * @constant
   */
  CANVAS_DARK: "CanvasDark",

  /**
   * A lighter version of the road maps.
   *
   * @type {string}
   * @constant
   */
  CANVAS_LIGHT: "CanvasLight",

  /**
   * A grayscale version of the road maps.
   *
   * @type {string}
   * @constant
   */
  CANVAS_GRAY: "CanvasGray",

  /**
   * Ordnance Survey imagery. This imagery is visible only for the London, UK area.
   *
   * @type {string}
   * @constant
   */
  ORDNANCE_SURVEY: "OrdnanceSurvey",

  /**
   * Collins Bart imagery.
   *
   * @type {string}
   * @constant
   */
  COLLINS_BART: "CollinsBart",
};
export default Object.freeze(BingMapsStyle);
