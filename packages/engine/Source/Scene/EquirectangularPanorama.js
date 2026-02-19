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
 * A {@link Panorama} that displays imagery in equirectangular format in a scene.
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
 * @demo {@link https://sandcastle.cesium.com/index.html?id=panorama|Cesium Sandcastle Panorama}
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
   * @type {string|HTMLImageElement|HTMLCanvasElement|ImageBitmap}
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

  /**
   * Determines if the equirectangular panorama will be shown.
   * @memberof EquirectangularPanorama.prototype
   * @type {boolean}
   */
  show: {
    get: function () {
      return defined(this._primitive) ? this._primitive.show : undefined;
    },
    set: function (value) {
      if (defined(this._primitive)) {
        this._primitive.show = value;
      }
    },
  },
});

// Proxy update/destroy/etc to the primitive

/**
 * Called when {@link Viewer} or {@link CesiumWidget} render the scene to
 * get the draw commands needed to render this primitive.
 * <p>
 * Do not call this function directly.  This is documented just to
 * list the exceptions that may be propagated when the scene is rendered:
 * </p>
 *
 */
EquirectangularPanorama.prototype.update = function (frameState) {
  if (defined(this._credit)) {
    frameState.creditDisplay.addCreditToNextFrame(this._credit);
  }

  return this._primitive.update(frameState);
};

/**
 * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
 * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
 * <br /><br />
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 *
 * @example
 * equirectangularPanorama = equirectangularPanorama && equirectangularPanorama.destroy();
 *
 * @see EquirectangularPanorama#isDestroyed
 */
EquirectangularPanorama.prototype.destroy = function () {
  this._primitive = this._primitive && this._primitive.destroy();
  return destroyObject(this);
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see EquirectangularPanorama#destroy
 */

EquirectangularPanorama.prototype.isDestroyed = function () {
  return this._primitive.isDestroyed();
};

// Exposed for tests
export default EquirectangularPanorama;
