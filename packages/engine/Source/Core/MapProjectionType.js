// @ts-check

/**
 * An enumeration of map projection types used for serialization.
 *
 * @enum {number}
 * @private
 */
const MapProjectionType = Object.freeze({
  /**
   * Geographic (equirectangular / EPSG:4326) projection.
   * @type {number}
   * @constant
   */
  GEOGRAPHIC: 0,

  /**
   * Web Mercator (EPSG:3857) projection.
   * @type {number}
   * @constant
   */
  WEBMERCATOR: 1,

  /**
   * Projection defined by a proj4 source string (proj4 syntax or OGC WKT).
   * @type {number}
   * @constant
   */
  PROJ4: 2,

  /**
   * Custom projection with user-defined project/unproject functions.
   * @type {number}
   * @constant
   */
  CUSTOM: 3,

  /**
   * Projection defined by a 4x4 transformation matrix.
   * @type {number}
   * @constant
   */
  MATRIX4: 4,
});

export default MapProjectionType;
