import Cartesian3 from "./Cartesian3.js";

/**
 * @private
 */
const TerrainExaggeration = {};

/**
 * Scales a height relative to an offset.
 *
 * @param {number} height The height.
 * @param {number} scale A scalar used to exaggerate the terrain. If the value is 1.0 there will be no effect.
 * @param {number} relativeHeight The height relative to which terrain is exaggerated. If the value is 0.0 terrain will be exaggerated relative to the ellipsoid surface.
 */
TerrainExaggeration.getHeight = function (height, scale, relativeHeight) {
  return (height - relativeHeight) * scale + relativeHeight;
};

const scratchCartographic = new Cartesian3();

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
  const cartographic = ellipsoid.cartesianToCartographic(
    position,
    scratchCartographic
  );
  const newHeight = TerrainExaggeration.getHeight(
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
