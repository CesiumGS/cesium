/**
 * An enum of built-in semantics.
 *
 * @enum MetadataSemantic
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 * @see {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification/Metadata/Semantics|3D Metadata Semantic Reference}
 */
const MetadataSemantic = {
  /**
   * A unique identifier, stored as a <code>STRING</code>.
   *
   * @type {String}
   * @constant
   * @private
   */
  ID: "ID",
  /**
   * A name, stored as a <code>STRING</code>. This does not have to be unique.
   *
   * @type {String}
   * @constant
   * @private
   */
  NAME: "NAME",
  /**
   * A description, stored as a <code>STRING</code>.
   *
   * @type {String}
   * @constant
   * @private
   */
  DESCRIPTION: "DESCRIPTION",
  /**
   * Attribution, stored as a variable-length array of <code>STRING</code> or variable-length array of <code>ENUM</code>.
   *
   * @type {String}
   * @constant
   * @private
   */
  ATTRIBUTION: "ATTRIBUTION",
  /**
   * A bounding box for a tile, stored as an array of 12 <code>FLOAT32</code> or <code>FLOAT64</code> components. The components are the same format as for <code>boundingVolume.box</code> in 3D Tiles 1.0. This semantic is used to provide a tighter bounding volume than the one implicitly calculated in <code>3DTILES_implicit_tiling</code>
   *
   * @type {String}
   * @constant
   * @private
   */
  TILE_BOUNDING_BOX: "TILE_BOUNDING_BOX",
  /**
   * A bounding region for a tile, stored as an array of 6 <code>FLOAT64</code> components. The components are <code>[west, south, east, north, minimumHeight, maximumHeight]</code>. This semantic is used to provide a tighter bounding volume than the one implicitly calculated in <code>3DTILES_implicit_tiling</code>
   *
   * @type {String}
   * @constant
   * @private
   */
  TILE_BOUNDING_REGION: "TILE_BOUNDING_REGION",
  /**
   * A bounding sphere for a tile, stored as an array of 4 <code>FLOAT32</code> or <code>FLOAT64</code> components. The components are <code>[centerX, centerY, centerZ, radius]</code>. This semantic is used to provide a tighter bounding volume than the one implicitly calculated in <code>3DTILES_implicit_tiling</code>
   *
   * @type {String}
   * @constant
   * @private
   */
  TILE_BOUNDING_SPHERE: "TILE_BOUNDING_SPHERE",
  /**
   * The minimum height of a tile above (or below) the WGS84 ellipsoid, stored as a <code>FLOAT32</code> or a <code>FLOAT64</code>. This semantic is used to tighten bounding regions implicitly calculated in <code>3DTILES_implicit_tiling</code>.
   *
   * @type {String}
   * @constant
   * @private
   */
  TILE_MINIMUM_HEIGHT: "TILE_MINIMUM_HEIGHT",
  /**
   * The maximum height of a tile above (or below) the WGS84 ellipsoid, stored as a <code>FLOAT32</code> or a <code>FLOAT64</code>. This semantic is used to tighten bounding regions implicitly calculated in <code>3DTILES_implicit_tiling</code>.
   *
   * @type {String}
   * @constant
   * @private
   */
  TILE_MAXIMUM_HEIGHT: "TILE_MAXIMUM_HEIGHT",
  /**
   * The horizon occlusion point for a tile, stored as an <code>VEC3</code> of <code>FLOAT32</code> or <code>FLOAT64</code> components.
   *
   * @see {@link https://cesium.com/blog/2013/04/25/horizon-culling/|Horizon Culling}
   *
   * @type {String}
   * @constant
   * @private
   */
  TILE_HORIZON_OCCLUSION_POINT: "TILE_HORIZON_OCCLUSION_POINT",
  /**
   * The geometric error for a tile, stored as a <code>FLOAT32</code> or a <code>FLOAT64</code>. This semantic is used to override the geometric error implicitly calculated in <code>3DTILES_implicit_tiling</code>.
   *
   * @type {String}
   * @constant
   * @private
   */
  TILE_GEOMETRIC_ERROR: "TILE_GEOMETRIC_ERROR",
  /**
   * A bounding box for the content of a tile, stored as an array of 12 <code>FLOAT32</code> or <code>FLOAT64</code> components. The components are the same format as for <code>boundingVolume.box</code> in 3D Tiles 1.0. This semantic is used to provide a tighter bounding volume than the one implicitly calculated in <code>3DTILES_implicit_tiling</code>
   *
   * @type {String}
   * @constant
   * @private
   */
  CONTENT_BOUNDING_BOX: "CONTENT_BOUNDING_BOX",
  /**
   * A bounding region for the content of a tile, stored as an array of 6 <code>FLOAT64</code> components. The components are <code>[west, south, east, north, minimumHeight, maximumHeight]</code>. This semantic is used to provide a tighter bounding volume than the one implicitly calculated in <code>3DTILES_implicit_tiling</code>
   *
   * @type {String}
   * @constant
   * @private
   */
  CONTENT_BOUNDING_REGION: "CONTENT_BOUNDING_REGION",
  /**
   * A bounding sphere for the content of a tile, stored as an array of 4 <code>FLOAT32</code> or <code>FLOAT64</code> components. The components are <code>[centerX, centerY, centerZ, radius]</code>. This semantic is used to provide a tighter bounding volume than the one implicitly calculated in <code>3DTILES_implicit_tiling</code>
   *
   * @type {String}
   * @constant
   * @private
   */
  CONTENT_BOUNDING_SPHERE: "CONTENT_BOUNDING_SPHERE",
  /**
   * The minimum height of the content of a tile above (or below) the WGS84 ellipsoid, stored as a <code>FLOAT32</code> or a <code>FLOAT64</code>
   *
   * @type {String}
   * @constant
   * @private
   */
  CONTENT_MINIMUM_HEIGHT: "CONTENT_MINIMUM_HEIGHT",
  /**
   * The maximum height of the content of a tile above (or below) the WGS84 ellipsoid, stored as a <code>FLOAT32</code> or a <code>FLOAT64</code>
   *
   * @type {String}
   * @constant
   * @private
   */
  CONTENT_MAXIMUM_HEIGHT: "CONTENT_MAXIMUM_HEIGHT",
  /**
   * The horizon occlusion point for the content of a tile, stored as an <code>VEC3</code> of <code>FLOAT32</code> or <code>FLOAT64</code> components.
   *
   * @see {@link https://cesium.com/blog/2013/04/25/horizon-culling/|Horizon Culling}
   *
   * @type {String}
   * @constant
   * @private
   */
  CONTENT_HORIZON_OCCLUSION_POINT: "CONTENT_HORIZON_OCCLUSION_POINT",
};

export default Object.freeze(MetadataSemantic);
