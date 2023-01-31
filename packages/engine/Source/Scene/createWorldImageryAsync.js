import defaultValue from "../Core/defaultValue.js";
import IonImageryProvider from "./IonImageryProvider.js";
import IonWorldImageryStyle from "./IonWorldImageryStyle.js";

/**
 * Creates an {@link IonImageryProvider} instance for ion's default global base imagery layer, currently Bing Maps.
 *
 * @function
 *
 * @param {Object} [options] Object with the following properties:
 * @param {IonWorldImageryStyle} [options.style=IonWorldImageryStyle] The style of base imagery, only AERIAL, AERIAL_WITH_LABELS, and ROAD are currently supported.
 * @returns {IonImageryProvider}
 *
 * @see Ion
 *
 * @example
 * // Create Cesium World Terrain with default settings
 * const viewer = new Cesium.Viewer("cesiumContainer", {
 *     imageryProvider: await Cesium.createWorldImageryAsync();
 * });
 *
 * @example
 * // Create Cesium World Terrain with water and normals.
 * const viewer = new Cesium.Viewer("cesiumContainer", {
 *     imageryProvider: await Cesium.createWorldImageryAsync({
 *         style: Cesium.IonWorldImageryStyle.AERIAL_WITH_LABELS
 *     })
 * });
 *
 */
function createWorldImageryAsync(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const style = defaultValue(options.style, IonWorldImageryStyle.AERIAL);
  return IonImageryProvider.fromAssetId(style);
}
export default createWorldImageryAsync;
