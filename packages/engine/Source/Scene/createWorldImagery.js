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
 * const viewer = new Cesium.Viewer('cesiumContainer', {
 *     imageryProvider : Cesium.createWorldImagery();
 * });
 *
 * @example
 * // Create Cesium World Terrain with water and normals.
 * const viewer = new Cesium.Viewer('cesiumContainer', {
 *     imageryProvider : Cesium.createWorldImagery({
 *         style: Cesium.IonWorldImageryStyle.AERIAL_WITH_LABELS
 *     })
 * });
 *
 */
function createWorldImagery(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const style = defaultValue(options.style, IonWorldImageryStyle.AERIAL);
  return new IonImageryProvider({
    assetId: style,
  });
}
export default createWorldImagery;
