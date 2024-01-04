import Cartesian3 from "./Cartesian3.js";
import DeveloperError from "./DeveloperError.js";
import defined from "./defined.js";

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
  //>>includeStart('debug', pragmas.debug);
  if (!Number.isFinite(scale)) {
    throw new DeveloperError("scale must be a finite number.");
  }
  if (!Number.isFinite(relativeHeight)) {
    throw new DeveloperError("relativeHeight must be a finite number.");
  }
  //>>includeEnd('debug')
  return (height - relativeHeight) * scale + relativeHeight;
};

const scratchCartographic = new Cartesian3();

/**
 * Scales a position by exaggeration.
 *
 * @param {Cartesian3} position The position.
 * @param {Ellipsoid} ellipsoid The ellipsoid.
 * @param {number} verticalExaggeration A scalar used to exaggerate the terrain. If the value is 1.0 there will be no effect.
 * @param {number} verticalExaggerationRelativeHeight The height relative to which terrain is exaggerated. If the value is 0.0 terrain will be exaggerated relative to the ellipsoid surface.
 * @param {Cartesian3} [result] The object onto which to store the result.
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
  // If the position is too near the center of the ellipsoid, exaggeration is undefined.
  if (!defined(cartographic)) {
    return Cartesian3.clone(position, result);
  }
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
