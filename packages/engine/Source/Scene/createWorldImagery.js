import defaultValue from "../Core/defaultValue.js";
import deprecationWarning from "../Core/deprecationWarning.js";
import IonImageryProvider from "./IonImageryProvider.js";
import IonWorldImageryStyle from "./IonWorldImageryStyle.js";

/**
 * Creates an {@link IonImageryProvider} instance for ion's default global base imagery layer, currently Bing Maps.
 *
 * @function
 *
 * @param {object} [options] Object with the following properties:
 * @param {IonWorldImageryStyle} [options.style=IonWorldImageryStyle] The style of base imagery, only AERIAL, AERIAL_WITH_LABELS, and ROAD are currently supported.
 * @returns {IonImageryProvider}
 * @deprecated
 *
 * @see Ion
 *
 * @example
 * // Create Cesium World Imagery with default settings
 * const viewer = new Cesium.Viewer('cesiumContainer', {
 *     imageryProvider : Cesium.createWorldImagery();
 * });
 *
 * @example
 * // Create Cesium World Imagery with a different style
 * const viewer = new Cesium.Viewer('cesiumContainer', {
 *     imageryProvider : Cesium.createWorldImagery({
 *         style: Cesium.IonWorldImageryStyle.AERIAL_WITH_LABELS
 *     })
 * });
 *
 */
function createWorldImagery(options) {
  deprecationWarning(
    "createWorldImagery",
    "createWorldImagery was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use createWorldImageryAsync instead."
  );

  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const style = defaultValue(options.style, IonWorldImageryStyle.AERIAL);
  const provider = new IonImageryProvider();

  // This is here for backwards compatibility
  IonImageryProvider._initialize(provider, style, options);
  return provider;
}
export default createWorldImagery;
