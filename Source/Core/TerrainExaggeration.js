import Cartesian3 from "./Cartesian3.js";

/**
 * @private
 */
var TerrainExaggeration = {};

/**
 * Scales a height relative to an offset.
 *
 * @param {Number} height The height.
 * @param {Number} scale A scalar used to exaggerate the terrain. If the value is 1.0 there will be no effect.
 * @param {Number} relativeHeight The height relative to which terrain is exaggerated. If the value is 0.0 terrain will be exaggerated relative to the ellipsoid surface.
 */
TerrainExaggeration.getHeight = function (height, scale, relativeHeight) {
  return (height - relativeHeight) * scale + relativeHeight;
};

var scratchCartographic = new Cartesian3();

/**
 * Scales a position by exaggeration.
 */
TerrainExaggeration.getPosition = function (
  position,
  ellipsoid,
  terrainExaggeration,
  terrainExaggerationRelativeHeight,
  result
) {
  var cartographic = ellipsoid.cartesianToCartographic(
    position,
    scratchCartographic
  );
  var newHeight = TerrainExaggeration.getHeight(
    cartographic.height,
    terrainExaggeration,
    terrainExaggerationRelativeHeight
  );
  return Cartesian3.fromRadians(
    cartographic.longitude,
    cartographic.latitude,
    newHeight,
    ellipsoid,
    result
  );
};

export default TerrainExaggeration;
