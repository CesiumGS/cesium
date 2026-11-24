// @ts-check

/**
 * What each of a geometry attribute's values belongs to.
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

  /**
   * One value per edge between two vertices.
   *
   * @type {string}
   * @constant
   */
  EDGE: "EDGE",

  /**
   * One value per primitive.
   *
   * @type {string}
   * @constant
   */
  FACE: "FACE",
};

Object.freeze(GeometryAttributeDomain);

export default GeometryAttributeDomain;
