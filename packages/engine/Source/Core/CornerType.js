/**
 * Style options for corners.
 *
 * @demo The {@link https://sandcastle.cesium.com/index.html?src=Corridor.html&label=Geometries|Corridor Demo}
 * demonstrates the three corner types, as used by {@link CorridorGraphics}.
 *
 * @enum {number}
 */
const CornerType = {
  /**
   * <img src="Images/CornerTypeRounded.png" style="vertical-align: middle;" width="186" height="189" />
   *
   * Corner has a smooth edge.
   * @type {number}
   * @constant
   */
  ROUNDED: 0,

  /**
   * <img src="Images/CornerTypeMitered.png" style="vertical-align: middle;" width="186" height="189" />
   *
   * Corner point is the intersection of adjacent edges.
   * @type {number}
   * @constant
   */
  MITERED: 1,

  /**
   * <img src="Images/CornerTypeBeveled.png" style="vertical-align: middle;" width="186" height="189" />
   *
   * Corner is clipped.
   * @type {number}
   * @constant
   */
  BEVELED: 2,
};
export default Object.freeze(CornerType);
