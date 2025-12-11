import Frozen from "../Core/Frozen.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Matrix4 from "../Core/Matrix4.js";
import Cartesian2 from "../Core/Cartesian2.js";
import SphereGeometry from "../Core/SphereGeometry.js";
import GeometryInstance from "../Core/GeometryInstance.js";
import Material from "./Material.js";
import MaterialAppearance from "./MaterialAppearance.js";
import Primitive from "./Primitive.js";
import VertexFormat from "../Core/VertexFormat.js";

/**
 * @typedef {object} EquirectangularPanorama.ConstructorOptions
 *
 * Initialization options for the EquirectangularPanorama constructor
 *
 * @property {Image} image 2:1 equirectangular image path
 * @property {Matrix4} [transform=Matrix4.IDENTITY]  The 4x4 transformation matrix to place the panorama relative to the globe.
 * @property {number} [radius=100000.0] The radius of the panorama in meters.
 * @property {Credit|string} [credit] A credit for the data source, which is displayed on the canvas.
 */

/**
 * Provides tiled imagery hosted by Mapbox.
 *
 * @alias EquirectangularPanorama
 * @constructor
 *
 * @param {EquirectangularPanorama.ConstructorOptions} options Object describing initialization options
 *
 * @example
 * // Equirectangular panorama
 * const panorama = new Cesium.EquirectangularPanorama({
 *     image: 'path/to/image',
 * });
 *
 * @see {@link https://docs.mapbox.com/api/maps/raster-tiles/}
 * @see {@link https://docs.mapbox.com/api/accounts/tokens/}
 */
function EquirectangularPanorama(options) {
  options = options ?? Frozen.EMPTY_OBJECT;
  //>>includeStart('debug', pragmas.debug);
  if (!defined(options.image)) {
    throw new DeveloperError("options.image is required.");
  }
  //>>includeEnd('debug');

  this._radius = options.radius || 100000.0;
  this._image = options.image;
  this._transform = options.transform || Matrix4.IDENTITY;
  this._credit = options.credit || undefined;

  // Define the sphere geometry
  const sphereGeometry = new SphereGeometry({
    radius: this._radius, // Radius in meters
    vertexFormat: VertexFormat.ALL,
  });

  const geometryInstance = new GeometryInstance({
    geometry: sphereGeometry,
    modelMatrix: this._transform,
  });

  const equirectangularMaterial = new Material({
    fabric: {
      type: "Image",
      uniforms: {
        image: this._image, // 2:1 equirectangular image path
        repeat: new Cartesian2(-1.0, 1.0), // flip horizontally
      },
    },
  });

  // Create the primitive with the material
  const spherePrimitive = new Primitive({
    geometryInstances: geometryInstance,
    appearance: new MaterialAppearance({
      material: equirectangularMaterial,
      closed: true,
      faceForward: false,
      translucent: false,
      renderState: {
        cull: {
          enabled: false, // show inside of sphere
        },
      },
    }),
  });

  return spherePrimitive;
}

Object.defineProperties(EquirectangularPanorama.prototype, {
  /**
   * Determines if the panorama will be shown.
   * @memberof Panorama.prototype
   * @type {boolean}
   * @readonly
   */
  show: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * The alpha blending value of this layer, with 0.0 representing fully transparent and
   * 1.0 representing fully opaque.
   * @memberof Panorama.prototype
   * @type {number}
   * @readonly
   */
  alpha: {
    get: DeveloperError.throwInstantiationError,
  },

  /**
   * Gets the height of each tile, in pixels.
   * @memberof Panorama.prototype
   * @type {boolean}
   * @readonly
   */
  debugShowExtents: {
    get: DeveloperError.throwInstantiationError,
  },
});

/**
 * Gets the sources for the panorama
 *
 * @returns {Image[]} The source images for the panorama.
 */
EquirectangularPanorama.prototype.getSources = function () {
  return this._image;
};

/**
 * Gets the transform for the panorama
 *
 * @returns {Matrix4} The transform for the panorama.
 */
EquirectangularPanorama.prototype.getTransform = function () {
  return this._transform;
};

/**
 * Gets the credits for the panorama
 *
 * @returns {Credit[]} The credits for the panorama.
 */
EquirectangularPanorama.prototype.getCredits = function () {
  return this.credit;
};

// Exposed for tests
export default EquirectangularPanorama;
