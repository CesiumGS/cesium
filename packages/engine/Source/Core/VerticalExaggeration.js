import Cartesian3 from "./Cartesian3.js";

/**
 * @private
 */
const VerticalExaggeration = {};

/**
 * Scales a height relative to an offset.
 *
 * @param {number} height The height.
 * @param {number} scale A scalar used to exaggerate the terrain. If the value is 1.0 there will be no effect.
 * @param {number} relativeHeight The height relative to which terrain is exaggerated. If the value is 0.0 terrain will be exaggerated relative to the ellipsoid surface.
 */
VerticalExaggeration.getHeight = function (height, scale, relativeHeight) {
  return (height - relativeHeight) * scale + relativeHeight;
};

const scratchCartographic = new Cartesian3();

/**
 * Scales a position by exaggeration.
 */
VerticalExaggeration.getPosition = function (
  position,
  ellipsoid,
  verticalExaggeration,
  verticalExaggerationRelativeHeight,
  result
) {
  const cartographic = ellipsoid.cartesianToCartographic(
    position,
    scratchCartographic
  );
  const newHeight = VerticalExaggeration.getHeight(
    cartographic.height,
    verticalExaggeration,
    verticalExaggerationRelativeHeight
  );
  return Cartesian3.fromRadians(
    cartographic.longitude,
    cartographic.latitude,
    newHeight,
    ellipsoid,
    result
  );
};

export default VerticalExaggeration;
