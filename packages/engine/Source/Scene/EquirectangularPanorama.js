import Frozen from "../Core/Frozen.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Credit from "../Core/Credit.js";
import Matrix4 from "../Core/Matrix4.js";
import Cartesian2 from "../Core/Cartesian2.js";
import SphereGeometry from "../Core/SphereGeometry.js";
import GeometryInstance from "../Core/GeometryInstance.js";
import Material from "./Material.js";
import MaterialAppearance from "./MaterialAppearance.js";
import Primitive from "./Primitive.js";
import VertexFormat from "../Core/VertexFormat.js";
import destroyObject from "../Core/destroyObject.js";

const DEFAULT_RADIUS = 100000.0;

/**
 * @typedef {object} EquirectangularPanorama.ConstructorOptions
 *
 * Initialization options for the EquirectangularPanorama constructor
 *
 * @property {Matrix4} options.transform A 4x4 transformation matrix that defines the panorama’s position and orientation
 * (for example, derived from a position and heading-pitch-roll).
 * @property {string|HTMLImageElement|HTMLCanvasElement|ImageBitmap} options.image A URL to an image resource, or a preloaded image object.
 * @property {number} [options.radius=100000.0] The radius of the panorama in meters.
 * @property {number} [options.repeatHorizontal=1.0] The number of times to repeat the texture horizontally.
 * @property {number} [options.repeatVertical=1.0] The number of times to repeat the texture vertically.
 * @property {Credit|string} [options.credit] A credit for the panorama, which is displayed on the canvas.
 */

/**
 * Provides equirectangular imagery to be displayed on the surface of an ellipsoid.
 *
 * @alias EquirectangularPanorama
 * @constructor
 *
 * @param {EquirectangularPanorama.ConstructorOptions} options Object describing initialization options
 *
 * @example
 * const position = Cesium.Cartesian3.fromDegrees(
 *   -75.1699,  // longitude
 *   39.9522,   // latitude
 *   100.0      // height in meters
 * );
 *
 * const heading = Cesium.Math.toRadians(45.0); // rotation about up axis
 * const tilt = Cesium.Math.toRadians(-30.0);   // pitch (negative looks down)
 * const roll = Cesium.Math.toRadians(10.0);    // roll about forward axis
 *
 * const hpr = new Cesium.HeadingPitchRoll(
 *   heading,
 *   tilt,
 *   roll
 * );
 *
 * const modelMatrix = Cesium.Transforms.headingPitchRollToFixedFrame(
 *   position,
 *   hpr,
 *   Cesium.Ellipsoid.WGS84,
 *   Cesium.Transforms.eastNorthUpToFixedFrame
 * );
 *
 * scene.primitives.add(new Cesium.EquirectangularPanorama({
 *   transform: modelMatrix,
 *   image: 'path/to/image',
 * }));
 *
 */
function EquirectangularPanorama(options) {
  options = options ?? Frozen.EMPTY_OBJECT;

  //>>includeStart('debug', pragmas.debug);
  if (!defined(options.image)) {
    throw new DeveloperError("options.image is required.");
  }

  if (defined(options.transform) && !(options.transform instanceof Matrix4)) {
    throw new DeveloperError("options.transform must be a Matrix4.");
  }
  //>>includeEnd('debug');

  // Credit specified by the user.
  let credit = options.credit;
  if (typeof credit === "string") {
    credit = new Credit(credit);
  }
  this._credit = credit;

  this._radius = defined(options.radius) ? options.radius : DEFAULT_RADIUS;
  this._image = options.image;
  this._transform = defined(options.transform)
    ? options.transform
    : Matrix4.IDENTITY;
  this._repeatHorizontal = defined(options.repeatHorizontal)
    ? options.repeatHorizontal
    : 1.0;
  this._repeatVertical = defined(options.repeatVertical)
    ? options.repeatVertical
    : 1.0;

  const geometry = new SphereGeometry({
    radius: this._radius,
    vertexFormat: VertexFormat.ALL,
  });

  const geometryInstance = new GeometryInstance({
    geometry: geometry,
    modelMatrix: this._transform,
  });

  const equirectangularMaterial = new Material({
    fabric: {
      type: "Image",
      uniforms: {
        image: this._image, // 2:1 360 degrees equirectangular image path
        repeat: new Cartesian2(-this._repeatHorizontal, this._repeatVertical), // flip horizontally by default to match expected orientation of images inside a sphere, but allow user to override
      },
    },
  });

  // Create the primitive with the material
  this._primitive = new Primitive({
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
    credit: this._credit,
  });

  return this;
}

Object.defineProperties(EquirectangularPanorama.prototype, {
  /**
   * Gets the primitive object.
   * @memberof EquirectangularPanorama.prototype
   * @type {object}
   * @readonly
   */
  primitive: {
    get: function () {
      return this._primitive;
    },
  },

  /**
   * Gets the radius of the panorama.
   * @memberof EquirectangularPanorama.prototype
   * @type {number}
   * @readonly
   */
  radius: {
    get: function () {
      return this._radius;
    },
  },

  /**
   * Gets the source image of the panorama.
   * @memberof EquirectangularPanorama.prototype
   * @type {string}
   * @readonly
   */
  image: {
    get: function () {
      return this._image;
    },
  },

  /**
   * Gets the transform of the panorama.
   * @memberof EquirectangularPanorama.prototype
   * @type {Matrix4}
   * @readonly
   */
  transform: {
    get: function () {
      return this._transform;
    },
  },

  /**
   * Gets the credits of the panorama.
   * @memberof EquirectangularPanorama.prototype
   * @type {Credit}
   * @readonly
   */
  credit: {
    get: function () {
      return defined(this._credit) ? this._credit : undefined;
    },
  },
});

// Proxy update/destroy/etc to the primitive
EquirectangularPanorama.prototype.update = function (frameState) {
  return this._primitive.update(frameState);
};

EquirectangularPanorama.prototype.destroy = function () {
  this._primitive = this._primitive && this._primitive.destroy();
  return destroyObject(this);
};

EquirectangularPanorama.prototype.isDestroyed = function () {
  return this._primitive.isDestroyed();
};

// Exposed for tests
export default EquirectangularPanorama;
