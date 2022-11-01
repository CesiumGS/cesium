import Color from "../Core/Color.js";
import combine from "../Core/combine.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import IonResource from "../Core/IonResource.js";
import Cesium3DTileset from "./Cesium3DTileset.js";
import Cesium3DTileStyle from "./Cesium3DTileStyle.js";

/**
 * Creates a {@link Cesium3DTileset} instance for the
 * {@link https://cesium.com/content/cesium-osm-buildings/|Cesium OSM Buildings}
 * tileset.
 *
 * @function
 *
 * @param {Object} [options] Construction options. Any options allowed by the {@link Cesium3DTileset} constructor
 *        may be specified here. In addition to those, the following properties are supported:
 * @param {Color} [options.defaultColor=Color.WHITE] The default color to use for buildings
 *        that do not have a color. This parameter is ignored if <code>options.style</code> is specified.
 * @param {Cesium3DTileStyle} [options.style] The style to use with the tileset. If not
 *        specified, a default style is used which gives each building or building part a
 *        color inferred from its OpenStreetMap <code>tags</code>. If no color can be inferred,
 *        <code>options.defaultColor</code> is used.
 * @param {Boolean} [options.enableShowOutline=true] If true, enable rendering outlines. This can be set to false to avoid the additional processing of geometry at load time.
 * @param {Boolean} [options.showOutline=true] Whether to show outlines around buildings. When true,
 *        outlines are displayed. When false, outlines are not displayed.
 * @returns {Cesium3DTileset}
 *
 * @see Ion
 *
 * @example
 * // Create Cesium OSM Buildings with default styling
 * const viewer = new Cesium.Viewer('cesiumContainer');
 * viewer.scene.primitives.add(Cesium.createOsmBuildings());
 *
 * @example
 * // Create Cesium OSM Buildings with a custom style highlighting
 * // schools and hospitals.
 * viewer.scene.primitives.add(Cesium.createOsmBuildings({
 *   style: new Cesium.Cesium3DTileStyle({
 *     color: {
 *       conditions: [
 *         ["${feature['building']} === 'hospital'", "color('#0000FF')"],
 *         ["${feature['building']} === 'school'", "color('#00FF00')"],
 *         [true, "color('#ffffff')"]
 *       ]
 *     }
 *   })
 * }));
 */
function createOsmBuildings(options) {
  options = combine(options, {
    url: IonResource.fromAssetId(96188),
  });

  const tileset = new Cesium3DTileset(options);

  let style = options.style;

  if (!defined(style)) {
    const color = defaultValue(
      options.defaultColor,
      Color.WHITE
    ).toCssColorString();
    style = new Cesium3DTileStyle({
      color: `Boolean(\${feature['cesium#color']}) ? color(\${feature['cesium#color']}) : ${color}`,
    });
  }

  tileset.style = style;

  return tileset;
}

export default createOsmBuildings;
