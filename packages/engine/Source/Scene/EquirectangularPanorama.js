import Frozen from "../Core/Frozen.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Credit from "../Core/Credit.js";
import Matrix4 from "../Core/Matrix4.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import EllipsoidGeometry from "../Core/EllipsoidGeometry.js";
import CesiumMath from "../Core/Math.js";
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
 * @property {object} image 2:1 360 degrees equirectangular image path
 * @property {Matrix4} [transform=Matrix4.IDENTITY]  The 4x4 transformation matrix to place the panorama relative to the globe.
 * @property {number} [radius=100000.0] The radius of the panorama in meters.
 * @param {number} [options.minimumClock=0.0] The minimum angle lying in the xy-plane measured from the positive x-axis and toward the positive y-axis.
 * @param {number} [options.maximumClock=2*PI] The maximum angle lying in the xy-plane measured from the positive x-axis and toward the positive y-axis.
 * @param {number} [options.minimumCone=0.0] The minimum angle measured from the positive z-axis and toward the negative z-axis.
 * @param {number} [options.maximumCone=PI] The maximum angle measured from the positive z-axis and toward the negative z-axis.
 * @param {number} [options.stackPartitions=64] The number of times to partition the ellipsoid into stacks.
 * @param {number} [options.slicePartitions=64] The number of times to partition the ellipsoid into radial slices. * @property {Credit|string} [credit] A credit for the data source, which is displayed on the canvas.
 * @param {Credit|string} [options.credit] A credit for the panorama, which is displayed on the canvas.
 */

/**
 * Provides equirectangular imagery to be displayed on the surface of an ellipsoid.
 *
 * @alias EquirectangularPanorama
 * @constructor
 *
 * @param {EquirectangularPanorama.ConstructorOptions} options Object describing initialization options
 * @param {Matrix4} options.transform A 4x4 transformation matrix that defines the panorama’s position and orientation
 * (for example, derived from a position and heading-pitch-roll).
 * @param {string|HTMLImageElement|HTMLCanvasElement|ImageBitmap} [options.image] A URL to an image resource, or a preloaded image object.
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
  //>>includeEnd('debug');

  // Credit specified by the user.
  let credit = options.credit;
  if (typeof credit === "string") {
    credit = new Credit(credit);
  }
  this._credit = credit;

  this._radius = options.radius || 100000.0;
  this._image = options.image;
  this._transform = options.transform || Matrix4.IDENTITY;
  this._minimumClock = options.minimumClock || 0; //degrees
  this._maximumClock = options.maximumClock || 360;
  this._minimumCone = options.minimumCone || 0;
  this._maximumCone = options.maximumCone || 180;
  this._repeatHorizontal = options.repeatHorizontal || 1.0;
  this._repeatVertical = options.repeatVertical || 1.0;

  const geometry = new EllipsoidGeometry({
    radii: new Cartesian3(this._radius, this._radius, this._radius),
    minimumClock: CesiumMath.toRadians(this._minimumClock),
    maximumClock: CesiumMath.toRadians(this._maximumClock),
    minimumCone: CesiumMath.toRadians(this._minimumCone),
    maximumCone: CesiumMath.toRadians(this._maximumCone),
    stackPartitions: 32,
    slicePartitions: 32,
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
        repeat: new Cartesian2(this._repeatHorizontal, this._repeatVertical), // flip horizontally
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
   * @memberof Panorama.prototype
   * @type {object}
   * @readonly
   */
  primitive: {
    get: function () {
      return this._primitive;
    },
  },
});

/**
 * Gets the source image for the panorama
 *
 * @returns {object} The source image for the panorama.
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
  return this._credit;
};

// Proxy update/destroy/etc to the primitive
EquirectangularPanorama.prototype.update = function (frameState) {
  return this._primitive.update(frameState);
};

EquirectangularPanorama.prototype.destroy = function () {
  return this._primitive.destroy();
};

EquirectangularPanorama.prototype.isDestroyed = function () {
  return this._primitive.isDestroyed();
};

// Exposed for tests
export default EquirectangularPanorama;
