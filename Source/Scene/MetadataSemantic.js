/**
 * An enum of built-in semantics.
 *
 * @enum MetadataSemantic
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
var MetadataSemantic = {
  /**
   * The horizon occlusion point for horizon culling, stored as an <code>ARRAY</code> of 3 <code>FLOAT32</code> or <code>FLOAT64</code> components.
   *
   * @see {https://cesium.com/blog/2013/04/25/horizon-culling/|Horizon Culling}
   *
   * @type {String}
   * @constant
   * @private
   */
  HORIZON_OCCLUSION_POINT: "HORIZON_OCCLUSION_POINT",
  /**
   * A bounding sphere, stored as an <code>ARRAY</code> of 4 <code>FLOAT32</code> or a <code>FLOAT64</code> components. The components represent <code>[x, y, z, radius]</code>, i.e. the center and radius of the bounding sphere.
   *
   * @type {String}
   * @constant
   * @private
   */
  BOUNDING_SPHERE: "BOUNDING_SPHERE",
  /**
   * A minimum height relative to some ellipsoid, stored as a <code>FLOAT32</code> or a <code>FLOAT64</code>
   *
   * @type {String}
   * @constant
   * @private
   */
  MINIMUM_HEIGHT: "MINIMUM_HEIGHT",
  /**
   * A maximum height relative to some ellipsoid, stored as a <code>FLOAT32</code> or a <code>FLOAT64</code>
   *
   * @type {String}
   * @constant
   * @private
   */
  MAXIMUM_HEIGHT: "MAXIMUM_HEIGHT",
  /**
   * A name, stored as a <code>STRING</code>. This does not have to be unique
   *
   * @type {String}
   * @constant
   * @private
   */
  NAME: "NAME",
  /**
   * A unique identifier, stored as a <code>STRING</code>.
   *
   * @type {String}
   * @constant
   * @private
   */
  ID: "ID",
};

export default Object.freeze(MetadataSemantic);
