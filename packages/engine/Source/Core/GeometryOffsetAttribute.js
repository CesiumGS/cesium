// @ts-check

/**
 * Represents which vertices should have a value of `true` for the `applyOffset` attribute
 * @enum {number}
 * @private
 */
const GeometryOffsetAttribute = {
  NONE: 0,
  TOP: 1,
  ALL: 2,
};

Object.freeze(GeometryOffsetAttribute);

export default GeometryOffsetAttribute;
