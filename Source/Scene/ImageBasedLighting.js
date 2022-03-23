import Cartesian2 from "../Core/Cartesian2.js";
import Check from "../Core/Check.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";
import defined from "../Core/defined.js";
import defaultValue from "../Core/defaultValue.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import OctahedralProjectedCubeMap from "./OctahedralProjectedCubeMap.js";

const scratchIBLReferenceFrameMatrix4 = new Matrix4();
const scratchIBLReferenceFrameMatrix3 = new Matrix3();

/**
 * Properties for managing image-based lighting on tilesets and models.
 * Also manages the necessary resources and textures.
 * <p>
 * If specular environment maps are used, {@link ImageBasedLighting#destroy} must be called
 * when the image-based lighting is no longer needed to clean up GPU resources properly.
 * The application is responsible for calling this method.
 *</p>
 *
 * @constructor
 *
 * @param {Cartesian2} [options.imageBasedLightingFactor=Cartesian2(1.0, 1.0)] Scales diffuse and specular image-based lighting from the earth, sky, atmosphere and star skybox.
 * @param {Number} [options.luminanceAtZenith=0.2] The sun's luminance at the zenith in kilo candela per meter squared to use for this model's procedural environment map.
 * @param {Cartesian3[]} [options.sphericalHarmonicCoefficients] The third order spherical harmonic coefficients used for the diffuse color of image-based lighting.
 * @param {String} [options.specularEnvironmentMaps] A URL to a KTX2 file that contains a cube map of the specular lighting and the convoluted specular mipmaps.
 */
export default function ImageBasedLighting(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const imageBasedLightingFactor = defined(options.imageBasedLightingFactor)
    ? Cartesian2.clone(options.imageBasedLightingFactor)
    : new Cartesian2(1.0, 1.0);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object(
    "options.imageBasedLightingFactor",
    imageBasedLightingFactor
  );
  Check.typeOf.number.greaterThanOrEquals(
    "options.imageBasedLightingFactor.x",
    imageBasedLightingFactor.x,
    0.0
  );
  Check.typeOf.number.lessThanOrEquals(
    "options.imageBasedLightingFactor.x",
    imageBasedLightingFactor.x,
    1.0
  );
  Check.typeOf.number.greaterThanOrEquals(
    "options.imageBasedLightingFactor.y",
    imageBasedLightingFactor.y,
    0.0
  );
  Check.typeOf.number.lessThanOrEquals(
    "options.imageBasedLightingFactor.y",
    imageBasedLightingFactor.y,
    1.0
  );
  //>>includeEnd('debug');

  this._imageBasedLightingFactor = imageBasedLightingFactor;

  const luminanceAtZenith = defaultValue(options.luminanceAtZenith, 0.2);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("options.luminanceAtZenith", luminanceAtZenith);
  //>>includeEnd('debug');

  this._luminanceAtZenith = luminanceAtZenith;

  const sphericalHarmonicCoefficients = options.sphericalHarmonicCoefficients;

  //>>includeStart('debug', pragmas.debug);
  if (
    defined(sphericalHarmonicCoefficients) &&
    (!Array.isArray(sphericalHarmonicCoefficients) ||
      sphericalHarmonicCoefficients.length !== 9)
  ) {
    throw new DeveloperError(
      "options.sphericalHarmonicCoefficients must be an array of 9 Cartesian3 values."
    );
  }
  //>>includeEnd('debug');
  this._sphericalHarmonicCoefficients = sphericalHarmonicCoefficients;

  // The specular environment map texture is created in update();
  this._specularEnvironmentMaps = options.specularEnvironmentMaps;
  this._specularEnvironmentMapAtlas = undefined;
  this._specularEnvironmentMapAtlasDirty = true;

  this._useDefaultSpecularMaps = false;
  this._useDefaultSphericalHarmonics = false;
  this._shouldRegenerateShaders = false;

  // The model/tileset will set this with a setter after construction.
  this._referenceMatrix = Matrix3.clone(Matrix3.IDENTITY);
  // Derived from the reference matrix and the current view matrix
  this._iblReferenceFrameMatrix = Matrix3.clone(Matrix3.IDENTITY);

  // Store the previous frame number to prevent redundant update calls
  this._previousFrameNumber = undefined;

  // Keeps track of the last values for use during update logic
  this._previousImageBasedLightingFactor = imageBasedLightingFactor;
  this._previousLuminanceAtZenith = luminanceAtZenith;
  this._previousSphericalHarmonicCoefficients = sphericalHarmonicCoefficients;
}

Object.defineProperties(ImageBasedLighting.prototype, {
  /**
   * Cesium adds lighting from the earth, sky, atmosphere, and star skybox.
   * This cartesian is used to scale the final diffuse and specular lighting
   * contribution from those sources to the final color. A value of 0.0 will
   * disable those light sources.
   *
   * @memberof ImageBasedLighting.prototype
   *
   * @type {Cartesian2}
   * @default Cartesian2(1.0, 1.0)
   */
  imageBasedLightingFactor: {
    get: function () {
      return this._imageBasedLightingFactor;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.object("imageBasedLightingFactor", value);
      Check.typeOf.number.greaterThanOrEquals(
        "imageBasedLightingFactor.x",
        value.x,
        0.0
      );
      Check.typeOf.number.lessThanOrEquals(
        "imageBasedLightingFactor.x",
        value.x,
        1.0
      );
      Check.typeOf.number.greaterThanOrEquals(
        "imageBasedLightingFactor.y",
        value.y,
        0.0
      );
      Check.typeOf.number.lessThanOrEquals(
        "imageBasedLightingFactor.y",
        value.y,
        1.0
      );
      //>>includeEnd('debug');
      this._previousImageBasedLightingFactor = Cartesian2.clone(
        this._imageBasedLightingFactor,
        this._previousImageBasedLightingFactor
      );
      this._imageBasedLightingFactor = Cartesian2.clone(
        value,
        this._imageBasedLightingFactor
      );
    },
  },

  /**
   * The sun's luminance at the zenith in kilo candela per meter squared
   * to use for this model's procedural environment map. This is used when
   * {@link ImageBasedLighting#specularEnvironmentMaps} and {@link ImageBasedLighting#sphericalHarmonicCoefficients}
   * are not defined.
   *
   * @memberof ImageBasedLighting.prototype
   *
   * @type {Number}
   * @default 0.2
   */
  luminanceAtZenith: {
    get: function () {
      return this._luminanceAtZenith;
    },
    set: function (value) {
      this._previousLuminanceAtZenith = this._luminanceAtZenith;
      this._luminanceAtZenith = value;
    },
  },

  /**
   * The third order spherical harmonic coefficients used for the diffuse color of image-based lighting. When <code>undefined</code>, a diffuse irradiance
   * computed from the atmosphere color is used.
   * <p>
   * There are nine <code>Cartesian3</code> coefficients.
   * The order of the coefficients is: L<sub>00</sub>, L<sub>1-1</sub>, L<sub>10</sub>, L<sub>11</sub>, L<sub>2-2</sub>, L<sub>2-1</sub>, L<sub>20</sub>, L<sub>21</sub>, L<sub>22</sub>
   * </p>
   *
   * These values can be obtained by preprocessing the environment map using the <code>cmgen</code> tool of
   * {@link https://github.com/google/filament/releases|Google's Filament project}. This will also generate a KTX file that can be
   * supplied to {@link Model#specularEnvironmentMaps}.
   *
   * @memberof ImageBasedLighting.prototype
   *
   * @type {Cartesian3[]}
   * @demo {@link https://sandcastle.cesium.com/index.html?src=Image-Based Lighting.html|Sandcastle Image Based Lighting Demo}
   * @see {@link https://graphics.stanford.edu/papers/envmap/envmap.pdf|An Efficient Representation for Irradiance Environment Maps}
   */
  sphericalHarmonicCoefficients: {
    get: function () {
      return this._sphericalHarmonicCoefficients;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (defined(value) && (!Array.isArray(value) || value.length !== 9)) {
        throw new DeveloperError(
          "sphericalHarmonicCoefficients must be an array of 9 Cartesian3 values."
        );
      }
      //>>includeEnd('debug');
      this._previousSphericalHarmonicCoefficients = this._sphericalHarmonicCoefficients;
      this._sphericalHarmonicCoefficients = value;
    },
  },

  /**
   * A URL to a KTX2 file that contains a cube map of the specular lighting and the convoluted specular mipmaps.
   *
   * @memberof ImageBasedLighting.prototype
   * @demo {@link https://sandcastle.cesium.com/index.html?src=Image-Based Lighting.html|Sandcastle Image Based Lighting Demo}
   * @type {String}
   * @see ImageBasedLighting#sphericalHarmonicCoefficients
   */
  specularEnvironmentMaps: {
    get: function () {
      return this._specularEnvironmentMaps;
    },
    set: function (value) {
      this._specularEnvironmentMapAtlasDirty =
        this._specularEnvironmentMapAtlasDirty ||
        value !== this._specularEnvironmentMaps;
      this._specularEnvironmentMaps = value;
    },
  },

  /**
   * The reference frame to use for transforming the image-based lighting. This
   * is either the model's modelMatrix, or another reference matrix (e.g. the
   * tileset modelMatrix).
   *
   * @memberof ImageBasedLighting.prototype
   * @type {Matrix4}
   *
   * @private
   */
  referenceMatrix: {
    get: function () {
      return this._referenceMatrix;
    },
    set: function (value) {
      this._referenceMatrix = value;
    },
  },

  /**
   * The reference frame for image-based lighting, derived from the reference matrix and the current view matrix.
   *
   * @memberof ImageBasedLighting.prototype
   * @type {Matrix4}
   *
   * @private
   */
  iblReferenceFrameMatrix: {
    get: function () {
      return this._iblReferenceFrameMatrix;
    },
  },

  /**
   * Whether or not image-based lighting is enabled.
   *
   * @memberof ImageBasedLighting.prototype
   * @type {Boolean}
   */
  enabled: {
    get: function () {
      return (
        this._imageBasedLightingFactor.x > 0.0 ||
        this._imageBasedLightingFactor.y > 0.0
      );
    },
  },

  /**
   * Whether or not the models that use this lighting should regenerate their shaders,
   * based on the properties and resources have changed.
   *
   * @memberof ImageBasedLighting.prototype
   * @type {Boolean}
   *
   * @private
   */
  shouldRegenerateShaders: {
    get: function () {
      return this._shouldRegenerateShaders;
    },
  },

  /**
   * Whether or not to use the default spherical harmonic coefficients.
   *
   * @memberof ImageBasedLighting.prototype
   * @type {Boolean}
   *
   * @private
   */
  useDefaultSphericalHarmonics: {
    get: function () {
      return this._useDefaultSphericalHarmonics;
    },
  },

  /**
   * Whether or not the image-based lighting settings use spherical harmonic coefficients.
   *
   * @memberof ImageBasedLighting.prototype
   * @type {Boolean}
   *
   * @private
   */
  useSphericalHarmonicCoefficients: {
    get: function () {
      return (
        defined(this._sphericalHarmonicCoefficients) ||
        this._useDefaultSphericalHarmonics
      );
    },
  },

  /**
   * The texture atlas for the specular environment maps.
   *
   * @memberof ImageBasedLighting.prototype
   * @type {OctahedralProjectedCubeMap}
   *
   * @private
   */
  specularEnvironmentMapAtlas: {
    get: function () {
      return this._specularEnvironmentMapAtlas;
    },
  },

  /**
   * Whether or not to use the default specular environment maps.
   *
   * @memberof ImageBasedLighting.prototype
   * @type {Boolean}
   *
   * @private
   */
  useDefaultSpecularMaps: {
    get: function () {
      return this._useDefaultSpecularMaps;
    },
  },

  /**
   * Whether or not the image-based lighting settings use specular environment maps.
   *
   * @memberof ImageBasedLighting.prototype
   * @type {Boolean}
   *
   * @private
   */
  useSpecularEnvironmentMaps: {
    get: function () {
      return (
        (defined(this._specularEnvironmentMapAtlas) &&
          this._specularEnvironmentMapAtlas.ready) ||
        this._useDefaultSpecularMaps
      );
    },
  },
});

function createSpecularEnvironmentMapAtlas(imageBasedLighting, context) {
  if (!OctahedralProjectedCubeMap.isSupported(context)) {
    return;
  }

  imageBasedLighting._specularEnvironmentMapAtlas =
    imageBasedLighting._specularEnvironmentMapAtlas &&
    imageBasedLighting._specularEnvironmentMapAtlas.destroy();

  if (defined(imageBasedLighting._specularEnvironmentMaps)) {
    const atlas = new OctahedralProjectedCubeMap(
      imageBasedLighting._specularEnvironmentMaps
    );
    imageBasedLighting._specularEnvironmentMapAtlas = atlas;

    atlas.readyPromise
      .then(function () {
        imageBasedLighting._shouldRegenerateShaders = true;
      })
      .catch(function (error) {
        console.error(`Error loading specularEnvironmentMaps: ${error}`);
      });
  }

  // Regenerate shaders so they do not use an environment map.
  // Will be set to true again if there was a new environment map and it is ready.
  imageBasedLighting._shouldRegenerateShaders = true;
}

ImageBasedLighting.prototype.update = function (frameState) {
  if (frameState.frameNumber === this._previousFrameNumber) {
    return;
  }

  this._previousFrameNumber = frameState.frameNumber;
  const context = frameState.context;

  frameState.brdfLutGenerator.update(frameState);
  this._shouldRegenerateShaders = false;

  const iblFactor = this._imageBasedLightingFactor;
  const previousIBLFactor = this._previousImageBasedLightingFactor;
  if (!Cartesian2.equals(iblFactor, previousIBLFactor)) {
    this._shouldRegenerateShaders =
      (iblFactor.x > 0.0 && previousIBLFactor.x === 0.0) ||
      (iblFactor.x === 0.0 && previousIBLFactor.x > 0.0);
    this._shouldRegenerateShaders =
      this._shouldRegenerateShaders ||
      (iblFactor.y > 0.0 && previousIBLFactor.y === 0.0) ||
      (iblFactor.y === 0.0 && previousIBLFactor.y > 0.0);

    this._previousImageBasedLightingFactor = Cartesian2.clone(
      this._imageBasedLightingFactor,
      this._previousImageBasedLightingFactor
    );
  }

  if (this._luminanceAtZenith !== this._previousLuminanceAtZenith) {
    this._shouldRegenerateShaders =
      this._shouldRegenerateShaders ||
      defined(this._luminanceAtZenith) !==
        defined(this._previousLuminanceAtZenith);

    this._previousLuminanceAtZenith = this._luminanceAtZenith;
  }

  if (
    this._previousSphericalHarmonicCoefficients !==
    this._sphericalHarmonicCoefficients
  ) {
    this._shouldRegenerateShaders =
      this._shouldRegenerateShaders ||
      defined(this._previousSphericalHarmonicCoefficients) !==
        defined(this._sphericalHarmonicCoefficients);

    this._previousSphericalHarmonicCoefficients = this._sphericalHarmonicCoefficients;
  }

  if (this._specularEnvironmentMapAtlasDirty) {
    createSpecularEnvironmentMapAtlas(this, context);
    this._specularEnvironmentMapAtlasDirty = false;
  }

  if (defined(this._specularEnvironmentMapAtlas)) {
    this._specularEnvironmentMapAtlas.update(frameState);
  }

  const recompileWithDefaultAtlas =
    !defined(this._specularEnvironmentMapAtlas) &&
    defined(frameState.specularEnvironmentMaps) &&
    !this._useDefaultSpecularMaps;
  const recompileWithoutDefaultAtlas =
    !defined(frameState.specularEnvironmentMaps) &&
    this._useDefaultSpecularMaps;

  const recompileWithDefaultSHCoeffs =
    !defined(this._sphericalHarmonicCoefficients) &&
    defined(frameState.sphericalHarmonicCoefficients) &&
    !this._useDefaultSphericalHarmonics;
  const recompileWithoutDefaultSHCoeffs =
    !defined(frameState.sphericalHarmonicCoefficients) &&
    this._useDefaultSphericalHarmonics;

  this._shouldRegenerateShaders =
    this._shouldRegenerateShaders ||
    recompileWithDefaultAtlas ||
    recompileWithoutDefaultAtlas ||
    recompileWithDefaultSHCoeffs ||
    recompileWithoutDefaultSHCoeffs;

  this._useDefaultSpecularMaps =
    !defined(this._specularEnvironmentMapAtlas) &&
    defined(frameState.specularEnvironmentMaps);
  this._useDefaultSphericalHarmonics =
    !defined(this._sphericalHarmonicCoefficients) &&
    defined(frameState.sphericalHarmonicCoefficients);

  const useSHC = this.useSphericalHarmonicCoefficients;
  const useSEM = this.useSpecularEnvironmentMaps;

  if (useSHC || useSEM) {
    let iblReferenceFrameMatrix3 = scratchIBLReferenceFrameMatrix3;
    let iblReferenceFrameMatrix4 = scratchIBLReferenceFrameMatrix4;

    iblReferenceFrameMatrix4 = Matrix4.multiply(
      context.uniformState.view3D,
      this._referenceMatrix,
      iblReferenceFrameMatrix4
    );
    iblReferenceFrameMatrix3 = Matrix4.getMatrix3(
      iblReferenceFrameMatrix4,
      iblReferenceFrameMatrix3
    );
    iblReferenceFrameMatrix3 = Matrix3.getRotation(
      iblReferenceFrameMatrix3,
      iblReferenceFrameMatrix3
    );
    this._iblReferenceFrameMatrix = Matrix3.transpose(
      iblReferenceFrameMatrix3,
      this._iblReferenceFrameMatrix
    );
  }
};

ImageBasedLighting.prototype.isDestroyed = function () {
  return false;
};

ImageBasedLighting.prototype.destroy = function () {
  this._specularEnvironmentMapAtlas =
    this._specularEnvironmentMapAtlas &&
    this._specularEnvironmentMapAtlas.destroy();
  return destroyObject(this);
};
