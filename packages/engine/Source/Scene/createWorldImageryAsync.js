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
 * @returns {Promise<IonImageryProvider>}
 *
 * @see Ion
 *
 * @example
 * // Create a Cesium World Imagery base layer with default settings
 * try {
 *   const imageryProvider = await Cesium.createWorldImageryAsync();
 * } catch (error) {
 *   console.log(`There was an error creating world imagery: ${error}`);
 * }
 *
 * @example
 * // Create Cesium World Imagery with different style
 * try {
 *   const imageryProvider = await Cesium.createWorldImageryAsync({
 *         style: Cesium.IonWorldImageryStyle.AERIAL_WITH_LABELS
 *   });
 * } catch (error) {
 *   console.log(`There was an error creating world imagery: ${error}`);
 * }
 */
function createWorldImageryAsync(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const style = defaultValue(options.style, IonWorldImageryStyle.AERIAL);
  return IonImageryProvider.fromAssetId(style);
}
export default createWorldImageryAsync;
