// @ts-check

/**
 * How a geometry attribute should be interpreted: a value for a given vertex, or a value for a given vertex for a given primitive.
 *
 * @enum {string}
 *
 * @see GeometryAttributeDescriptor#domain
 */
const GeometryAttributeDomain = {
  /**
   * One value per vertex.
   *
   * @type {string}
   * @constant
   */
  VERTEX: "VERTEX",

  /**
   * One value per corner of each primitive. (That is, the same vertex can be multivalued, depending on the primitive it belongs to.)
   *
   * @type {string}
   * @constant
   */
  CORNER: "CORNER",
};

Object.freeze(GeometryAttributeDomain);

export default GeometryAttributeDomain;
