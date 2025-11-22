/**
 * An enum describing the type of interpolation used in a glTF animation.
 *
 * @enum {number}
 *
 * @private
 */
const InterpolationType = {
  STEP: 0,
  LINEAR: 1,
  CUBICSPLINE: 2,
};

export default Object.freeze(InterpolationType);
